## Marga — Product Specification (cleaned from master prompt)

> Last updated: 2026-10-15. Source: MARGA master prompt v1.

---

# 1. Problem Statement

Roads develop potholes, cracks, surface damage, and water accumulation. Manual inspection is slow; small defects worsen before reporting; coverage is inconsistent; authorities cannot identify high-risk locations; maintenance teams have no unified system to prioritise repairs.

**The deeper problem:** maintenance teams lack a unified system to *decide and act*, not just detect.

---

# 2. The Closed Loop

    Detect → Verify → Decide → Repair → Re-inspect → Learn

---

# 3. Users

1. **Inspector / Surveyor** — captures or uploads footage; reviews AI findings in the field.
2. **Maintenance engineer** — sees priorities, plans repairs, tracks work orders, exports reports.
3. **Citizen** — reports a defect from a phone; tracks it; sees the public road-health map.

---

# 4. Core Loop (P0)

Upload image/video (+GPS) → detect & track → measure & grade severity →
place on map → cluster into defects → score risk → ranked queue with explanation →
human verify → export.

---

# 5. Feature Tiers

## P0 — MVP
- F1 Ingest & quality gate
- F2 Defect detection (YOLO)
- F3 Video tracking & de-duplication (ByteTrack)
- F4 Severity assessment (explainable)
- F5 Location intelligence (GPX / EXIF / draw-route / pin)
- F6 Defect entities & recurrence (DBSCAN clustering)
- F7 Risk scoring & ranking
- F8 Dashboard (map + queue + filters + detail drawer)
- F9 Explainable recommendations (template-first, optional LLM polish)
- F10 Human verification (approve/reject/reclassify + audit trail)
- F11 Export (CSV + GeoJSON; PDF is P1)

## P1 — Differentiators
- F12 Road context from OSM (Overpass, cached)
- F13 Weather context (Open-Meteo, no key)
- F14 Road Health Index per segment
- F15 What-if weight panel (live re-ranking)
- F16 Work-order lifecycle + Kanban
- F17 Budget-constrained repair planner (knapsack + route)
- F18 Repair method + cost estimate (config-driven)
- F19 Model Lab (real metrics from eval files)
- F20 Citizen portal (mobile-first)
- F21 PDF inspection report
- F22 Evidence integrity (SHA-256 + sealed indicator)
- F23 Tamil / English UI (i18next)
- F24 Demo mode & static fallback

## P2 — Stretch
- F25 Ride-feel sensor fusion (accelerometer)
- F26 Relative depth cue (Depth-Anything-V2-Small)
- F27 Before/after repair verification
- F28 Smoothest-route finder (OSRM)
- F29 Time-lapse scrubber
- F30 Grounded assistant "Ask Marga"
- F31 Deterioration outlook
- F32 Telegram/ntfy alert
- F33 In-browser ONNX inference
- F34 Plate/face blur

---

# 6. Tech Stack

See AGENTS.md for the authoritative list.

---

# 7. ML Pipeline

## 7.1 Data
- **Primary:** RDD2022 dataset (India subset preferred). Classes: D00 (long crack),
  D10 (trans crack), D20 (alligator crack), D40 (pothole).
- **Split:** 80/10/10 stratified by class AND by image sequence to avoid leakage.
- **Training:** India + optionally Japan/Czech/US. Evaluate separately on India validation.
- **Class mapping to UI:**
  - D40 → Pothole
  - D00 + D10 → Crack (longitudinal / transverse)
  - D20 → Surface damage (alligator)
  - water → Water accumulation (EXPERIMENTAL, 5th class, separate model)

## 7.2 Training (on free GPU)
- Model: yolo11n + yolo11s (imgsz 640, ~60–80 epochs, early stopping).
- Augmentations: brightness/contrast jitter, motion blur, mosaic, horizontal flip, HSV.
- Export: ONNX (imgsz=640, simplify=True).
- Notebook: ml/notebooks/train_yolo_rdd2022.ipynb (works on Colab T4 and Kaggle GPU).

