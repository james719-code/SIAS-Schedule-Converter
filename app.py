# backend/app.py
import hashlib
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
import pdfplumber
from flask import Flask, request, jsonify, g
from flask_caching import Cache
from flask_cors import CORS

# --- Configuration ---
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
MAX_WORKERS = min(4, (os.cpu_count() or 1) + 1)  # Optimal thread count
CACHE_TIMEOUT = 300  # 5 minutes cache

# --- Flask Application Setup ---
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Configure caching (using SimpleCache for single-server, use Redis for production)
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = CACHE_TIMEOUT
cache = Cache(app)

# Enable CORS with optimized settings
CORS(app, resources={r"/*": {"origins": "*", "max_age": 3600}})

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)


def get_file_hash(file_content: bytes) -> str:
    """Generate MD5 hash for cache key"""
    return hashlib.md5(file_content).hexdigest()


def extract_tables_from_page(page):
    """Extract tables from a single PDF page (for parallel processing)"""
    rows = []
    try:
        tables = page.extract_tables()
        for table in tables:
            if table and len(table) > 0:
                if "Subject Code" in (table[0] or []):
                    rows.extend(table[1:])
                else:
                    rows.extend(table)
    except Exception:
        pass  # Skip problematic pages
    return rows


def process_rows_optimized(all_rows: list) -> tuple:
    """Optimized row processing with early exit and minimal allocations"""
    extracted_data = []
    current_subject = None
    section_name = ""
    
    for row in all_rows:
        # Fast validation
        if not isinstance(row, list) or len(row) < 7:
            continue
        
        row_0 = row[0]
        if row_0 and str(row_0).strip():
            if current_subject:
                extracted_data.append(current_subject)
            
            subject_desc = str(row[2]).strip() if row[2] else 'N/A'
            current_subject = {"subject": subject_desc, "schedules": []}
            
            if not section_name:
                row_6 = row[6]
                if row_6 and str(row_6).strip():
                    section_name = str(row_6).strip()
        
        if current_subject:
            row_4 = row[4]
            if row_4 and str(row_4).strip():
                schedule_text = str(row_4).strip()
                room_text = str(row[5]).strip() if row[5] else 'N/A'
                current_subject["schedules"].append({
                    "time": schedule_text,
                    "room": room_text
                })
    
    if current_subject:
        extracted_data.append(current_subject)
    
    return extracted_data, section_name


def parse_enrollment_pdf(pdf_path: str, use_threading: bool = True):
    """
    Parse enrollment PDF with optional multithreading.
    Uses ThreadPoolExecutor for parallel page processing when beneficial.
    """
    all_rows = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            
            # Use threading only if we have multiple pages (overhead isn't worth it for 1-2 pages)
            if use_threading and num_pages > 2:
                # Parallel extraction for multiple pages
                futures = {
                    executor.submit(extract_tables_from_page, page): i 
                    for i, page in enumerate(pdf.pages)
                }
                
                # Collect results in order
                page_results = [None] * num_pages
                for future in as_completed(futures):
                    page_idx = futures[future]
                    try:
                        page_results[page_idx] = future.result()
                    except Exception:
                        page_results[page_idx] = []
                
                # Flatten results maintaining page order
                for page_rows in page_results:
                    if page_rows:
                        all_rows.extend(page_rows)
            else:
                # Sequential processing for small PDFs
                for page in pdf.pages:
                    rows = extract_tables_from_page(page)
                    all_rows.extend(rows)
                    
    except Exception as e:
        return None, f"PDF parsing library failed: {type(e).__name__} - {e}"
    
    # Process extracted rows
    extracted_data, section_name = process_rows_optimized(all_rows)
    
    return {"subjects": extracted_data, "sectionName": section_name}, None


@app.route('/health', methods=['GET'])
@app.route('/ping', methods=['GET'])
@cache.cached(timeout=60)  # Cache health check for 60 seconds
def health_check():
    """Health check endpoint for monitoring and testing"""
    return jsonify({
        "status": "healthy",
        "message": "PDF parser API is running",
        "version": "2.0.0",
        "features": {
            "multithreading": True,
            "caching": True,
            "max_workers": MAX_WORKERS
        },
        "endpoints": {
            "POST /process-pdf": "Process PDF file",
            "GET /health": "Health check",
            "GET /ping": "Ping endpoint",
            "GET /stats": "Cache statistics"
        }
    })


@app.route('/stats', methods=['GET'])
def cache_stats():
    """Return cache statistics for monitoring"""
    return jsonify({
        "cache_type": app.config['CACHE_TYPE'],
        "cache_timeout": CACHE_TIMEOUT,
        "max_workers": MAX_WORKERS,
        "max_file_size_mb": MAX_CONTENT_LENGTH / (1024 * 1024)
    })


@app.route('/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    # 1. Check if a file was sent
    if 'pdf_file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['pdf_file']

    # 2. Check if the file has a name
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # 3. Validate file extension
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Invalid file type. Only PDF files are allowed"}), 400

    if file:
        # 4. Read file content for caching
        file_content = file.read()
        file_hash = get_file_hash(file_content)
        
        # 5. Check cache first
        cache_key = f"pdf_result_{file_hash}"
        cached_result = cache.get(cache_key)
        
        if cached_result is not None:
            # Return cached result with cache indicator
            cached_result['_cached'] = True
            return jsonify(cached_result)
        
        # 6. Save the file to a temporary location (safe and self-cleaning)
        with tempfile.NamedTemporaryFile(delete=True, suffix=".pdf") as temp_pdf:
            temp_pdf.write(file_content)
            temp_pdf.flush()

            # 7. Run optimized parsing logic with multithreading
            parsed_data, error_msg = parse_enrollment_pdf(temp_pdf.name, use_threading=True)

            if error_msg:
                return jsonify({"error": error_msg}), 500

            # 8. Cache the result
            cache.set(cache_key, parsed_data, timeout=CACHE_TIMEOUT)
            
            # 9. Return the successful result as JSON
            parsed_data['_cached'] = False
            return jsonify(parsed_data)

    return jsonify({"error": "An unknown error occurred"}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large errors"""
    return jsonify({
        "error": f"File too large. Maximum size is {MAX_CONTENT_LENGTH / (1024 * 1024):.0f}MB"
    }), 413


@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors"""
    return jsonify({"error": "Internal server error occurred"}), 500


@app.before_request
def before_request():
    """Pre-request processing for timing"""
    import time
    g.start_time = time.perf_counter()


@app.after_request
def after_request(response):
    """Add performance headers and compression hints"""
    import time
    if hasattr(g, 'start_time'):
        elapsed = time.perf_counter() - g.start_time
        response.headers['X-Process-Time'] = f"{elapsed:.4f}s"
    
    # Add cache control for GET requests
    if request.method == 'GET':
        response.headers['Cache-Control'] = 'public, max-age=60'
    
    return response


if __name__ == '__main__':
    # This is for local testing only. Render will use Gunicorn.
    # Use threaded=True for development server multithreading
    app.run(debug=True, port=5000, threaded=True)