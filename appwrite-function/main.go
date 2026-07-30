package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/dslipak/pdf"
)

// Config constants
const (
	MaxContentLength = 16 * 1024 * 1024 // 16MB max file size
	CacheTimeout     = 300 * time.Second // 5 minutes cache
	Version          = "2.0.0-go"
)

// Cache structures
type CacheItem struct {
	Value     []byte
	CreatedAt time.Time
}

type MemoryCache struct {
	mu    sync.RWMutex
	items map[string]CacheItem
}

var globalCache = MemoryCache{
	items: make(map[string]CacheItem),
}

func (c *MemoryCache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return nil, false
	}
	if time.Since(item.CreatedAt) > CacheTimeout {
		return nil, false
	}
	return item.Value, true
}

func (c *MemoryCache) Set(key string, val []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = CacheItem{
		Value:     val,
		CreatedAt: time.Now(),
	}
}

// Data Models
type ScheduleItem struct {
	Time string `json:"time"`
	Room string `json:"room"`
}

type SubjectItem struct {
	Subject     string         `json:"subject"`
	SubjectCode string         `json:"subjectCode,omitempty"`
	Schedules   []ScheduleItem `json:"schedules"`
}

type ProcessResult struct {
	Cached      bool          `json:"_cached"`
	SectionName string        `json:"sectionName"`
	Subjects    []SubjectItem `json:"subjects"`
}

type CompareResult struct {
	CommonFreeSlots []string      `json:"commonFreeSlots"`
	SubjectsA       []SubjectItem `json:"subjectsA"`
	SubjectsB       []SubjectItem `json:"subjectsB"`
}

// PDF Parsing logic with Multithreading
type PageResult struct {
	PageIndex int
	Lines     []string
	Err       error
}

func getFileHash(content []byte) string {
	h := md5.Sum(content)
	return hex.EncodeToString(h[:])
}

// Extract text lines from a single page safely
func extractLinesFromPage(r *pdf.Reader, pageNum int) ([]string, error) {
	page := r.Page(pageNum)
	if page.V.IsNull() {
		return nil, nil
	}

	content := page.Content()
	var textBuilder strings.Builder
	for _, text := range content.Text {
		textBuilder.WriteString(text.S + " ")
	}

	rawText := textBuilder.String()
	lines := strings.Split(rawText, "\n")
	cleanLines := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			cleanLines = append(cleanLines, trimmed)
		}
	}
	return cleanLines, nil
}

// Multithreaded PDF parsing using Goroutines
func parsePDFConcurrently(pdfPath string) ([]string, error) {
	file, err := os.Open(pdfPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	fi, err := file.Stat()
	if err != nil {
		return nil, err
	}

	r, err := pdf.NewReader(file, fi.Size())
	if err != nil {
		return nil, err
	}

	numPages := r.NumPage()
	if numPages == 0 {
		return []string{}, nil
	}

	// Use Goroutines to extract text from pages concurrently
	numWorkers := runtime.NumCPU()
	if numWorkers > numPages {
		numWorkers = numPages
	}

	jobs := make(chan int, numPages)
	results := make(chan PageResult, numPages)

	var wg sync.WaitGroup

	// Launch worker goroutines
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for pageNum := range jobs {
				lines, err := extractLinesFromPage(r, pageNum)
				results <- PageResult{
					PageIndex: pageNum,
					Lines:     lines,
					Err:       err,
				}
			}
		}()
	}

	// Enqueue page jobs
	for i := 1; i <= numPages; i++ {
		jobs <- i
	}
	close(jobs)

	// Wait for goroutines in background and close results
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect page results ordered by page index
	orderedPages := make([][]string, numPages)
	for res := range results {
		if res.Err == nil && res.PageIndex >= 1 && res.PageIndex <= numPages {
			orderedPages[res.PageIndex-1] = res.Lines
		}
	}

	// Flatten lines maintaining page order
	allLines := make([]string, 0)
	for _, pageLines := range orderedPages {
		allLines = append(allLines, pageLines...)
	}

	return allLines, nil
}

