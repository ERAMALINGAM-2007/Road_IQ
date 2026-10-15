import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadSimple,
  CheckCircle,
  Play,
  ArrowRight,
  Drop,
} from 'phosphor-react';

export function ScanPage() {
  const navigate = useNavigate();
  const [roadName, setRoadName] = useState('NH-544 Salem-Kochi Highway (Perundurai Bypass)');
  const [cameraMount, setCameraMount] = useState('dashboard_front');
  const [fps, setFps] = useState('10');
  const [fileSelected, setFileSelected] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedDefects, setDetectedDefects] = useState<Array<{ id: number; class_name: string; conf: number; is_water: boolean }>>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleStartScan = async () => {
    setIsProcessing(true);
    setProgress(0);
    setDetectedDefects([]);
    setIsComplete(false);

    // Simulated frame-by-frame pipeline progression
    const totalFrames = 24;
    for (let i = 1; i <= totalFrames; i++) {
      await new Promise((r) => setTimeout(r, 120));
      const currentPct = Math.round((i / totalFrames) * 100);
      setProgress(currentPct);

      // Randomly simulate real-time defect detections during scan
      if (i === 4) {
        setDetectedDefects((prev) => [...prev, { id: 101, class_name: 'Pothole (D40)', conf: 0.88, is_water: false }]);
      } else if (i === 9) {
        setDetectedDefects((prev) => [...prev, { id: 102, class_name: 'Longitudinal Crack (D00)', conf: 0.81, is_water: false }]);
      } else if (i === 15) {
        setDetectedDefects((prev) => [...prev, { id: 103, class_name: 'Pothole (Waterlogged)', conf: 0.92, is_water: true }]);
      } else if (i === 20) {
        setDetectedDefects((prev) => [...prev, { id: 104, class_name: 'Surface Damage (D20)', conf: 0.85, is_water: false }]);
      }
    }

    setIsProcessing(false);
    setIsComplete(true);
  };

  const handleUseDemoFootage = () => {
    setFileSelected('perundurai_nh544_pass_12oct2026.mp4');
    handleStartScan();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--rule)] pb-4">
        <span className="survey-plate text-xs text-[var(--ink-muted)]">
          COMPUTER VISION INGESTION PIPELINE · YOLOV11 + BYTETRACK
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
          Inspection Footage Ingestion & Processing
        </h1>
        <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
          Upload mobile dashcam or two-wheeler video to detect, track, and score road defects in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2/3): Upload Area & Pipeline Status */}
        <div className="md:col-span-2 space-y-5">
          {/* Upload Dropzone */}
          <div className="card p-6 border-2 border-dashed border-[var(--rule)] hover:border-[var(--accent)] transition-colors text-center space-y-3 bg-[var(--surface)]">
            <div className="w-12 h-12 mx-auto rounded-full bg-[rgba(200,74,8,0.08)] text-[var(--accent)] flex items-center justify-center">
              <UploadSimple size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                {fileSelected ? fileSelected : 'Select Road Survey Video Clip'}
              </h3>
              <p className="text-xs text-[var(--ink-muted)] font-mono mt-1">
                Supports MP4, MOV, MKV from dashboard camera or smartphone (1080p / 4K)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={handleUseDemoFootage}
                disabled={isProcessing}
                className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
              >
                <Play size={14} weight="fill" /> Run Pre-recorded Demo Pass
              </button>
              <label className="btn btn-secondary text-xs py-2 px-3.5 cursor-pointer">
                Browse Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFileSelected(e.target.files[0].name);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Processing Progress Bar */}
          {(isProcessing || isComplete) && (
            <div className="card p-5 space-y-3 bg-[var(--surface)]">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  {isComplete ? (
                    <span className="text-[var(--ok)] flex items-center gap-1 font-bold">
                      <CheckCircle size={16} /> Analysis Completed!
                    </span>
                  ) : (
                    <span>Extracting frames & running YOLO11 inference...</span>
                  )}
                </span>
                <span className="text-[var(--accent)] font-bold">{progress}%</span>
              </div>

              {/* Road-dash progress bar */}
              <div className="w-full bg-[var(--paper)] h-3 rounded-full overflow-hidden border border-[var(--rule)] relative">
                <div
                  className="bg-[var(--accent)] h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                <span>FPS: 10.0 · Model: YOLO11n (ONNX CPU)</span>
                <span>ByteTrack active (De-duplication enabled)</span>
              </div>

              {isComplete && (
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => navigate('/queue')}
                    className="btn btn-primary text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    View in Priority Queue <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/map')}
                    className="btn btn-secondary text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5"
                  >
                    Open on Corridor Map
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Real-time Discovery Feed */}
          {detectedDefects.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                Live Discovered Defects ({detectedDefects.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {detectedDefects.map((det) => (
                  <div
                    key={det.id}
                    className="p-2.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs flex items-center justify-between animate-fadeIn"
                  >
                    <div>
                      <div className="font-bold text-[var(--ink)]">{det.class_name}</div>
                      <div className="text-[10px] font-mono text-[var(--ink-muted)]">
                        Conf: {(det.conf * 100).toFixed(0)}%
                      </div>
                    </div>
                    {det.is_water && (
                      <span className="p-1 rounded bg-[rgba(43,102,147,0.12)] text-[var(--info)] text-[10px] font-mono">
                        <Drop size={14} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3): Ingestion Parameters */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-[var(--ink)]">
              Scan Configuration
            </h3>

            <div>
              <label className="text-xs font-mono text-[var(--ink-muted)] block mb-1">
                Road Corridor Name
              </label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                className="w-full text-xs font-mono p-2 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-[var(--ink-muted)] block mb-1">
                Camera Vantage / Preset
              </label>
              <select
                value={cameraMount}
                onChange={(e) => setCameraMount(e.target.value)}
                className="w-full text-xs font-mono p-2 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
              >
                <option value="dashboard_front">Four-Wheeler Dashboard Mount (Standard 3.5m lane)</option>
                <option value="two_wheeler">Two-Wheeler Handlebar Mount (Wide FOV)</option>
                <option value="hood_forward">Vehicle Bumper / Hood Forward</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-[var(--ink-muted)] block mb-1">
                Frame Sampling Rate
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="w-full text-xs font-mono p-2 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
              >
                <option value="5">5 FPS (Highway travel &gt; 60 km/h)</option>
                <option value="10">10 FPS (Standard inspection ~40 km/h)</option>
                <option value="30">30 FPS (Dense urban survey)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-[var(--rule)] text-[11px] font-mono text-[var(--ink-muted)] space-y-1">
              <div className="flex items-center gap-1.5 text-[var(--ok)]">
                <CheckCircle size={14} /> Open-Meteo Weather Hook Active
              </div>
              <div className="flex items-center gap-1.5 text-[var(--ok)]">
                <CheckCircle size={14} /> OSM Overpass Snapping Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
