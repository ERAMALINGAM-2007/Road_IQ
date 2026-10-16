import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Checks,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
} from 'phosphor-react';
import { fetchDefects, reviewDefect, DefectItem } from '@/lib/api';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';

export function ReviewPage() {
  const queryClient = useQueryClient();
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [newClass, setNewClass] = useState('pothole');
  const [comment, setComment] = useState('');

  const { data: defects = [] } = useQuery({
    queryKey: ['defects'],
    queryFn: () => fetchDefects(),
  });

  // Filter unreviewed or review candidates
  const unreviewedDefects = defects.filter((d) => d.review_status === 'unreviewed' || d.status === 'detected');
  const activeDefect = selectedDefect || unreviewedDefects[0] || null;

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, nClass, cmt }: { id: number; action: 'approve' | 'reject' | 'reclassify'; nClass?: string; cmt?: string }) =>
      reviewDefect(id, action, nClass, cmt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      setComment('');
      if (unreviewedDefects.length > 1) {
        setSelectedDefect(unreviewedDefects.find((d) => d.id !== activeDefect?.id) || null);
      }
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--rule)] pb-4 flex items-center justify-between">
        <div>
          <span className="survey-plate text-xs text-[var(--ink-muted)]">
            HUMAN-IN-THE-LOOP AUDIT QUEUE · VERIFICATION
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
            Defect Verification & Audit Queue
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
            Validate AI detections, adjust boundary classifications, and approve work order dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded bg-[rgba(200,74,8,0.1)] text-[var(--accent)] font-bold border border-[var(--accent)]">
            {unreviewedDefects.length} Pending Verification
          </span>
        </div>
      </div>

      {unreviewedDefects.length === 0 ? (
        <div className="card p-12 text-center text-xs font-mono text-[var(--ink-muted)] space-y-2">
          <Checks size={32} className="mx-auto text-[var(--ok)]" />
          <p className="text-sm font-semibold text-[var(--ink)]">All road defects have been reviewed!</p>
          <p>Great job! Every current inspection finding has been verified or audited.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5/12): Unreviewed Queue */}
          <div className="lg:col-span-5 space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {unreviewedDefects.map((d) => {
              const isSelected = activeDefect?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDefect(d)}
                  className={`card p-3 cursor-pointer transition-all border ${
                    isSelected ? 'border-[var(--accent)] bg-[var(--surface)] shadow-md' : 'border-[var(--rule)] hover:border-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[var(--paper)] border border-[var(--rule)] overflow-hidden shrink-0 flex items-center justify-center relative">
                      {d.thumbnail_url ? (
                        <img
                          src={d.thumbnail_url}
                          alt={d.class_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.review-thumb-fallback');
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`review-thumb-fallback w-full h-full flex flex-col items-center justify-center bg-[var(--paper)] ${d.thumbnail_url ? 'hidden' : 'flex'}`}>
                        <span className="text-[10px] font-mono font-bold text-[var(--ink-muted)] uppercase">
                          {d.class_name.slice(0, 4)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--ink)] truncate">
                          {d.class_name.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`chip chip-${d.severity_band}`}>
                          {SEVERITY_LABELS[d.severity_band as SeverityLevel]}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--ink-muted)] font-mono truncate mt-0.5">
                        DEF-{String(d.id).padStart(4, '0')} · Risk {d.risk_score.toFixed(1)} · Area: {d.est_area_m2.toFixed(2)} m²
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column (7/12): Verification Panel */}
          {activeDefect && (
            <div className="lg:col-span-7 space-y-4">
              {/* Evidence Photo Frame */}
              <div className="card overflow-hidden border border-[var(--rule)]">
                <div className="relative aspect-video bg-[#1B1A17] flex items-center justify-center">
                  {activeDefect.thumbnail_url ? (
                    <img src={activeDefect.thumbnail_url} alt={activeDefect.class_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[var(--marking)] font-mono text-xs">[EVIDENCE CAMERA FEED]</div>
                  )}

                  {/* Bounding box */}
                  <div className="absolute inset-x-16 inset-y-10 border-2 border-[var(--accent)] rounded-sm pointer-events-none">
                    <span className="absolute -top-3.5 left-2 bg-[var(--accent)] text-white text-[10px] font-mono px-1.5 py-0.2 rounded">
                      AI PROPOSAL: {activeDefect.class_name.toUpperCase()} ({(activeDefect.est_area_m2).toFixed(2)} m²)
                    </span>
                  </div>
                </div>

                {/* Survey Plate */}
                <div className="p-3 bg-[var(--surface)] border-t border-[var(--rule)] flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
                  <span>DEF-{String(activeDefect.id).padStart(4, '0')}</span>
                  <span>{activeDefect.lat.toFixed(5)}°N, {activeDefect.lon.toFixed(5)}°E</span>
                  <span className="text-[var(--ink)] font-semibold">Risk: {activeDefect.risk_score.toFixed(1)}/100</span>
                </div>
              </div>

              {/* System Reasoning */}
              {activeDefect.explanation && (
                <div className="card p-3 text-xs bg-[var(--surface)] space-y-1">
                  <div className="font-mono text-[10px] text-[var(--ink-muted)] uppercase">System Proposal Reasoning</div>
                  <p className="text-[var(--ink)] leading-relaxed">"{activeDefect.explanation}"</p>
                </div>
              )}

              {/* Review Controls Card */}
              <div className="card p-4 space-y-3 bg-[var(--surface)]">
                <h3 className="text-xs font-mono uppercase font-bold text-[var(--ink)]">
                  Engineer Decision Panel
                </h3>

                <div>
                  <label className="text-xs font-mono text-[var(--ink-muted)] block mb-1">
                    Taxonomy Reclassification (If AI misclassified):
                  </label>
                  <select
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full text-xs font-mono p-2 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
                  >
                    <option value="pothole">Pothole (D40) — Depression / cavity</option>
                    <option value="longitudinal_crack">Longitudinal Crack (D00) — Parallel to travel</option>
                    <option value="transverse_crack">Transverse Crack (D10) — Perpendicular across lane</option>
                    <option value="surface_damage">Surface Damage (D20) — Alligator / peeling</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-[var(--ink-muted)] block mb-1">
                    Verification Audit Note:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter observation rationale or crew instructions..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    onClick={() => reviewMutation.mutate({ id: activeDefect.id, action: 'approve', cmt: comment })}
                    disabled={reviewMutation.isPending}
                    className="btn btn-primary text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle size={16} /> Confirm & Approve
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ id: activeDefect.id, action: 'reclassify', nClass: newClass, cmt: comment })}
                    disabled={reviewMutation.isPending}
                    className="btn btn-secondary text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <ArrowsClockwise size={16} /> Apply Reclassification
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ id: activeDefect.id, action: 'reject', cmt: comment })}
                    disabled={reviewMutation.isPending}
                    className="btn btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 text-[var(--error)] border-[var(--error)] hover:bg-[rgba(179,32,42,0.08)]"
                  >
                    <XCircle size={16} /> Reject (False Positive)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