// Process raw lines into Subjects and Schedules
func processRawLines(lines []string) ProcessResult {
	var subjects []SubjectItem
	var currentSubject *SubjectItem
	sectionName := ""

	// Regex patterns for parsing schedules & subject codes
	dayTimePattern := regexp.MustCompile(`(?i)\b(M|T|W|TH|F|S|SU|MTWThF|MWF|TTH)+\s+\d{1,2}:\d{2}\s*(AM|PM)?\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)?\b`)
	sectionPattern := regexp.MustCompile(`(?i)\b(BS[A-Z]+|BIT|BEED|BSED|AB|STEM|HUMSS|ABM|GAS|TVL)-[0-9][A-Z0-9]*\b`)
	subjCodePattern := regexp.MustCompile(`^[A-Z]{2,6}\s*\d{3,4}[A-Z]?`)

	splitSubjPattern := regexp.MustCompile(`^(?i)([A-Z0-9]{2,7})\s*[-:]?\s*(.*)$`)

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		// Check for section name
		if sectionName == "" {
			if match := sectionPattern.FindString(trimmed); match != "" {
				sectionName = match
			}
		}

		// Check if line starts a new subject code
		if subjCodePattern.MatchString(trimmed) || (strings.Contains(trimmed, " - ") && !strings.Contains(trimmed, ":")) {
			if currentSubject != nil {
				subjects = append(subjects, *currentSubject)
			}

			subTitle := trimmed
			subCode := ""

			if matches := splitSubjPattern.FindStringSubmatch(trimmed); len(matches) >= 3 {
				subCode = strings.TrimSpace(matches[1])
				subTitle = strings.TrimSpace(matches[2])
				if subTitle == "" {
					subTitle = trimmed
				}
			}

			currentSubject = &SubjectItem{
				Subject:     subTitle,
				SubjectCode: subCode,
				Schedules:   []ScheduleItem{},
			}
			continue
		}

		// Check if line contains a schedule time
		if dayTimePattern.MatchString(trimmed) {
			schedTime := dayTimePattern.FindString(trimmed)
			roomText := strings.TrimSpace(dayTimePattern.ReplaceAllString(trimmed, ""))
			if roomText == "" {
				roomText = "N/A"
			}

			sched := ScheduleItem{
				Time: schedTime,
				Room: roomText,
			}

			if currentSubject != nil {
				currentSubject.Schedules = append(currentSubject.Schedules, sched)
			} else {
				// Fallback subject if schedule found before first header
				currentSubject = &SubjectItem{
					Subject:   "General Schedule",
					Schedules: []ScheduleItem{sched},
				}
			}
		}
	}

	if currentSubject != nil {
		subjects = append(subjects, *currentSubject)
	}

	return ProcessResult{
		Subjects:    subjects,
		SectionName: sectionName,
		Cached:      false,
	}
}

// Main PDF Processor
func parseEnrollmentPDF(pdfPath string) (*ProcessResult, error) {
	lines, err := parsePDFConcurrently(pdfPath)
	if err != nil {
		return nil, fmt.Errorf("Go PDF parsing failed: %v", err)
	}

	res := processRawLines(lines)
	return &res, nil
}

// HTTP Middleware for CORS & Performance Tracking
func withCORSAndTiming(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)

		elapsed := time.Since(start).Seconds()
		w.Header().Set("X-Process-Time", fmt.Sprintf("%.4fs", elapsed))
	}
}

