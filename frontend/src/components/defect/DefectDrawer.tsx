import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  MapPin,
  Warning,
  Drop,
  CalendarBlank,
  Gauge,
} from 'phosphor-react';
import { fetchDefectById, reviewDefect } from '@/lib/api';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';

interface DefectDrawerProps {
  defectId: number | null;
  onClose: () => void;
}

export function DefectDrawer({ defectId, onClose }: DefectDrawerProps) {
  const queryClient = useQueryClient();
  const [reclassifying, setReclassifying] = useState(false);
  const [newClass, setNewClass] = useState('pothole');
  const [comment, setComment] = useState('');

  const { data: defect, isLoading } = useQuery({
    queryKey: ['defect', defectId],
    queryFn: () => (defectId ? fetchDefectById(defectId) : null),
    enabled: !!defectId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, nextClass, cmt }: { action: 'approve' | 'reject' | 'reclassify'; nextClass?: string; cmt?: string }) =>
      reviewDefect(defect!.id, action, nextClass, cmt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      queryClient.invalidateQueries({ queryKey: ['defect', defectId] });
      setReclassifying(false);
    },
  });

  if (!defectId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black"
        />

        {/* Drawer panel */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-xl bg-[var(--paper)] border-l border-[var(--rule)] shadow-lg h-full overflow-y-auto flex flex-col z-10"
        >
          {/* Top Bar */}
          <header className="p-4 border-b border-[var(--rule)] flex items-center justify-between sticky top-0 bg-[var(--paper)] z-10">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--rule)]">
                DEF-{String(defectId).padStart(4, '0')}
              </span>
              <span className="text-xs text-[var(--ink-muted)] flex items-center gap-1">
                <MapPin size={14} /> NH-544 (Perundurai Bypass)
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
              aria-label="Close defect details"
            >
              <X size={20} />
            </button>
          </header>

          {isLoading || !defect ? (
            <div className="p-8 text-center text-[var(--ink-muted)] font-mono text-xs">
              Loading defect evidence...
            </div>
          ) : (
            <div className="p-5 space-y-6 flex-1">
              {/* Evidence Frame with Survey Plate */}
              <section className="evidence-frame rounded overflow-hidden border border-[var(--rule)] shadow-sm bg-[var(--surface)]">
                <div className="relative aspect-video bg-[#1B1A17] flex items-center justify-center overflow-hidden">
                  {/* Photo or thumbnail representation */}
                  {defect.thumbnail_url ? (
                    <img
                      src={defect.thumbnail_url}
                      alt={defect.class_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2B2D2F] text-[var(--marking)] font-mono text-xs">
                      [EVIDENCE FRAME CAMERA 01]
                    </div>
                  )}

                  {/* Bounding box marker */}
                  <div className="absolute inset-x-12 inset-y-8 border-2 border-[var(--accent)] pointer-events-none rounded-sm">
                    <span className="absolute -top-3.5 left-2 bg-[var(--accent)] text-white text-[10px] font-mono px-1.5 py-0.2 rounded">
                      {defect.class_name.toUpperCase()} ({(defect.est_area_m2).toFixed(2)} m²)
                    </span>
                  </div>
                </div>

                {/* Survey Plate Bar */}
                <div className="survey-plate px-3 py-2 bg-[var(--surface)] border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
                  <span className="flex items-center gap-1.5 text-[var(--ink)] font-medium">
                    <CalendarBlank size={14} /> {defect.created_at.slice(0, 10)}
                  </span>
                  <span>{defect.lat.toFixed(5)}°N, {defect.lon.toFixed(5)}°E</span>
                  <span className="flex items-center gap-1">
                    <Gauge size={14} /> 60 km/h (Survey Speed)
                  </span>
                  <span>Vantage #{defect.first_seen_frame}</span>
                </div>
              </section>

              {/* Status & Severity Bar */}
              <section className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded border border-[var(--rule)] bg-[var(--surface)] flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                    Severity Stamp
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`stamp stamp-${defect.severity_band}`}>
                      <span className="text-xs">
                        {defect.severity_band === 'low' && '●'}
                        {defect.severity_band === 'medium' && '◆'}
                        {defect.severity_band === 'high' && '▲'}
                        {defect.severity_band === 'critical' && '⬢'}
                      </span>
                      <span>{SEVERITY_LABELS[defect.severity_band as SeverityLevel]}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold">{defect.severity_score.toFixed(1)}/100</span>
                  </div>
                </div>

                <div className="p-3 rounded border border-[var(--rule)] bg-[var(--surface)] flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                    Risk Prioritisation
                  </span>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                      <span>Score: {defect.risk_score.toFixed(1)}</span>
                      <span className="text-[var(--accent)] font-bold">Top Priority</span>
                    </div>
                    <div className="w-full bg-[var(--rule)] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--accent)] h-full transition-all"
                        style={{ width: `${defect.risk_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Standing Water Indicator */}
              {defect.is_waterlogged && (
                <div className="p-3 rounded border border-[var(--info)] bg-[rgba(43,102,147,0.08)] flex items-start gap-2.5">
                  <Drop size={18} className="text-[var(--info)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[var(--info)] flex items-center gap-1.5">
                      <span>Water Accumulation Hazard</span>
                      <span className="text-[10px] font-mono border border-[var(--info)] px-1 rounded uppercase">
                        Experimental
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      Recent rainfall in Perundurai has filled this depression. Monocular depth estimate is obscured by standing water.
                    </p>
                  </div>
                </div>
              )}

              {/* Safety Overrides */}
              {defect.overrides && defect.overrides.length > 0 && (
                <div className="p-3 rounded border border-[var(--warning)] bg-[rgba(217,162,27,0.08)] flex items-start gap-2.5">
                  <Warning size={18} className="text-[var(--warning)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[var(--warning)]">Safety Override Enforced</div>
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      {defect.overrides.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Explainable Waterfall Breakdown */}
              <section className="space-y-3">
                <h4 className="text-xs uppercase font-mono tracking-wider text-[var(--ink-muted)]">
                  Score Contribution Breakdown (Explainability)
                </h4>
                <div className="p-4 rounded border border-[var(--rule)] bg-[var(--surface)] space-y-2.5">
                  <WaterfallBar label="Estimated Area (wA · A)" points={defect.breakdown?.area_contribution || 22} max={35} />
                  <WaterfallBar label="Defect Class Baseline (wC · C)" points={defect.breakdown?.class_contribution || 28} max={35} />
                  <WaterfallBar label="Wheel Path Location (wP · P)" points={defect.breakdown?.position_contribution || 16} max={20} />
                  {defect.breakdown?.water_bonus ? (
                    <WaterfallBar label="Standing Water Bonus (+waterBonus)" points={defect.breakdown.water_bonus} max={15} isBonus />
                  ) : null}
                  <WaterfallBar label="Corridor Exposure (wE · E)" points={18} max={20} />
                  <WaterfallBar label="Pedestrian Vulnerability (wV · V)" points={12} max={15} />
                </div>
              </section>

              {/* Natural Language Explanation */}
              {defect.explanation && (
                <section className="p-3 rounded border border-[var(--rule)] bg-[var(--surface)]">
                  <div className="text-[11px] font-mono text-[var(--ink-muted)] uppercase mb-1">
                    System Reasoning
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--ink)]">
                    "{defect.explanation}"
                  </p>
                </section>
              )}

              {/* Human Verification Action Controls */}
              <section className="pt-2 border-t border-[var(--rule)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-[var(--ink)]">
                    Human Review: <span className="uppercase text-[var(--accent)] font-semibold">{defect.review_status}</span>
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">Role: Engineer</span>
                </div>

                {reclassifying ? (
                  <div className="p-3 rounded border border-[var(--rule)] bg-[var(--surface)] space-y-3">
                    <label className="text-xs block font-mono text-[var(--ink-muted)]">
                      Select Correct Road Defect Taxonomy:
                    </label>
                    <select
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value)}
                      className="w-full text-xs font-mono p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
                    >
                      <option value="pothole">Pothole (D40)</option>
                      <option value="longitudinal_crack">Longitudinal Crack (D00)</option>
                      <option value="transverse_crack">Transverse Crack (D10)</option>
                      <option value="surface_damage">Surface Damage / Alligator (D20)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Audit note / reason..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReclassifying(false)}
                        className="px-2.5 py-1 text-xs rounded border border-[var(--rule)] hover:bg-[var(--paper)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => reviewMutation.mutate({ action: 'reclassify', nextClass: newClass, cmt: comment })}
                        disabled={reviewMutation.isPending}
                        className="btn btn-primary text-xs py-1 px-3"
                      >
                        Save Reclassification
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => reviewMutation.mutate({ action: 'approve' })}
                      disabled={reviewMutation.isPending || defect.review_status === 'approved'}
                      className="btn btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 text-[var(--ok)] border-[var(--ok)] hover:bg-[rgba(47,125,91,0.08)]"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      onClick={() => setReclassifying(true)}
                      disabled={reviewMutation.isPending}
                      className="btn btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                    >
                      <ArrowsClockwise size={16} /> Reclassify
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ action: 'reject' })}
                      disabled={reviewMutation.isPending || defect.review_status === 'rejected'}
                      className="btn btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 text-[var(--error)] border-[var(--error)] hover:bg-[rgba(179,32,42,0.08)]"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

function WaterfallBar({ label, points, max, isBonus }: { label: string; points: number; max: number; isBonus?: boolean }) {
  const pct = Math.min(100, Math.round((points / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <span className="text-[var(--ink)]">{label}</span>
        <span className="font-semibold text-[var(--ink-muted)]">+{points.toFixed(1)} pts</span>
      </div>
      <div className="w-full bg-[var(--paper)] h-1.5 rounded-full overflow-hidden border border-[var(--rule)]">
        <div
          className={`h-full ${isBonus ? 'bg-[var(--info)]' : 'bg-[var(--accent)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
