# Marga — Live Demo Runbook & Judge Pitch Script

> **Team**: DeepMinds · Kongu Engineering College  
> **Event**: Hackatronics Hackathon 2026 · SDG 11 (Sustainable Cities and Communities)  
> **Time Limit**: 3 Minutes + 2 Minutes Q&A  
> **Tagline**: *"Every road, in the order it needs you."*

---

## 1. The 30-Second Hook (Spoken)

> "Respected judges, road repairs today suffer from a critical flaw: **municipalities spend millions fixing the wrong potholes first.**
> A deep crater in front of a school or bus stop is far more dangerous than a surface crack on an empty bypass. Yet maintenance teams rely on manual surveys and political complaints.
> 
> **Marga** is an AI-powered road condition intelligence and prioritization system.
> We complete the closed loop: **Detect → Verify → Decide → Repair → Re-inspect → Learn.**
> 
> Let us walk you through the system live."

---

## 2. Click-by-Click Demo Script (2.5 Minutes)

### Minute 1: Survey Ingestion & Spatial Intelligence (`/scan` & `/`)

1. **Open `/scan`**:
   - Show the dashcam ingest gate.
   - Click **"Run Full AI Processing Pipeline"**.
   - Point out the 4 pipeline stages: *Frame Sampling*, *YOLO11 Detection + ByteTrack*, *GPS Spatial Interpolation*, and *DBSCAN Clustering*.
   - Mention: *"We analyze video at 2 fps on CPU without needing costly server GPUs."*

2. **Switch to `/` (Morning Briefing)**:
   - Point to the **Road Health Index (RHI: 81.4 / B)** for Perundurai township.
   - Show the **Severe Defects Count** and live Open-Meteo rainfall telemetry (72-hour precipitation).
   - Click on the interactive road map to view defect clusters.

---

### Minute 2: The Decision Engine & Budget Planner (`/queue` & `/planner`)

3. **Switch to `/queue` (Priority Queue)**:
   - Explain the risk score formula:
     $$\text{Risk Score } R = 100 \times (0.40 S' + 0.20 E + 0.15 V + 0.15 G + 0.10 T)$$
   - Click the **"What-If Analysis"** button in the top right.
   - Slide **Pedestrian Vulnerability (wV)** to maximum:
     - Watch defects near schools and bus stops jump to the top of the queue in real-time.
     - Show the rank delta badges (`▲ +3`).
   - Click the first defect to open the **Defect Detail Drawer**:
     - Point to the **Risk Contribution Waterfall Chart**.
     - Point to the **Evidence Plate** and click **"Verify Hash"** on the **Cryptographic SHA-256 Seal** (`✓ Audit Verified`).

4. **Switch to `/planner` (Budget-Constrained Planner)**:
   - Say: *"Municipal budgets are finite. Which defects do you repair with ₹50,000?"*
   - Move the budget slider from **₹25,000** to **₹75,000**.
   - Show the **0-1 Knapsack Dynamic Programming Optimizer**:
     - Highlights the exact mathematical subset of repairs that **maximizes total risk reduction**.
     - Clearly separates the **Optimal Repair Set** from **Deferred Repairs**.

5. **Switch to `/work-orders` (Kanban Board)**:
   - Show the 4 lifecycle lanes: *Scheduled*, *In Progress*, *Completed*, *Cancelled*.
   - **Drag and drop** a card from *Scheduled* to *In Progress*.
   - Note: *"Supervisors dispatch crews with exact material methods (cold-mix asphalt vs. seal coat) and estimated costs."*

---

### Minute 3: Civic Engagement & ML Transparency (`/citizen` & `/model-lab`)

6. **Switch to `/citizen` (Citizen Portal)**:
   - Highlight: *"Citizens don't need to download an app or create an account."*
   - Show the bilingual **Tamil / English** interface (`குடிமக்கள் சாலை குறைதீர்வு போர்டல்`).
   - Click the **"Track Status"** tab, enter ticket `MGA-CIT-4192`, and click **Track**.
   - Show the **4-step resolution stepper**: *Received → Triaged → Scheduled → Resolved*.

7. **Switch to `/model-lab` (Model Lab)**:
   - Say: *"We do not invent accuracy numbers. Everything you see is traceable to our held-out validation eval on RDD2022 India data."*
   - Show the **mAP@50 (68.4%)** circular gauge and per-class precision/recall bars.
   - Point out the **Confusion Matrix Heatmap**.
   - Read the core principle: *"Marga recommends. A verified human decides."*

8. **Back to `/queue`**:
   - Click **"Export CSV"** and **"GeoJSON"** to show instant GIS and QGIS interoperability.

---

## 3. Fail-Safe Backup Plans (Venues with No Internet / Server Crashes)

| Failure Scenario | Solution |
|------------------|----------|
| **No Internet in Venue** | All fonts (@fontsource) and map styles have offline caching. |
| **Backend Crashes / Port Blocked** | Run `npm run dev` with `VITE_STATIC_DEMO=1`. The frontend immediately falls back to `/demo-data/*.json` with full in-browser Knapsack and What-If computation. |
| **Video Processing Fails** | Pre-baked demo survey `demo_perundurai_nh544.mp4` replays cached detections automatically. |

---

## 4. Anticipated Judge Questions & Bulletproof Answers

### Q1: "How do you estimate defect size and depth from a 2D camera?"
> *"We click lane boundaries once per camera setup to calibrate the meters-per-pixel ratio at 3.5 meters standard lane width. We report size with a ±30% margin of error and clearly state that depth is indicative. For true volumetric 3D sensing, depth-anything or LiDAR is needed — and we explicitly communicate this limitation in the Model Lab."*

### Q2: "What about false positives from shadows or leaves?"
> *"Single-frame false positives are filtered out by our ByteTrack association and DBSCAN spatial clustering. An entity is only confirmed if observed across consecutive frames or multiple survey passes. Furthermore, borderline confidence scores (0.25–0.45) are auto-routed to the human Review Queue."*

### Q3: "How does this align with SDG 11?"
> *"SDG Target 11.2 calls for safe, affordable, accessible, and sustainable transport systems for all. By prioritizing road hazards based on school and pedestrian proximity, Marga directly reduces two-wheeler road fatalities in tier-2/tier-3 Indian towns like Perundurai."*
