import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Warning,
  Printer,
  FileText,
  MagnifyingGlass,
  ArrowSquareOut,
  Gauge,
  NavigationArrow,
} from 'phosphor-react';
import { fetchSegments } from '@/lib/api';

const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'rgba(47, 125, 91, 0.15)', text: 'var(--success)', label: 'Good (RHI ≥ 85)' },
  B: { bg: 'rgba(47, 125, 91, 0.08)', text: 'var(--success)', label: 'Satisfactory (70–84)' },
  C: { bg: 'rgba(196, 125, 34, 0.15)', text: 'var(--warning)', label: 'Fair / Monitor (55–69)' },
  D: { bg: 'rgba(196, 74, 34, 0.15)', text: 'var(--sev-high)', label: 'Poor / Action Req (40–54)' },
  F: { bg: 'rgba(179, 32, 42, 0.15)', text: 'var(--sev-critical)', label: 'Critical Failure (< 40)' },
};

export function SegmentsPage() {
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: fetchSegments,
  });

  const filteredSegments = useMemo(() => {
    return segments.filter((s) => {
      if (filterClass !== 'all' && s.highway_class !== filterClass) return false;
      if (filterGrade !== 'all' && s.rhi_grade !== filterGrade) return false;
      if (search && !s.road_name.toLowerCase().includes(search.toLowerCase()) && !s.osm_way_id.includes(search)) {
        return false;
      }
      return true;
    });
  }, [segments, filterClass, filterGrade, search]);

  // Aggregate metrics
  const totalLengthKm = segments.reduce((acc, s) => acc + s.length_m, 0) / 1000;
  const meanRHI = segments.length
    ? segments.reduce((acc, s) => acc + s.rhi_score, 0) / segments.length
    : 0;
  const totalDefects = segments.reduce((acc, s) => acc + s.defect_count, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--rule)] pb-4">
        <div>
          <span className="survey-plate text-xs text-[var(--ink-muted)]">
            ROAD HEALTH INDEX (RHI) · CORRIDOR INTEGRITY AUDIT
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
            Road Segments & Health Index
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
            Corridor-level RHI scoring (0–100) combining defect density, road class, and speed vulnerability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            title="Print or save as PDF municipal report"
          >
            <Printer size={15} />
            Print Audit Report
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
            <span>Surveyed Network</span>
            <NavigationArrow size={16} className="text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[var(--ink)]">
            {totalLengthKm.toFixed(1)} <span className="text-xs font-normal">km</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--ink-muted)]">{segments.length} surveyed segments</div>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
            <span>Average RHI</span>
            <ShieldCheck size={16} className="text-[var(--success)]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[var(--ink)]">
            {meanRHI.toFixed(1)} <span className="text-xs font-normal">/ 100</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--ink-muted)]">Overall network rating: Grade B</div>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
            <span>Total Active Defects</span>
            <Warning size={16} className="text-[var(--warning)]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[var(--ink)]">
            {totalDefects}
          </div>
          <div className="text-[10px] font-mono text-[var(--ink-muted)]">Across surveyed corridors</div>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
            <span>Standard Speed</span>
            <Gauge size={16} className="text-[var(--info)]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[var(--ink)]">
            60–80 <span className="text-xs font-normal">km/h</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--ink-muted)]">Design corridor velocity</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--surface)] p-3 rounded border border-[var(--rule)]">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-2.5 top-2.5 text-[var(--ink-muted)]" />
          <input
            type="text"
            placeholder="Search road name or OSM Way ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-[var(--accent)] font-mono"
          />
        </div>

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All Road Classes</option>
          <option value="trunk">Trunk (National Highway)</option>
          <option value="primary">Primary (State Highway)</option>
          <option value="secondary">Secondary (Major District)</option>
          <option value="tertiary">Tertiary (Township)</option>
        </select>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="all">All RHI Grades</option>
          <option value="A">Grade A (≥ 85)</option>
          <option value="B">Grade B (70–84)</option>
          <option value="C">Grade C (55–69)</option>
          <option value="D">Grade D (40–54)</option>
          <option value="F">Grade F (&lt; 40)</option>
        </select>
      </div>

      {/* Segments Table */}
      {isLoading ? (
        <div className="card p-12 text-center text-xs font-mono text-[var(--ink-muted)]">
          Loading road segment inventory...
        </div>
      ) : filteredSegments.length === 0 ? (
        <div className="card p-12 text-center text-xs font-mono text-[var(--ink-muted)]">
          No road segments matched the selected filters.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--rule)] bg-[var(--paper-wash)] text-[var(--ink-muted)] font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Road Name / Corridor</th>
                  <th className="py-2.5 px-3">OSM Way ID</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Length</th>
                  <th className="py-2.5 px-3">Speed Limit</th>
                  <th className="py-2.5 px-3">Defects</th>
                  <th className="py-2.5 px-3">RHI Score</th>
                  <th className="py-2.5 px-4 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rule)]">
                {filteredSegments.map((seg) => {
                  const gradeStyle = GRADE_COLORS[seg.rhi_grade] || GRADE_COLORS.C;
                  return (
                    <tr key={seg.id} className="hover:bg-[var(--paper-wash)] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--ink)]">{seg.road_name}</div>
                        <div className="text-[10px] font-mono text-[var(--ink-muted)]">
                          Perundurai Maintenance Section
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--ink-muted)]">
                        <span className="flex items-center gap-1 hover:text-[var(--accent)] cursor-pointer">
                          {seg.osm_way_id}
                          <ArrowSquareOut size={11} />
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--rule)]">
                          {seg.highway_class}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--ink)]">
                        {(seg.length_m / 1000).toFixed(2)} km
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--ink-muted)]">
                        {seg.speed_limit_kmh} km/h
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="font-bold text-[var(--ink)]">{seg.defect_count}</span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--ink)]">{seg.rhi_score.toFixed(1)}</span>
                          <div className="w-16 bg-[var(--paper)] h-1.5 rounded-full overflow-hidden border border-[var(--rule)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${seg.rhi_score}%`,
                                backgroundColor: gradeStyle.text,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="font-mono font-bold text-xs px-2.5 py-1 rounded inline-block"
                          style={{
                            backgroundColor: gradeStyle.bg,
                            color: gradeStyle.text,
                            border: `1px solid ${gradeStyle.text}`,
                          }}
                        >
                          Grade {seg.rhi_grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RHI Formula & Standards Explainability */}
      <div className="card p-4 space-y-2 border border-[var(--rule)] bg-[var(--paper-wash)]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--ink)]">
          <FileText size={16} className="text-[var(--accent)]" />
          <span>IRC / ASTM Road Health Index Formulation</span>
        </div>
        <p className="text-[11px] font-mono text-[var(--ink-muted)] leading-relaxed">
          RHI = 100 - min(100, &Sigma; penalty / L). Penalties are weighted by defect severity band (Critical: 15 pts, High: 8 pts, Medium: 4 pts, Low: 1 pt) normalized per kilometer (L). Segments below 40 are flagged for immediate resurfacing intervention.
        </p>
      </div>
    </div>
  );
}
