#!/bin/bash
# run.sh — Quick start for Marga (alias for make dev)
# Usage: ./run.sh
set -e

echo "Starting Marga..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""

# Start backend in background
(cd backend && uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

# Start frontend
(cd frontend && npm run dev)

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
