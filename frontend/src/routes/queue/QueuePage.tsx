import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlass,
  Drop,
  ArrowRight,
  Sliders,
  FileCsv,
  GlobeHemisphereWest,
} from 'phosphor-react';
import { fetchDefects, type DefectItem } from '@/lib/api';
import { DefectDrawer } from '@/components/defect/DefectDrawer';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';
import { WhatIfPanel } from '@/components/whatif/WhatIfPanel';
import { exportDefectsCSV, exportDefectsGeoJSON } from '@/lib/export';


export function QueuePage() {
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyWaterlogged, setOnlyWaterlogged] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfDefects, setWhatIfDefects] = useState<DefectItem[] | null>(null);

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['defects'],
    queryFn: () => fetchDefects(),
  });

  // Use What-If overridden defects if available
  const activeDefects = whatIfDefects || defects;
  const isWhatIfActive = whatIfDefects !== null;

  const filteredDefects = useMemo(() => {
    return activeDefects
      .filter((d) => {
        if (severityFilter !== 'all' && d.severity_band !== severityFilter) return false;
        if (classFilter !== 'all' && d.class_name !== classFilter) return false;
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (onlyWaterlogged && !d.is_waterlogged) return false;
        if (search) {
          const query = search.toLowerCase();
          const matchClass = d.class_name.toLowerCase().includes(query);
          const matchId = `def-${d.id}`.includes(query);
          if (!matchClass && !matchId) return false;
        }
        return true;
      })
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [activeDefects, severityFilter, classFilter, statusFilter, onlyWaterlogged, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--rule)] pb-4">
        <div>
          <span className="survey-plate text-xs text-[var(--ink-muted)]">
            DECISION ENGINE · RANKED MAINTENANCE SCHEDULE
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
            Priority Repair Queue
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
            Ranked by multi-factor Risk Score (Severity + Road Exposure + Pedestrian Vulnerability + Weather)
          </p>
        </div>

        {/* Actions & Stats */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 border-r border-[var(--rule)] pr-2.5">
            <button
              onClick={() => exportDefectsCSV(filteredDefects)}
              className="btn btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-2.5"
              title="Export filtered defects as CSV spreadsheet"
            >
              <FileCsv size={14} className="text-[var(--accent)]" />
              Export CSV
            </button>
            <button
              onClick={() => exportDefectsGeoJSON(filteredDefects)}
              className="btn btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-2.5"
              title="Export filtered defects as GeoJSON FeatureCollection for GIS"
            >
              <GlobeHemisphereWest size={14} className="text-[var(--info)]" />
              GeoJSON
            </button>
          </div>

          <div className="px-3 py-1.5 rounded bg-[var(--surface)] border border-[var(--rule)]">
            Total: <strong className="text-[var(--ink)]">{filteredDefects.length}</strong> / {defects.length}
          </div>
          <div className="px-3 py-1.5 rounded bg-[rgba(179,32,42,0.08)] border border-[var(--sev-critical)] text-[var(--sev-critical)] font-bold">
            Critical: {filteredDefects.filter((d) => d.severity_band === 'critical').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--surface)] p-3 rounded border border-[var(--rule)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-2.5 top-2.5 text-[var(--ink-muted)]" />
          <input
            type="text"
            placeholder="Search by defect ID or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-[var(--accent)] font-mono"
          />
        </div>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical (S ≥ 75)</option>
          <option value="high">High (S ≥ 50)</option>
          <option value="medium">Medium (S ≥ 25)</option>
          <option value="low">Low (S &lt; 25)</option>
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All Classes</option>
          <option value="pothole">Potholes</option>
          <option value="longitudinal_crack">Longitudinal Cracks</option>
          <option value="transverse_crack">Transverse Cracks</option>
          <option value="surface_damage">Surface Damage</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All Lifecycle States</option>
          <option value="detected">Detected</option>
          <option value="verified">Verified</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="repaired">Repaired</option>
        </select>

        {/* Waterlogged toggle */}
        <button
          onClick={() => setOnlyWaterlogged(!onlyWaterlogged)}
          className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 border transition-all ${
            onlyWaterlogged
              ? 'bg-[var(--info)] text-white border-[var(--info)]'
              : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          <Drop size={14} /> Only Standing Water
        </button>
      </div>

      {/* Priority Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[var(--ink-muted)]">
          Loading priority queue...
        </div>
      ) : filteredDefects.length === 0 ? (
        <div className="card p-12 text-center text-xs font-mono text-[var(--ink-muted)]">
          No road defects matched the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDefects.map((defect, idx) => (
            <div
              key={defect.id}
              onClick={() => setSelectedDefectId(defect.id)}
              className="priority-row card p-3.5 hover:border-[var(--ink)] transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {/* Rank Pill */}
                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-mono text-xs font-bold ${
                  idx < 5 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--rule)]'
                }`}>
                  #{idx + 1}
                </div>

                {/* Thumbnail crop */}
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
                          const fallback = parent.querySelector('.queue-thumb-fallback');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`queue-thumb-fallback w-full h-full flex flex-col items-center justify-center bg-[var(--paper)] ${defect.thumbnail_url ? 'hidden' : 'flex'}`}>
                    <span className="text-[10px] font-mono font-bold text-[var(--ink-muted)] uppercase">
                      {defect.class_name.slice(0, 4)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--ink-muted)]">
                      DEF-{String(defect.id).padStart(4, '0')}
                    </span>
                    <span className="text-xs font-bold text-[var(--ink)]">
                      {defect.class_name.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`chip chip-${defect.severity_band}`}>
                      {SEVERITY_LABELS[defect.severity_band as SeverityLevel]}
                    </span>
                    {defect.is_waterlogged && (
                      <span className="text-[10px] font-mono text-[var(--info)] border border-[var(--info)] px-1 rounded flex items-center gap-0.5">
                        <Drop size={10} /> WATERLOGGED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[var(--ink-muted)] mt-1">
                    Area: {defect.est_area_m2.toFixed(2)} m² · Observed: {defect.observation_count}x · NH-544 Salem-Kochi Highway ({defect.lat.toFixed(4)}°N, {defect.lon.toFixed(4)}°E)
                  </p>
                </div>
              </div>

              {/* Status and Risk Score */}
              <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pl-11 md:pl-0">
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  defect.status === 'verified' ? 'text-[var(--ok)] border-[var(--ok)] bg-[rgba(47,125,91,0.08)]' :
                  defect.status === 'scheduled' ? 'text-[var(--warning)] border-[var(--warning)] bg-[rgba(217,162,27,0.08)]' :
                  'text-[var(--ink-muted)] border-[var(--rule)]'
                }`}>
                  {defect.status}
                </span>

                <div className="w-32 text-right">
                  <div className="text-xs font-mono font-bold text-[var(--accent)]">
                    Risk {defect.risk_score.toFixed(1)} / 100
                  </div>
                  <div className="w-full bg-[var(--paper)] h-2 rounded-full overflow-hidden border border-[var(--rule)] mt-1">
                    <div className="bg-[var(--accent)] h-full" style={{ width: `${defect.risk_score}%` }} />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDefectId(defect.id);
                  }}
                  className="btn btn-secondary text-xs py-1 px-2.5 hidden sm:inline-flex items-center gap-1"
                >
                  Inspect <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Defect Detail Drawer */}
      <DefectDrawer
        defectId={selectedDefectId}
        onClose={() => setSelectedDefectId(null)}
      />

      {/* What-If Active Indicator */}
      {isWhatIfActive && (
        <div className="fixed top-[calc(var(--top-strip-height)+8px)] right-[400px] z-40 px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
          <Sliders size={12} weight="bold" />
          WHAT-IF MODE ACTIVE
          <button
            onClick={() => setWhatIfDefects(null)}
            className="ml-1 underline hover:no-underline"
          >
            Reset
          </button>
        </div>
      )}

      {/* What-If Panel */}
      <WhatIfPanel
        defects={defects}
        onReranked={(reranked) => setWhatIfDefects(reranked)}
        isOpen={whatIfOpen}
        onToggle={() => setWhatIfOpen(!whatIfOpen)}
      />
    </div>
  );
}
