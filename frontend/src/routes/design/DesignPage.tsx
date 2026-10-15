import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';
import { CheckCircle, XCircle, Warning, Info } from 'phosphor-react';

// ── Severity shape icon component ────────────────────────────────────────────
export function SeverityShape({ level, size = 20 }: { level: SeverityLevel; size?: number }) {
  const colours: Record<SeverityLevel, string> = {
    low:      'var(--sev-low)',
    medium:   'var(--sev-medium)',
    high:     'var(--sev-high)',
    critical: 'var(--sev-critical)',
  };
  const c = colours[level];

  if (level === 'low') {
    return <svg width={size} height={size} viewBox="0 0 20 20" aria-label={`${level} severity`}><circle cx="10" cy="10" r="8" fill={c}/></svg>;
  }
  if (level === 'medium') {
    const half = size / 2;
    const r = size * 0.42;
    const pts = [
      [half, half - r],
      [half + r, half],
      [half, half + r],
      [half - r, half],
    ].map(p => p.join(',')).join(' ');
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${level} severity`}><polygon points={pts} fill={c}/></svg>;
  }
  if (level === 'high') {
    const half = size / 2;
    const r = size * 0.44;
    const pts = [
      [half, half - r],
      [half + r * Math.sin(Math.PI * 2 / 3), half - r * Math.cos(Math.PI * 2 / 3)],
      [half + r * Math.sin(-Math.PI * 2 / 3), half - r * Math.cos(-Math.PI * 2 / 3)],
    ].map(p => p.join(',')).join(' ');
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${level} severity`}><polygon points={pts} fill={c}/></svg>;
  }
  // critical — hexagon (stop-sign cue)
  const cx = size / 2, cy = size / 2, r = size * 0.44;
  const n = 6;
  const pts = Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${level} severity`}><polygon points={pts} fill={c}/></svg>;
}

// ── Severity stamp ────────────────────────────────────────────────────────────
export function SeverityStamp({ level, stamped = false }: { level: SeverityLevel; stamped?: boolean }) {
  return (
    <motion.div
      className={`stamp stamp-${level}`}
      animate={stamped ? { scale: [1.15, 1], rotate: [-2, -2] } : { scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <SeverityShape level={level} size={24} />
      <span>{SEVERITY_LABELS[level]}</span>
    </motion.div>
  );
}

// ── Risk meter ────────────────────────────────────────────────────────────────
export function RiskMeter({ score }: { score: number }) {
  const level: SeverityLevel =
    score < 25 ? 'low' : score < 50 ? 'medium' : score < 75 ? 'high' : 'critical';
  const filled = Math.round(score / 10); // 0–10 segments

  return (
    <div className="risk-meter w-24" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`Risk score ${score}`}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`risk-segment ${i < filled ? `active-${level}` : ''}`} />
      ))}
    </div>
  );
}

// ── Sparkline (mini inline chart) ────────────────────────────────────────────
export function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 64, h = 20;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 0.001)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} aria-label="Risk trend sparkline">
      <polyline points={pts} fill="none" stroke="var(--sev-high)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Waterfall chart ───────────────────────────────────────────────────────────
const WATERFALL_DATA = [
  { label: 'Severity (40%)', value: 0.40 * 78, colour: 'var(--accent)', weight: 0.40 },
  { label: 'Exposure (20%)', value: 0.20 * 90, colour: 'var(--sev-high)', weight: 0.20 },
  { label: 'Vulnerability (15%)', value: 0.15 * 80, colour: 'var(--sev-medium)', weight: 0.15 },
  { label: 'Persistence (15%)', value: 0.15 * 70, colour: 'var(--sev-low)', weight: 0.15 },
  { label: 'Weather (10%)', value: 0.10 * 60, colour: 'var(--info)', weight: 0.10 },
];
const TOTAL = WATERFALL_DATA.reduce((s, d) => s + d.value, 0);

function WaterfallChart() {
  return (
    <div className="space-y-1.5" role="img" aria-label="Risk score breakdown waterfall chart">
      <p className="text-xs text-[var(--ink-muted)] mb-3">Example risk score: <strong className="mono text-[var(--ink)]">78</strong> / 100</p>
      {WATERFALL_DATA.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-[var(--ink-muted)] w-44 shrink-0">{d.label}</span>
          <div className="flex-1 h-5 relative bg-[var(--rule)] rounded-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-sm"
              style={{ width: `${(d.value / TOTAL) * 100}%`, backgroundColor: d.colour }}
            />
          </div>
          <span className="mono text-xs text-[var(--ink)] w-8 text-right tabular">{d.value.toFixed(1)}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1 border-t border-[var(--rule)]">
        <span className="text-xs font-semibold text-[var(--ink)] w-44 shrink-0">Total risk</span>
        <div className="flex-1"/>
        <span className="mono text-xs font-bold text-[var(--accent)] w-8 text-right tabular">{TOTAL.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ── Priority row ──────────────────────────────────────────────────────────────
function PriorityRow() {
  return (
    <div className="card p-4 flex items-start gap-4">
      {/* Rank */}
      <div className="font-display text-xl text-[var(--ink-muted)] w-7 shrink-0 tabular" style={{ fontOpticalSizing: 'auto' } as React.CSSProperties}>
        1
      </div>

      {/* Thumbnail placeholder */}
      <div className="w-16 h-12 shrink-0 bg-[var(--rule)] rounded relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <SeverityShape level="high" size={18} />
        </div>
        {/* Taped corner motif */}
        <div className="absolute top-0 right-0 w-3 h-3 bg-[var(--marking)] opacity-70" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} aria-hidden="true"/>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)] leading-tight">
              Pothole · NH 544, near Perundurai Junction
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5 survey-plate">
              11.2762°N 77.5879°E · first seen 28 Sep 2026 · 3 surveys
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="chip chip-high">High</span>
            <Sparkline data={[42, 55, 63, 70, 78]} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <RiskMeter score={78} />
          <span className="mono text-xs text-[var(--ink-muted)]">Risk 78</span>
          <span className="chip chip-high text-[10px]">Verified</span>
        </div>
        <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-relaxed">
          Approx. 45 × 35 cm in the left wheel path of a 60 km/h road, 90 m from a school. Seen on all 3 passes and growing.
        </p>
      </div>
    </div>
  );
}

// ── Map marker preview ────────────────────────────────────────────────────────
function MapMarkers() {
  const levels: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
  return (
    <div className="flex items-end gap-8 flex-wrap">
      {levels.map((level) => (
        <div key={level} className="flex flex-col items-center gap-2">
          <div className="relative">
            <SeverityShape level={level} size={28} />
            {level === 'critical' && (
              <span className="absolute inset-0 rounded-full border-2 border-[var(--sev-critical)] animate-ping" style={{ animationDuration: '2s' }} aria-hidden="true"/>
            )}
          </div>
          <span className="text-xs text-[var(--ink-muted)]">{SEVERITY_LABELS[level]}</span>
        </div>
      ))}
      {/* Cluster ring */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center w-8 h-8">
          <div className="w-7 h-7 rounded-full bg-[var(--asphalt)] border-2 border-[var(--marking)] flex items-center justify-center">
            <span className="mono text-[10px] text-[var(--marking)] font-bold">12</span>
          </div>
          <div className="absolute inset-0 rounded-full border border-[var(--marking)] opacity-30"/>
        </div>
        <span className="text-xs text-[var(--ink-muted)]">Cluster</span>
      </div>
      {/* Hotspot (recurring) */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <SeverityShape level="high" size={28} />
          <span
            className="absolute -inset-2 rounded-full border-2 border-dashed border-[var(--sev-high)] opacity-60"
            style={{ animation: 'road-dash 2s linear infinite' }}
            aria-hidden="true"
          />
        </div>
        <span className="text-xs text-[var(--ink-muted)]">Hotspot</span>
      </div>
    </div>
  );
}

// ── Evidence frame ────────────────────────────────────────────────────────────
function EvidenceFrame() {
  return (
    <div className="evidence-frame w-64">
      {/* Simulated road image placeholder */}
      <div className="w-full h-40 bg-gradient-to-b from-[#3a3a3a] to-[#606060] flex items-center justify-center relative overflow-hidden">
        {/* Road surface */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[#4a4a4a]"/>
        {/* Lane line */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col justify-center gap-2 pt-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-6 bg-[#F2C230] opacity-70 rounded"/>
          ))}
        </div>
        {/* Pothole bounding box */}
        <div className="absolute border-2 border-[var(--sev-high)] rounded" style={{ bottom: '28px', left: '80px', width: '60px', height: '36px' }}>
          <span className="absolute -top-4 left-0 text-[9px] font-mono text-[var(--sev-high)] bg-[var(--asphalt)] px-1">Pothole 0.82</span>
        </div>
        {/* Sealed indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <CheckCircle size={10} color="var(--ok)" weight="fill"/>
          <span className="text-[9px] font-mono text-[var(--ok)]">Sealed</span>
        </div>
      </div>
      <div className="evidence-caption">
        11.2755°N 77.5873°E · 14 Oct 2026 · 08:42 · sha256:a3f9…
      </div>
    </div>
  );
}

// ── Full design page ──────────────────────────────────────────────────────────
const COLOUR_SWATCHES = [
  { name: '--paper',      hex: '#F3EFE6', dark: '#14161A', textOn: '#1B1A17', textOnDark: '#ECE8DD', role: 'Page background' },
  { name: '--surface',    hex: '#FBF9F4', dark: '#1C1F24', textOn: '#1B1A17', textOnDark: '#ECE8DD', role: 'Card / panel' },
  { name: '--ink',        hex: '#1B1A17', dark: '#ECE8DD', textOn: '#FBF9F4', textOnDark: '#14161A', role: 'Primary text' },
  { name: '--ink-muted',  hex: '#5F5B52', dark: '#9B9589', textOn: '#FBF9F4', textOnDark: '#14161A', role: 'Secondary text' },
  { name: '--rule',       hex: '#D9D3C5', dark: '#2E3138', textOn: '#1B1A17', textOnDark: '#ECE8DD', role: 'Dividers' },
  { name: '--asphalt',    hex: '#2B2D2F', dark: '#0D0F12', textOn: '#ECE8DD', textOnDark: '#ECE8DD', role: 'Nav rail' },
  { name: '--marking',    hex: '#F2C230', dark: '#F2C230', textOn: '#1B1A17', textOnDark: '#1B1A17', role: 'Road-marking yellow' },
  { name: '--accent',     hex: '#E8590C', dark: '#F06B2A', textOn: '#ffffff', textOnDark: '#ffffff', role: 'Primary actions' },
  { name: '--ok',         hex: '#2F7D5B', dark: '#3D9E72', textOn: '#ffffff', textOnDark: '#ffffff', role: 'Verified / Repaired' },
  { name: '--sev-low',    hex: '#5E8C61', dark: '#6EA871', textOn: '#ffffff', textOnDark: '#14161A', role: 'Low severity' },
  { name: '--sev-medium', hex: '#D9A21B', dark: '#DEAE36', textOn: '#1B1A17', textOnDark: '#1B1A17', role: 'Medium severity' },
  { name: '--sev-high',   hex: '#D9531E', dark: '#E26035', textOn: '#ffffff', textOnDark: '#ffffff', role: 'High severity' },
  { name: '--sev-critical','hex': '#B3202A', dark: '#D43040', textOn: '#ffffff', textOnDark: '#ffffff', role: 'Critical severity' },
];

function wcagRatio(hex1: string, hex2: string): string {
  // Simplified relative luminance approximation for display
  function lum(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  const l1 = lum(hex1), l2 = lum(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio.toFixed(1) + ':1';
}

export function DesignPage() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const [stampedLevel, setStampedLevel] = useState<SeverityLevel | null>(null);

  const triggerStamp = (level: SeverityLevel) => {
    setStampedLevel(level);
    setTimeout(() => setStampedLevel(null), 400);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-16 pb-24">
      {/* Page header */}
      <div className="space-y-1">
        <div className="inspection-tag inline-flex mb-4">Design System · Phase 0</div>
        <h1 className="font-display text-2xl text-[var(--ink)]" style={{ fontOpticalSizing: 'auto' } as React.CSSProperties}>
          Marga Design System
        </h1>
        <p className="text-sm text-[var(--ink-muted)] max-w-xl">
          "A surveyor's field notebook meets a municipal control room." Warm, tactile, confident,
          data-dense but calm. This page is the identity sign-off for Phase 0.
        </p>
        <hr className="road-divider" />
      </div>

      {/* ── Section 1: Palette ── */}
      <section aria-labelledby="section-palette">
        <h2 id="section-palette" className="text-md font-semibold text-[var(--ink)] mb-1">1 · Palette</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-4">Showing {isDark ? 'dark' : 'light'} mode values. Contrast ratios against {isDark ? 'dark page' : 'light page'} (#F3EFE6 / #14161A).</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {COLOUR_SWATCHES.map((s) => {
            const hex = isDark ? s.dark : s.hex;
            const textColour = isDark ? s.textOnDark : s.textOn;
            const bg = isDark ? '#14161A' : '#F3EFE6';
            const ratio = wcagRatio(hex, bg);
            const pass = parseFloat(ratio) >= 4.5;
            return (
              <div key={s.name} className="space-y-1">
                <div
                  className="h-12 rounded flex items-end p-1.5"
                  style={{ backgroundColor: hex }}
                >
                  <span className="mono text-[10px] font-medium" style={{ color: textColour }}>
                    {hex}
                  </span>
                </div>
                <p className="text-xs font-mono text-[var(--ink)]">{s.name}</p>
                <p className="text-xs text-[var(--ink-muted)] leading-tight">{s.role}</p>
                <p className={`text-xs mono ${pass ? 'text-[var(--ok)]' : 'text-[var(--sev-high)]'}`}>
                  {ratio} {pass ? '✓ AA' : '⚠ fail'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Typography ── */}
      <section aria-labelledby="section-type">
        <h2 id="section-type" className="text-md font-semibold text-[var(--ink)] mb-4">2 · Typography</h2>
        <div className="space-y-6 card p-6">
          {/* Display */}
          <div>
            <p className="text-xs text-[var(--ink-muted)] mb-1 mono">Fraunces Variable (display) · opsz axis · used sparingly</p>
            <p className="font-display text-lg text-[var(--ink)]" style={{ fontOpticalSizing: 'auto' } as React.CSSProperties}>
              Road Condition Intelligence
            </p>
            <p className="font-display text-xl text-[var(--ink)]" style={{ fontOpticalSizing: 'auto' } as React.CSSProperties}>
              11
            </p>
          </div>
          <hr className="road-divider"/>
          {/* UI body */}
          <div>
            <p className="text-xs text-[var(--ink-muted)] mb-1 mono">Instrument Sans (UI / body) · 400 / 500 / 600</p>
            <p className="text-2xl text-[var(--ink)] font-semibold">44px Display number</p>
            <p className="text-lg text-[var(--ink)] font-semibold">28px Section heading</p>
            <p className="text-md text-[var(--ink)]">20px Sub-heading</p>
            <p className="text-base text-[var(--ink)]">16px Body text — the default for all UI copy, labels, and descriptions.</p>
            <p className="text-sm text-[var(--ink-muted)]">14px Secondary text — used for metadata and supporting copy.</p>
            <p className="text-xs text-[var(--ink-muted)]">12px Caption — data labels, timestamps.</p>
          </div>
          <hr className="road-divider"/>
          {/* Mono */}
          <div>
            <p className="text-xs text-[var(--ink-muted)] mb-1 mono">JetBrains Mono (data / IDs) · tabular-nums</p>
            <p className="mono text-base text-[var(--ink)] tabular">11.2755°N 77.5873°E · sha256:a3f9c1d8 · ₹1,25,000</p>
            <p className="mono text-xs text-[var(--ink-muted)] tabular mt-1">MARGA-DEF-00142 · 2026-10-14T08:42:03+05:30 · conf: 0.874</p>
          </div>
        </div>
      </section>

      {/* ── Section 3: Severity stamps ── */}
      <section aria-labelledby="section-stamps">
        <h2 id="section-stamps" className="text-md font-semibold text-[var(--ink)] mb-1">3 · Severity Stamps</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-4">Click a stamp to trigger the stamp-down animation (180 ms scale + rotate settle).</p>
        <div className="flex flex-wrap gap-8 items-start">
          {(['low', 'medium', 'high', 'critical'] as SeverityLevel[]).map((level) => (
            <div key={level} className="flex flex-col items-center gap-3">
              <button
                onClick={() => triggerStamp(level)}
                aria-label={`${level} severity stamp — click to animate`}
                className="focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
              >
                <SeverityStamp level={level} stamped={stampedLevel === level} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`chip chip-${level}`}>
                  <SeverityShape level={level} size={8} />
                  {SEVERITY_LABELS[level]}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-muted)] text-center">
                {level === 'low' ? '0–24' : level === 'medium' ? '25–49' : level === 'high' ? '50–74' : '75–100'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: Buttons ── */}
      <section aria-labelledby="section-buttons">
        <h2 id="section-buttons" className="text-md font-semibold text-[var(--ink)] mb-4">4 · Buttons</h2>
        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button className="btn btn-primary" id="btn-primary-demo">Primary action</button>
            <button className="btn btn-secondary" id="btn-secondary-demo">Secondary action</button>
            <button className="btn btn-tertiary" id="btn-tertiary-demo">Tertiary / link</button>
            <button className="btn btn-danger" id="btn-danger-demo">Danger</button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button className="btn btn-primary" disabled>Primary disabled</button>
            <button className="btn btn-secondary" disabled>Secondary disabled</button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button className="btn btn-primary" id="btn-loading-demo" aria-busy="true">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true"/>
              Processing…
            </button>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">Tab to any button to see the 2 px accent focus ring with offset.</p>
        </div>
      </section>

      {/* ── Section 5: Priority row ── */}
      <section aria-labelledby="section-priority">
        <h2 id="section-priority" className="text-md font-semibold text-[var(--ink)] mb-4">5 · Priority Row</h2>
        <PriorityRow />
      </section>

      {/* ── Section 6: Waterfall chart ── */}
      <section aria-labelledby="section-waterfall">
        <h2 id="section-waterfall" className="text-md font-semibold text-[var(--ink)] mb-1">6 · Waterfall "Why this score"</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-4">Direct labels, no legend. Each bar is one risk component contribution.</p>
        <div className="card p-6 max-w-xl">
          <WaterfallChart />
        </div>
      </section>

      {/* ── Section 7: Map markers ── */}
      <section aria-labelledby="section-markers">
        <h2 id="section-markers" className="text-md font-semibold text-[var(--ink)] mb-4">7 · Map Markers</h2>
        <div className="card p-6">
          <MapMarkers />
          <p className="text-xs text-[var(--ink-muted)] mt-4">
            Each severity uses a distinct shape (●◆▲⬢) — colour-blind safe with redundant shape encoding.
            Critical markers pulse. Recurring hotspots show a dashed ring.
          </p>
        </div>
      </section>

      {/* ── Section 8: Form elements ── */}
      <section aria-labelledby="section-forms">
        <h2 id="section-forms" className="text-md font-semibold text-[var(--ink)] mb-4">8 · Form Elements</h2>
        <div className="card p-6 max-w-md space-y-4">
          <div>
            <label htmlFor="demo-input" className="text-xs font-semibold text-[var(--ink)] block mb-1">Road segment name</label>
            <input id="demo-input" className="input" placeholder="e.g. Perundurai Main Road" />
          </div>
          <div>
            <label htmlFor="demo-select" className="text-xs font-semibold text-[var(--ink)] block mb-1">Defect class</label>
            <select id="demo-select" className="input">
              <option>Pothole</option>
              <option>Longitudinal Crack</option>
              <option>Transverse Crack</option>
              <option>Surface Damage</option>
              <option>Water Accumulation (Experimental)</option>
            </select>
          </div>
          <div>
            <label htmlFor="demo-textarea" className="text-xs font-semibold text-[var(--ink)] block mb-1">Reviewer note</label>
            <textarea id="demo-textarea" className="input" rows={3} placeholder="Add a note for the record…"/>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="demo-checkbox" className="accent-[var(--accent)] w-4 h-4" defaultChecked />
            <label htmlFor="demo-checkbox" className="text-sm text-[var(--ink)]">Include in PDF report</label>
          </div>
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked="true"
              id="demo-toggle"
              className="relative inline-flex w-10 h-5 rounded-full border border-[var(--rule)] bg-[var(--accent)] transition-colors"
              aria-label="Sliced inference toggle"
            >
              <span className="absolute top-0.5 left-5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"/>
            </button>
            <label htmlFor="demo-toggle" className="text-sm text-[var(--ink)]">Sliced inference (high-res photos)</label>
          </div>
        </div>
      </section>

      {/* ── Section 9: Evidence frame ── */}
      <section aria-labelledby="section-evidence">
        <h2 id="section-evidence" className="text-md font-semibold text-[var(--ink)] mb-4">9 · Evidence Image Frame</h2>
        <div className="flex flex-wrap gap-8 items-start">
          <EvidenceFrame />
          <div className="text-sm text-[var(--ink-muted)] max-w-xs space-y-2">
            <p>Survey-photo framing: 1 px border, mono caption bar with coordinates + timestamp + hash prefix.</p>
            <p>Taped-corner motif on the detail view. "Sealed" SHA-256 indicator in the top right.</p>
            <p className="mono text-xs text-[var(--ink-muted)]">sha256:a3f9c1d8…</p>
          </div>
        </div>
      </section>

      {/* ── Section 10: Motion demos ── */}
      <section aria-labelledby="section-motion">
        <h2 id="section-motion" className="text-md font-semibold text-[var(--ink)] mb-1">10 · Motion & Progress</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-4">All animations respect <code className="mono text-xs">prefers-reduced-motion</code>.</p>
        <div className="card p-6 space-y-6">
          {/* Stamp-down demo */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-2">Stamp-down (180 ms)</p>
            <div className="flex gap-4">
              {(['low', 'medium', 'high', 'critical'] as SeverityLevel[]).map((l) => (
                <button
                  key={l}
                  onClick={() => triggerStamp(l)}
                  className="focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
                  aria-label={`Trigger ${l} stamp animation`}
                >
                  <SeverityStamp level={l} stamped={stampedLevel === l} />
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar road-dash */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-2">Processing progress — road-dash animation</p>
            <div className="space-y-2">
              <p className="text-xs text-[var(--ink-muted)]">Extracting frames… 212 / 480</p>
              <div className="progress-road w-full" role="progressbar" aria-valuenow={44} aria-valuemin={0} aria-valuemax={100} aria-label="Processing progress 44%"/>
              <p className="text-xs text-[var(--ink-muted)]">Kept 212 of 480 frames, 31 blurry, 9 too dark</p>
            </div>
          </div>

          {/* FLIP note */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-1">FLIP list reorder (Phase 4)</p>
            <p className="text-xs text-[var(--ink-muted)]">
              When the what-if risk weights change, the priority queue rows animate into their new positions
              using Framer Motion layout transitions. This is the "wow moment" wired in Phase 4/5.
            </p>
          </div>

          {/* Demo badges in context */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-2">System state badges</p>
            <div className="flex flex-wrap gap-2">
              <span className="badge-demo badge-demo-data">DEMO DATA</span>
              <span className="badge-demo badge-demo-detector">DEMO DETECTOR</span>
              <span className="badge-demo badge-experimental">EXPERIMENTAL</span>
              <span className="chip chip-low"><SeverityShape level="low" size={8}/>Low</span>
              <span className="chip chip-medium"><SeverityShape level="medium" size={8}/>Medium</span>
              <span className="chip chip-high"><SeverityShape level="high" size={8}/>High</span>
              <span className="chip chip-critical"><SeverityShape level="critical" size={8}/>Critical</span>
            </div>
          </div>

          {/* Semantic icons */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] mb-2">Semantic icons (Phosphor)</p>
            <div className="flex gap-4 items-center flex-wrap">
              <span className="flex items-center gap-1 text-sm text-[var(--ok)]"><CheckCircle size={16} weight="fill"/> Verified</span>
              <span className="flex items-center gap-1 text-sm text-[var(--error)]"><XCircle size={16} weight="fill"/> Rejected</span>
              <span className="flex items-center gap-1 text-sm text-[var(--warning)]"><Warning size={16} weight="fill"/> Needs review</span>
              <span className="flex items-center gap-1 text-sm text-[var(--info)]"><Info size={16} weight="fill"/> Informational</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--rule)] pt-6 text-center">
        <p className="text-xs text-[var(--ink-muted)] survey-plate">
          Marga · Phase 0 · Design System · Team DeepMinds · Kongu Engineering College · Hackatronics 2026
        </p>
      </footer>
    </div>
  );
}
