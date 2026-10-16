import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Warning,
  Drop,
  ArrowRight,
  ShieldCheck,
  TrendUp,
  ListBullets,
  Camera,
} from 'phosphor-react';
import { fetchDefects, fetchSurveys, fetchSegments } from '@/lib/api';
import { DefectDrawer } from '@/components/defect/DefectDrawer';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';

export function BriefingPage() {
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);

  const { data: defects = [], isLoading: defectsLoading } = useQuery({
    queryKey: ['defects'],
    queryFn: () => fetchDefects(),
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => fetchSurveys(),
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: () => fetchSegments(),
  });

  const criticalDefects = defects.filter((d) => d.severity_band === 'critical');
  const waterloggedDefects = defects.filter((d) => d.is_waterlogged);
  const topPriorities = [...defects].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--rule)] pb-4">
        <div>
          <span className="survey-plate text-xs text-[var(--ink-muted)]">
            MUNICIPAL HIGHWAY BRIEFING · SDG 11
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
            Perundurai Road Network Condition Intelligence
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
            Erode District, Tamil Nadu · Covering NH-544, SH-96, and KEC Arterial Corridors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/scan" className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm">
            <Camera size={16} /> New Inspection Scan
          </Link>
          <Link to="/queue" className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <ListBullets size={16} /> Priority Queue
          </Link>
        </div>
      </div>

      {/* Weather & Hazard Advisory Banner */}
      <div className="p-4 rounded border border-[var(--info)] bg-[rgba(43,102,147,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-[var(--info)] text-white mt-0.5 md:mt-0">
            <Drop size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--info)] flex items-center gap-2">
              <span>Antecedent Precipitation Advisory (Open-Meteo Telemetry)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[var(--info)] text-white rounded">
                18.5 mm / 72h
              </span>
            </div>
            <p className="text-xs text-[var(--ink)] mt-0.5">
              Rainfall in the Perundurai basin has induced standing water in <strong>{waterloggedDefects.length} potholes</strong>. Visual depth estimates may be obscured. Drive with caution on NH-544 bypass.
            </p>
          </div>
        </div>
        <Link to="/map" className="text-xs font-mono font-medium text-[var(--info)] hover:underline flex items-center gap-1 shrink-0">
          View Wet Road Map <ArrowRight size={14} />
        </Link>
      </div>

      {/* Executive KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Network RHI */}
        <div className="card p-4">
          <span className="text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">
            Network Health Index (RHI)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-3xl font-bold text-[var(--ink)]">78.2</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded font-semibold bg-[rgba(47,125,91,0.12)] text-[var(--ok)]">
              Grade B (Good)
            </span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] mt-1.5 flex items-center gap-1">
            <TrendUp size={14} className="text-[var(--ok)]" /> Stable across 4 corridors
          </p>
        </div>

        {/* KPI 2: Total Tracked Defects */}
        <div className="card p-4">
          <span className="text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">
            Tracked Defects (De-duplicated)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-3xl font-bold text-[var(--ink)]">
              {defectsLoading ? '...' : defects.length}
            </span>
            <span className="text-xs text-[var(--ink-muted)] font-mono">entities</span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] mt-1.5">
            Consolidated from 3 survey passes
          </p>
        </div>

        {/* KPI 3: Critical Hazards */}
        <div className="card p-4 border-l-4 border-l-[var(--sev-critical)]">
          <span className="text-[11px] font-mono text-[var(--sev-critical)] uppercase tracking-wider font-semibold">
            Critical Hazards (S ≥ 75)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-3xl font-bold text-[var(--sev-critical)]">
              {criticalDefects.length}
            </span>
            <span className="text-xs font-mono text-[var(--sev-critical)] font-medium">Urgent</span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] mt-1.5 flex items-center gap-1">
            <Warning size={14} className="text-[var(--sev-critical)]" /> Immediate repair within 7 days
          </p>
        </div>

        {/* KPI 4: Active Work Orders */}
        <div className="card p-4">
          <span className="text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">
            Scheduled Work Orders
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-3xl font-bold text-[var(--ink)]">
              {defects.filter((d) => d.status === 'scheduled' || d.status === 'in_progress').length}
            </span>
            <span className="text-xs text-[var(--ink-muted)] font-mono">active</span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] mt-1.5 flex items-center gap-1">
            <ShieldCheck size={14} className="text-[var(--ok)]" /> Assigned to Crew Alpha
          </p>
        </div>
      </div>

      {/* Main Content: Urgent Priorities & Corridor Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Urgent Maintenance Priorities */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              Highest Risk Maintenance Priorities
            </h2>
            <Link to="/queue" className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1">
              View All Ranked ({defects.length}) <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-2">
            {topPriorities.map((defect, idx) => (
              <div
                key={defect.id}
                onClick={() => setSelectedDefectId(defect.id)}
                className="priority-row card p-3 hover:border-[var(--ink)] transition-all cursor-pointer flex items-center gap-3"
              >
                {/* Rank # */}
                <span className="font-mono text-xs font-bold w-6 text-center text-[var(--ink-muted)]">
                  #{idx + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-12 h-12 rounded bg-[var(--surface)] border border-[var(--rule)] overflow-hidden shrink-0 flex items-center justify-center relative">
                  {defect.thumbnail_url ? (
                    <img
                      src={defect.thumbnail_url}
                      alt={defect.class_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.thumb-fallback');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`thumb-fallback w-full h-full flex flex-col items-center justify-center bg-[var(--paper)] ${defect.thumbnail_url ? 'hidden' : 'flex'}`}>
                    <span className="text-[10px] font-mono font-bold text-[var(--ink-muted)] uppercase">
                      {defect.class_name.slice(0, 4)}
                    </span>
                  </div>
                </div>

                {/* Defect info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--ink)] truncate">
                      {defect.class_name.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`chip chip-${defect.severity_band}`}>
                      {SEVERITY_LABELS[defect.severity_band as SeverityLevel]}
                    </span>
                    {defect.is_waterlogged && (
                      <span className="text-[10px] font-mono text-[var(--info)] border border-[var(--info)] px-1 rounded">
                        WET
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] font-mono truncate mt-0.5">
                    Est. {defect.est_area_m2.toFixed(2)} m² · Observed {defect.observation_count}x · NH-544 Bypass
                  </p>
                </div>

                {/* Risk score bar */}
                <div className="w-28 text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-[var(--accent)]">
                    Risk {defect.risk_score.toFixed(1)}
                  </div>
                  <div className="w-full bg-[var(--paper)] h-1.5 rounded-full overflow-hidden border border-[var(--rule)] mt-1">
                    <div className="bg-[var(--accent)] h-full" style={{ width: `${defect.risk_score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1/3): Corridors & Surveys */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            Corridor Health (RHI)
          </h2>

          <div className="card p-4 space-y-3">
            {segments.map((seg) => (
              <div key={seg.id} className="border-b border-[var(--rule)] last:border-b-0 pb-2.5 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--ink)] truncate max-w-[180px]">
                    {seg.road_name}
                  </span>
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                    seg.rhi_grade === 'A' ? 'bg-[rgba(47,125,91,0.12)] text-[var(--ok)]' :
                    seg.rhi_grade === 'B' ? 'bg-[rgba(47,125,91,0.08)] text-[var(--ok)]' :
                    seg.rhi_grade === 'C' ? 'bg-[rgba(217,162,27,0.12)] text-[var(--warning)]' :
                    'bg-[rgba(179,32,42,0.12)] text-[var(--error)]'
                  }`}>
                    {seg.rhi_score} ({seg.rhi_grade})
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] font-mono mt-1">
                  <span>{seg.highway_class.toUpperCase()} · {seg.speed_limit_kmh} km/h</span>
                  <span>{seg.defect_count} defects</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Inspection Surveys */}
          <h2 className="font-display text-lg font-semibold text-[var(--ink)] pt-2">
            Inspection Passes
          </h2>
          <div className="card p-4 flex flex-col gap-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="flex items-center justify-between text-xs font-mono py-1 border-b border-[var(--rule)] last:border-b-0">
                <div className="leading-snug">
                  <div className="font-semibold text-[var(--ink)]">{survey.name}</div>
                  <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">{survey.survey_date}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--rule)] text-[10px] text-[var(--ok)] font-bold shrink-0">
                  ✓ COMPLETED
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Defect Detail Drawer */}
      <DefectDrawer
        defectId={selectedDefectId}
        onClose={() => setSelectedDefectId(null)}
      />
    </div>
  );
}
