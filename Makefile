# Marga — Makefile
# Usage: make <target>

BACKEND_DIR = backend
FRONTEND_DIR = frontend
PYTHON = python
VENV = .venv

.PHONY: dev backend frontend check test lint seed bake clean setup

## Start backend + frontend concurrently (requires two terminals, or use run.sh)
dev:
	@echo "Starting Marga dev servers..."
	@start "Marga Backend" cmd /k "cd $(BACKEND_DIR) && uvicorn app.main:app --reload --port 8000"
	@cd $(FRONTEND_DIR) && npm run dev

## Backend only
backend:
	cd $(BACKEND_DIR) && uvicorn app.main:app --reload --port 8000

## Frontend only
frontend:
	cd $(FRONTEND_DIR) && npm run dev

## Run all checks (lint + tests + playwright)
check: lint test

## Run pytest
test:
	pytest $(BACKEND_DIR)/tests -v

## Run linters
lint:
	ruff check $(BACKEND_DIR)
	ruff format --check $(BACKEND_DIR)
	cd $(FRONTEND_DIR) && npm run lint

## Seed demo data
seed:
	$(PYTHON) scripts/seed_demo.py

## Bake static demo JSON for frontend
bake:
	$(PYTHON) scripts/bake_static_demo.py

## Install backend deps (run once)
setup-backend:
	$(PYTHON) -m pip install -r requirements.txt

## Install frontend deps (run once)
setup-frontend:
	cd $(FRONTEND_DIR) && npm install

## Install everything
setup: setup-backend setup-frontend

## Check WCAG contrast ratios
contrast:
	node scripts/check-contrast.cjs

## Clean build artifacts
clean:
	rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/.vite
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
