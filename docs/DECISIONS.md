# docs/DECISIONS.md — Running Decision Log

Format: D-NNN | Phase | Date | Decision | Rationale | Alternatives considered

---

## D-001 | Phase 0 | 2026-10-15
**Decision:** Use Tailwind CSS v3 with a fully custom theme (all defaults overridden).
**Rationale:** Design bible §11.1 bans the default Tailwind look. A custom theme enforces
our token set at the utility-class level and prevents accidental default colours/radii leaking.
**Alternatives:** Plain CSS modules — fast but no design-system enforcement at the
class-composition layer; Tailwind v4 (alpha) — too unstable for a 48-hour hackathon.

## D-002 | Phase 0 | 2026-10-15
**Decision:** Self-host all three typefaces via @fontsource from Phase 0.
**Rationale:** Keeps the dev server offline-capable; avoids a migration migration before
the final demo; @fontsource is MIT and has all three families.
**Alternatives:** Google Fonts CDN for Phase 0 — would introduce a latency hit and
a network dependency even in the demo hall.

## D-003 | Phase 0 | 2026-10-15
**Decision:** /design page includes the full component gallery (swatches, type scale,
all stamps, buttons, priority row, waterfall bar, map markers, form elements, evidence frame).
**Rationale:** Phase 0 gate requires identity sign-off. A minimal token dump would not
surface mismatches in component-level decisions.
**Alternatives:** Minimal — colour + type only. Rejected: would defer identity problems
to Phase 4 when they are expensive to fix.

## D-004 | Phase 0 | 2026-10-15
**Decision:** Python virtual environment NOT created in Phase 0; pyproject.toml +
requirements.txt + Makefile scaffolded only.
**Rationale:** Keeps Phase 0 fast; backend code does not exist yet; install happens
in Phase 2 when all backend deps are known.
**Alternatives:** Install everything now — would catch version conflicts early but adds
10–15 min to Phase 0 with no benefit until Phase 2.

## D-005 | Phase 0 | 2026-10-15
**Decision:** OpenFreeMap vector tiles (free, no key) as the map tile source.
Graceful fallback to CARTO OSM raster if OpenFreeMap is unreachable.
**Rationale:** Matches spec §6; no key required; warm vector style re-tintable to our palette.
**Alternatives:** CARTO light as default — quick to wire but not the spec's recommendation.

## D-006 | Phase 0 | 2026-10-15
**Decision:** Dark-mode implemented via `data-theme="dark"` attribute on `<html>`,
toggled by a Zustand store. CSS custom properties redefine under `[data-theme="dark"]`.
**Rationale:** No class-based Tailwind dark mode (avoids `dark:` utility proliferation
outside our token set); full SSR compatibility if ever needed.

## D-007 | Phase 0 | 2026-10-15
**Decision:** Severity bands: Low < 25 ≤ Medium < 50 ≤ High < 75 ≤ Critical (0–100 scale).
Shapes: Low ● circle, Medium ◆ diamond, High ▲ triangle, Critical ⬢ hexagon (stop-sign cue).
**Rationale:** Colour-blind-safe + redundant shape, as specified in SPEC §11.3.

## D-008 | Phase 0 | 2026-10-15
**Decision:** Auth uses simple JWT stored in localStorage with three local roles:
inspector, engineer, admin. Demo accounts created on first boot via seed.
**Rationale:** Zero external auth service; fast for hackathon; Citizen routes are public
+ rate-limited (no auth required).

## D-009 | Phase 0 | 2026-10-15
**Decision:** ReportLab chosen over WeasyPrint for PDF generation (P1).
**Rationale:** ReportLab installs cleanly on Windows and Linux without GTK/cairo deps
that WeasyPrint requires. Decision subject to revision if ReportLab proves insufficient.
[Status: tentative — will verify in Phase 5]

## D-010 | Phase 0 | 2026-10-15
**Decision:** React Router v6 (data API / createBrowserRouter) for all routing.
**Rationale:** Supports lazy loading and type-safe params; integrates well with TanStack Query.

## D-011 | Phase 1 | 2026-10-15
**Decision:** YOLO11n (Nano) selected as the primary vision architecture for road defect detection.
**Rationale:** Delivers ~37 ms CPU inference via ONNX Runtime without requiring a server-side GPU.
**Alternatives:** YOLOv8s — slightly slower; Faster R-CNN — too heavy for CPU edge inference.

## D-012 | Phase 1 | 2026-10-15
**Decision:** Sequence-aware dataset stratification (grouping consecutive video frames by sequence ID).
**Rationale:** Adjacent dashcam frames contain almost identical road sections; random splitting causes massive train-to-val data leakage.
**Alternatives:** Naive random splitting — rejected due to artificial inflation of validation metrics.

## D-013 | Phase 1 | 2026-10-15
**Decision:** High-fidelity DemoDetector fallback for zero-dependency execution.
**Rationale:** Enables immediate hackathon testing and demo presentations even if the user has not yet trained or downloaded the ~15 MB ONNX weights. All detections are marked `is_demo=True`.
**Alternatives:** Hard crash when model is missing — rejected as poor user experience for hackathon judges.

## D-014 | Phase 1 | 2026-10-15
**Decision:** Water accumulation treated as context fusion (precipitation + defect type + slope) and tagged EXPERIMENTAL.
**Rationale:** Monocular imagery cannot reliably distinguish water depth; fusing 72-hour rainfall gives grounded physical estimates while preserving honest limitations.

---

*Add new decisions here as they are made. Format: D-NNN | Phase N | Date | ...*
