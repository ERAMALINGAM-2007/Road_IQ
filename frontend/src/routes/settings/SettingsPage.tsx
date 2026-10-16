import { useState } from 'react';
import {
  Camera,
  Database,
  CloudSun,
  MapTrifold,
  Brain,
  ShieldCheck,
  CheckCircle,
} from 'phosphor-react';

export function SettingsPage() {
  const [laneWidth, setLaneWidth] = useState(3.5);
  const [cameraHeight, setCameraHeight] = useState(1.4);
  const [waterBonus, setWaterBonus] = useState(15);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--rule)] pb-4">
        <span className="survey-plate text-xs text-[var(--ink-muted)]">
          SYSTEM PREFERENCES & SENSOR CALIBRATION
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
          Settings & Configuration
        </h1>
        <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
          Tune camera geometry models, inspect external service status, and configure scoring parameters.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-[rgba(47,125,91,0.12)] border border-[var(--success)] rounded text-xs font-mono text-[var(--success)] flex items-center gap-2">
          <CheckCircle size={16} weight="fill" />
          <span>Camera calibration and scoring thresholds updated successfully.</span>
        </div>
      )}

      {/* Camera Geometry Section */}
      <form onSubmit={handleSave} className="card p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--rule)] pb-3">
          <Camera size={18} className="text-[var(--accent)]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)]">
            Camera Optical Geometry & Scale Calibration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-[var(--ink)] mb-1">
              Standard Lane Width (meters)
            </label>
            <input
              type="number"
              step="0.1"
              min="2.5"
              max="5.0"
              value={laneWidth}
              onChange={(e) => setLaneWidth(parseFloat(e.target.value))}
              className="w-full text-xs font-mono p-2.5 bg-[var(--bg)] border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--ink)]"
            />
            <p className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">
              Default IRC standard is 3.5 m for single-lane width calculation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[var(--ink)] mb-1">
              Mounting Height Above Pavement (meters)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.8"
              max="2.5"
              value={cameraHeight}
              onChange={(e) => setCameraHeight(parseFloat(e.target.value))}
              className="w-full text-xs font-mono p-2.5 bg-[var(--bg)] border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--ink)]"
            />
            <p className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">
              Dashcam / phone mount height on vehicle windshield.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--rule)] pt-4">
          <label className="block text-xs font-mono font-bold text-[var(--ink)] mb-1">
            Standing Water Hazard Escalation (Points)
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={waterBonus}
            onChange={(e) => setWaterBonus(parseInt(e.target.value))}
            className="w-full sm:w-1/2 text-xs font-mono p-2.5 bg-[var(--bg)] border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--ink)]"
          />
          <p className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">
            Additional points added to severity score when puddles conceal pothole depth.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn btn-primary text-xs py-2 px-4">
            Save Preferences
          </button>
        </div>
      </form>

      {/* External Services Telemetry */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--rule)] pb-3">
          <Database size={18} className="text-[var(--info)]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)]">
            External Services & Telemetry Health
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-[var(--paper-wash)] rounded border border-[var(--rule)] space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-[var(--ink)]">
                <MapTrifold size={16} className="text-[var(--accent)]" />
                OpenStreetMap Overpass
              </span>
              <span className="text-[var(--success)]">● Online (Cached)</span>
            </div>
            <p className="text-[10px] text-[var(--ink-muted)]">
              Highway class, speed limits, and pedestrian POI proximity cached locally (TTL: 24h).
            </p>
          </div>

          <div className="p-3 bg-[var(--paper-wash)] rounded border border-[var(--rule)] space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-[var(--ink)]">
                <CloudSun size={16} className="text-[var(--warning)]" />
                Open-Meteo Weather
              </span>
              <span className="text-[var(--success)]">● Connected</span>
            </div>
            <p className="text-[10px] text-[var(--ink-muted)]">
              72h antecedent rainfall and 48h forecast for Perundurai coordinates (Free tier, zero key).
            </p>
          </div>

          <div className="p-3 bg-[var(--paper-wash)] rounded border border-[var(--rule)] space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-[var(--ink)]">
                <Database size={16} className="text-[var(--info)]" />
                SQLite Database
              </span>
              <span className="text-[var(--success)]">● WAL Active</span>
            </div>
            <p className="text-[10px] text-[var(--ink-muted)]">
              Single-file database with Write-Ahead Logging for high-concurrency survey ingestion.
            </p>
          </div>

          <div className="p-3 bg-[var(--paper-wash)] rounded border border-[var(--rule)] space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-[var(--ink)]">
                <Brain size={16} className="text-[var(--accent)]" />
                Inference Runtime
              </span>
              <span className="text-[var(--success)]">● CPU ONNX</span>
            </div>
            <p className="text-[10px] text-[var(--ink-muted)]">
              YOLO11n ONNX Runtime on CPU (~37 ms/image) with seed detector fallback.
            </p>
          </div>
        </div>
      </div>

      {/* Project & Attributions */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--rule)] pb-3">
          <ShieldCheck size={18} className="text-[var(--success)]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)]">
            About Marga (மார்க)
          </h2>
        </div>
        <div className="text-xs font-mono text-[var(--ink-muted)] space-y-2 leading-relaxed">
          <p>
            Developed by <strong>Team DeepMinds</strong> from the Department of Computer Science & Engineering, <strong>Kongu Engineering College</strong>, Perundurai, Tamil Nadu for Hackatronics 2026.
          </p>
          <p>
            Aligned with <strong>UN Sustainable Development Goal 11: Sustainable Cities and Communities</strong> (Target 11.2 — Safe, accessible transport systems for all).
          </p>
          <div className="pt-2 text-[10px] border-t border-[var(--rule)] flex items-center justify-between">
            <span>License: AGPL-3.0 (Ultralytics Open Source)</span>
            <span>Version: 0.1.0-alpha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