## 7.3 Demo-Detector fallback
- If models/best.onnx absent → replay cached detections from demo/seed/*.json for demo clips.
- Show persistent DEMO DETECTOR badge.
- Return "model weights not installed — see README" for non-demo uploads.

## 7.4 Water accumulation
1. Experimental water detector (separate YOLO model on Roboflow/Kaggle puddle data).
2. Context signal (always on): waterlogging_likelihood = f(rain 72h, pothole type, low-lying).
3. Water-filled pothole gets +severity and "depth unknown" note.
Label EXPERIMENTAL in UI and Model Lab.

---

# 8. Scoring Engines

## 8.1 Severity Score S (0–100)

    S = 100 × clamp( wA·A + wC·C + wP·P + wD·D ) + waterBonus

- A: estimated physical area (m²), logistic-squashed
- C: class base weight (pothole 1.0, surface damage 0.8, transverse crack 0.5, long crack 0.35)
- P: lane position (wheel path 1.0, edge 0.7, shoulder 0.4)
- D: depth index (P2 only; if absent, renormalise)
- waterBonus: fixed bonus for water-filled flag

Bands: Low <25, Medium <50, High <75, Critical ≤100.

Safety overrides (configurable):
- Pothole est. width >30 cm on road with speed ≥60 km/h → at least High.
- Dense alligator cracking >X% of lane window → at least High.

Scale estimation: one-time calibration per camera — user clicks lane edges in a frame
(default 3.5 m lane width), build per-row metres-per-pixel model. Show ±30% ranges.
Label "indicative". Skip → relative-size scoring + "uncalibrated" tag.

## 8.2 Risk Score R (0–100)

    R = 100 × ( 0.40·S' + 0.20·E + 0.15·V + 0.15·G + 0.10·T )

- S': S/100
- E (Exposure): OSM highway class × speed × junction/curve bump
- V (Vulnerability): school/hospital/bus stop/market/crossing within 150 m (distance-decayed)
- G (Persistence): observation count (saturating), days since first seen, area trend
- T (Time & Weather): days unrepaired + rainfall last/next 72 h

Missing inputs excluded and weights renormalised. UI shows "context unavailable: weather".
Ties broken by recency then confidence.

## 8.3 Road Health Index (segment)

    RHI = 100 − min(100, Σ penalty_i)

penalty_i = f(severity band, area) normalised by segment length.
Grades: A ≥85, B ≥70, C ≥55, D ≥40, F <40.
Store per survey date for trends.

## 8.4 Explanation Layer
1. Deterministic template (always available). Example:
   "High risk (78). A pothole roughly 45 × 35 cm in the left wheel path of a 60 km/h road,
   90 m from a school. Seen on 3 of 3 passes and growing. Rain expected in the next 48 h."
   "Suggested: schedule patch repair within 7 days. Needs engineer confirmation."
2. Optional LLM polish (Gemini free tier or local Ollama). Receives structured JSON only.
   Validate: every number in output must exist in input JSON; else fall back to template.
3. Waterfall bar chart of contributions in UI.

---

# 9. Data Model

Tables: surveys, frames, detections, defects, segments, work_orders,
        reviews, citizen_reports, sensor_events, ext_cache, settings, audit_log.

See AGENTS.md §Stack and backend/app/ for schema details.

---

# 10. API

All under /api. Auto-generated OpenAPI docs linked from README.

Key endpoints (P0):
  POST   /surveys                 multipart upload
  GET    /surveys/{id}/progress   WebSocket job progress
  GET    /defects?filters
  GET    /defects/{id}
  POST   /defects/{id}/review
  GET    /segments
  GET    /priorities?weights=
  POST   /citizen/reports
  GET    /model/metrics
  GET    /health
  GET    /export/{csv|geojson}

---

# 11. Non-Functional Requirements

- First meaningful paint < 2 s on a normal laptop.
- Map smooth with 2,000 defects (cluster + simplify).
- All long jobs show progress + can be cancelled.
- Every empty/loading/error state designed and written.
- WCAG AA accessibility (contrast, focus, keyboard, labels).
- Severity never conveyed by colour alone.
- Reduced-motion respected. Dark mode.
- Structured logs. No secrets in repo.

---

# 12. Demo Data

- Region: Perundurai, Erode (11.27°N, 77.59°E).
- seed_demo.py: ~150 synthetic defects on real OSM roads, 3 survey dates, tagged source=seed.
- DEMO DATA badge on all seeded content.
- bake_static_demo.py: exports frontend/public/demo-data/*.json for static demo.
- VITE_STATIC_DEMO=1: frontend runs without backend (read-only + client-side what-if).

---

# 13. Deployment

- Local: make dev (backend + frontend). docker-compose.yml alternative.
- Frontend: Vercel / Netlify / Cloudflare Pages.
- Backend: Hugging Face Space (CPU basic Docker) or Render free.
- Free tier caveat: ephemeral disk + cold starts → seed on boot, frontend falls back to static demo.

---

# 14. Phased Execution Plan

Phase 0 — Foundations (this phase)
Phase 1 — ML pipeline
Phase 2 — Backend core
Phase 3 — Geo & risk
Phase 4 — Frontend P0
Phase 5 — P1 decision features
Phase 6 — Citizen & capture
Phase 7 — Polish & pitch

Stop after each phase. Produce Walkthrough artifact. Wait for "continue".

---

# 15. Definition of Done

- P0 flawless; P1 complete (or cuts logged in DECISIONS.md); P2 only if time.
- Fresh clone → make dev → working demo in < 5 min.
- Static demo works without backend.
- Every number traceable to data or config. Synthetic data labelled.
- UI passes §11.1 "not slop" review. Both themes. Both breakpoints.
- Final Walkthrough: features delivered, features cut, known limitations, human steps remaining.

---

# 16. Honest Limits (tell judges before they ask)

- Severity from a single camera is an estimate (±30% size, unknown depth).
- Water accumulation is the weakest class — labelled EXPERIMENTAL.
- RDD2022 India subset is not exhaustive; on-campus accuracy will differ.
- Cost rates are placeholders until replaced with the official Schedule of Rates.
- Marga recommends. A verified human decides.
