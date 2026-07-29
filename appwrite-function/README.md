# SIAS Schedule Converter - Go Appwrite Function Backend

High-performance, multithreaded PDF schedule parsing backend written in Go for Appwrite Functions and standalone HTTP deployments.

## Features
- **Goroutine Multithreading**: Concurrently extracts text and tables across multiple PDF pages for ultra-fast processing.
- **In-Memory Caching**: Thread-safe cache with expiration tracking to avoid re-parsing duplicate uploads.
- **Full API Parity**: Drop-in replacement for `app.py` supporting `/process-pdf`, `/compare-schedules`, `/health`, `/ping`, and `/stats`.
- **Appwrite Function Support**: Packaged with `appwrite.json` ready for deployment on Appwrite Cloud or self-hosted Appwrite instances.

## Running Locally
```bash
cd appwrite-function
go mod tidy
go run main.go
```

The server will start on `http://localhost:5000`.
