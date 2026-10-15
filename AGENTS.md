# AGENTS.md — Marga Always-On Rules
# Re-read this at the START of every phase before writing any code.

## Product
Name: Marga. Tagline: "Every road, in the order it needs you."
SDG 11. Region: Perundurai, Erode district, Tamil Nadu (11.27°N, 77.59°E).

## Stack (do not deviate without logging in DECISIONS.md)
Backend:  Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLModel + SQLite (WAL)
          Ultralytics YOLO 11, ONNX Runtime (CPU), OpenCV, NumPy, scikit-learn
          Shapely + pyproj, httpx + SQLite cache, Pillow/piexif, gpxpy
          WeasyPrint or ReportLab (evaluate which installs cleanly, log choice)
          pytest, ruff, uvicorn[standard]
Frontend: React 18, Vite 5, TypeScript 5, Tailwind CSS v3 (custom theme only)
          MapLibre GL JS, TanStack Query v5, Zustand, Framer Motion
          ECharts (charts), rough.js (hand-drawn annotations), Phosphor Icons
          i18next, vite-plugin-pwa, @fontsource (Fraunces, Instrument Sans, JetBrains Mono)
Tiles:    OpenFreeMap vector first; fallback to CARTO OSM raster if unavailable
DB:       Single SQLite file, WAL mode; cached external calls in ext_cache table

## Key commands
make dev        → starts backend (uvicorn) + frontend (vite) concurrently
make check      → ruff + eslint + pytest + playwright
make seed       → python scripts/seed_demo.py
make bake       → python scripts/bake_static_demo.py
./run.sh        → alias for make dev

## Priority law (NEVER break this)
P0 must be flawless before any P1 feature is started.
P1 before P2. If time is short, cut from the bottom of the tier.
A broken P0 feature beats a working P2 feature every time.

## Never do
- No paid API, no credit card, no mandatory key. All keys optional.
- No invented accuracy numbers. Metrics shown must come from real eval output files.
- No fake "live" data presented as real. DEMO DATA badge must be visible.
- No banned design patterns (§11.1 of SPEC.md): no purple/indigo gradients,
  no glassmorphism, no neon, no gradient text, no emoji as icons, no pill shapes
  > 8px radius, no Inter/Roboto as visible typeface, no "Welcome back 👋".
- No secrets in the repo. .env.example only; .env gitignored.
- No large weights in git. models/best.pt and models/best.onnx are gitignored.
- Do not start the next phase without a Walkthrough artifact and "continue" from the user.

## Model / inference rules
- Load models/best.onnx if present; else enter Demo-Detector mode (cached seed detections).
- Show DEMO DETECTOR badge when in Demo-Detector mode.
- Inference image size: 640 px. Batch 1–4 on CPU. Cap video at 2 fps analysis.
- Low-confidence band (0.25–0.45) → auto-route to Review Queue.
- Never close-source the repo (AGPL-3.0 from Ultralytics).

## External service rules
- Nominatim: ≤ 1 req/s, User-Agent "marga/0.1 (hackathon)", aggressive caching.
- Overpass: cache all queries on disk (ext_cache table), TTL 24 h.
- OSRM public demo: light use only; fallback gracefully if unavailable.
- Open-Meteo: free, no key, cache responses.
- Every external call must degrade gracefully (app works offline after first run).

## Privacy
- Store road imagery only. Strip EXIF except GPS.
- Face/plate blur is P2 and off by default.

## Safety framing (enforced in all copy)
- Marga recommends. A verified human decides.
- Critical items: "Needs prompt human assessment" — NEVER "unsafe — close the road".

## Data honesty
- Synthetic / seeded data: source=seed tag + DEMO DATA badge visible.
- Cost rates: labelled "editable placeholder assumptions — replace with state SoR".
- Repair methods: labelled "indicative — engineer to confirm".
- Water accumulation class: labelled EXPERIMENTAL in UI and Model Lab.
- Depth estimates: labelled "indicative" with ± ranges.
- LLM explanations: validate every number exists in input JSON; fallback to template.

## Code style
Backend:  ruff (line-length 100), type hints throughout, docstrings on public functions.
Frontend: ESLint + Prettier, strict TypeScript, named exports, no default exports.
Tests:    pytest for backend (golden test cases in tests/), Playwright for frontend.
Commits:  conventional commits (feat:, fix:, test:, docs:, chore:).