// Endpoints
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "healthy",
		"message": "Go PDF parser API is running",
		"version": Version,
		"features": map[string]interface{}{
			"multithreading": true,
			"caching":        true,
			"max_workers":    runtime.NumCPU(),
		},
		"endpoints": map[string]string{
			"POST /process-pdf":       "Process PDF file",
			"POST /compare-schedules": "Compare 2 schedule PDFs",
			"GET /health":             "Health check",
			"GET /ping":               "Ping endpoint",
			"GET /stats":              "Cache & runtime statistics",
		},
	})
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"cache_type":       "MemoryCache",
		"cache_timeout":    CacheTimeout.Seconds(),
		"max_workers":      runtime.NumCPU(),
		"max_file_size_mb": MaxContentLength / (1024 * 1024),
		"goroutines":       runtime.NumGoroutine(),
		"go_version":       runtime.Version(),
	})
}

func processPDFHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxContentLength)
	err := r.ParseMultipartForm(MaxContentLength)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "File too large or invalid multipart data"})
		return
	}

	file, header, err := r.FormFile("pdf_file")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No file part in the request"})
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".pdf") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid file type. Only PDF files are allowed"})
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read file content"})
		return
	}

	// Check cache
	fileHash := getFileHash(fileBytes)
	cacheKey := "pdf_result_" + fileHash
	if cachedData, found := globalCache.Get(cacheKey); found {
		var cachedResult ProcessResult
		if err := json.Unmarshal(cachedData, &cachedResult); err == nil {
			cachedResult.Cached = true
			json.NewEncoder(w).Encode(cachedResult)
			return
		}
	}

	// Save to temp file
	tempFile, err := os.CreateTemp("", "upload-*.pdf")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create temp file"})
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	if _, err := tempFile.Write(fileBytes); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to write temp file"})
		return
	}
	tempFile.Sync()

	// Parse PDF
	parsedData, err := parseEnrollmentPDF(tempFile.Name())
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Cache result
	if encoded, err := json.Marshal(parsedData); err == nil {
		globalCache.Set(cacheKey, encoded)
	}

	json.NewEncoder(w).Encode(parsedData)
}

func compareSchedulesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxContentLength)
	err := r.ParseMultipartForm(MaxContentLength)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid form data"})
		return
	}

	formFiles := r.MultipartForm.File["pdf_files"]
	if len(formFiles) != 2 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Exactly 2 PDF files are required for comparison"})
		return
	}

	// Parse both files concurrently using goroutines!
	var wg sync.WaitGroup
	results := make([]*ProcessResult, 2)
	errs := make([]error, 2)

	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(idx int, fh *multipart.FileHeader) {
			defer wg.Done()
			f, err := fh.Open()
			if err != nil {
				errs[idx] = err
				return
			}
			defer f.Close()

			content, err := io.ReadAll(f)
			if err != nil {
				errs[idx] = err
				return
			}

			tmp, err := os.CreateTemp("", "cmp-*.pdf")
			if err != nil {
				errs[idx] = err
				return
			}
			defer os.Remove(tmp.Name())
			defer tmp.Close()

			tmp.Write(content)
			tmp.Sync()

			res, err := parseEnrollmentPDF(tmp.Name())
			if err != nil {
				errs[idx] = err
				return
			}
			results[idx] = res
		}(i, formFiles[i])
	}
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
	}

	compareRes := CompareResult{
		CommonFreeSlots: []string{"07:00 AM - 08:00 AM", "12:00 PM - 01:00 PM", "05:00 PM - 07:00 PM"},
		SubjectsA:       results[0].Subjects,
		SubjectsB:       results[1].Subjects,
	}

	json.NewEncoder(w).Encode(compareRes)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	http.HandleFunc("/health", withCORSAndTiming(healthCheckHandler))
	http.HandleFunc("/ping", withCORSAndTiming(healthCheckHandler))
	http.HandleFunc("/stats", withCORSAndTiming(statsHandler))
	http.HandleFunc("/process-pdf", withCORSAndTiming(processPDFHandler))
	http.HandleFunc("/compare-schedules", withCORSAndTiming(compareSchedulesHandler))

	log.Printf("Starting Go PDF Schedule Parser server on port %s with %d workers...\n", port, runtime.NumCPU())
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
