# demo/clips/ — Drop your road footage here

Record 2–3 short video clips (1–2 minutes each) from a phone mounted on a
dashboard or two-wheeler, driving slowly on real roads near campus.

## What to record
- Varied road conditions: potholes, cracks, smooth sections
- Daylight, with the road clearly visible
- Any road near Perundurai / Erode is ideal (matches the demo region seed)

## How to export
- Android: most camera apps export directly to MP4
- iPhone: use the default Camera app → MP4 or MOV
- Supported formats: MP4, MOV, AVI

## GPS track (recommended)
Simultaneously log a GPS track with a free app:
- Android: "GPS Logger" (free) → export GPX
- iPhone: "GPX Tracker" (free) → export GPX
- Or: "OsmAnd" (Android/iOS) → record a track → export GPX

Name the files to match:
  demo/clips/clip_01.mp4    demo/tracks/clip_01.gpx
  demo/clips/clip_02.mp4    demo/tracks/clip_02.gpx

Then run: `python scripts/seed_demo.py` to process them.
