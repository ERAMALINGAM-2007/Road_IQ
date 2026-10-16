import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sliders, X, ArrowsClockwise, Info } from 'phosphor-react';
import { fetchScoringConfig, type DefectItem } from '@/lib/api';

interface WhatIfPanelProps {
  defects: DefectItem[];
  onReranked: (reranked: DefectItem[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface WeightState {
  severity: number;
  exposure: number;
  vulnerability: number;
  persistence: number;
  time_weather: number;
}

const WEIGHT_LABELS: Record<keyof WeightState, { label: string; desc: string; icon: string }> = {
  severity: {
    label: 'Severity',
    desc: 'Physical damage assessment (area, class, position)',
    icon: '⚡',
  },
  exposure: {
    label: 'Road Exposure',
    desc: 'Highway class, speed limit, junction proximity',
    icon: '🛣️',
  },
  vulnerability: {
    label: 'Vulnerability',
    desc: 'Schools, hospitals, bus stops within 150m',
    icon: '🏥',
  },
  persistence: {
    label: 'Persistence',
    desc: 'Recurrence count, area growth, days since first seen',
    icon: '📈',
  },
  time_weather: {
    label: 'Time & Weather',
    desc: 'Days unrepaired + rainfall context',
    icon: '🌧️',
  },
};

const DEFAULT_WEIGHTS: WeightState = {
  severity: 0.40,
  exposure: 0.20,
  vulnerability: 0.15,
  persistence: 0.15,
  time_weather: 0.10,
};

export function WhatIfPanel({ defects, onReranked, isOpen, onToggle }: WhatIfPanelProps) {
  const [weights, setWeights] = useState<WeightState>({ ...DEFAULT_WEIGHTS });

  const { data: config } = useQuery({
    queryKey: ['scoring-config'],
    queryFn: fetchScoringConfig,
  });

  // Normalise weights to sum = 1
  const normalised = useMemo(() => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum === 0) return { ...DEFAULT_WEIGHTS };
    const n: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) {
      n[k] = v / sum;
    }
    return n as unknown as WeightState;
  }, [weights]);

  // Recompute risk scores with user-adjusted weights (client-side simulation)
  const rerankedDefects = useMemo(() => {
    if (!defects.length) return defects;

    // We approximate each component from the existing risk_score and severity_score
    // Since we don't have individual E, V, G, T values on the frontend,
    // we simulate the relative effect by treating the current risk_score as:
    //   R_current = 0.40·S' + 0.20·E + 0.15·V + 0.15·G + 0.10·T
    // and computing a delta-adjusted score
    const cfgWeights = config?.risk?.weights || DEFAULT_WEIGHTS;

    return defects
      .map((d) => {
        const S_prime = d.severity_score / 100;
        // Estimate other components from the current risk_score
        const currentWeightedS = (cfgWeights.severity || 0.40) * S_prime * 100;
        const otherContributions = d.risk_score - currentWeightedS;

        // Split the other contributions proportionally
        const otherWeightSum =
          (cfgWeights.exposure || 0.20) +
          (cfgWeights.vulnerability || 0.15) +
          (cfgWeights.persistence || 0.15) +
          (cfgWeights.time_weather || 0.10);

        const E_est = otherContributions * ((cfgWeights.exposure || 0.20) / otherWeightSum);
        const V_est = otherContributions * ((cfgWeights.vulnerability || 0.15) / otherWeightSum);
        const G_est = otherContributions * ((cfgWeights.persistence || 0.15) / otherWeightSum);
        const T_est = otherContributions * ((cfgWeights.time_weather || 0.10) / otherWeightSum);

        // Recompute with new weights
        const newRisk =
          normalised.severity * S_prime * 100 +
          (normalised.exposure / (cfgWeights.exposure || 0.20)) * E_est +
          (normalised.vulnerability / (cfgWeights.vulnerability || 0.15)) * V_est +
          (normalised.persistence / (cfgWeights.persistence || 0.15)) * G_est +
          (normalised.time_weather / (cfgWeights.time_weather || 0.10)) * T_est;

        const clampedRisk = Math.max(0, Math.min(100, newRisk));
        const delta = clampedRisk - d.risk_score;

        return {
          ...d,
          risk_score: Math.round(clampedRisk * 10) / 10,
          _delta: Math.round(delta * 10) / 10,
          _original_risk: d.risk_score,
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [defects, normalised, config]);

  // Propagate reranked to parent
  const applyRanking = useCallback(() => {
    onReranked(rerankedDefects);
  }, [rerankedDefects, onReranked]);

  const resetWeights = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
  };

  const isModified = Object.entries(weights).some(
    ([k, v]) => Math.abs(v - DEFAULT_WEIGHTS[k as keyof WeightState]) > 0.001,
  );

  // Count how many defects changed rank
  const rankChanges = useMemo(() => {
    if (!isModified) return 0;
    const origOrder = [...defects].sort((a, b) => b.risk_score - a.risk_score).map((d) => d.id);
    const newOrder = rerankedDefects.map((d) => d.id);
    let changes = 0;
    for (let i = 0; i < Math.min(origOrder.length, newOrder.length); i++) {
      if (origOrder[i] !== newOrder[i]) changes++;
    }
    return changes;
  }, [defects, rerankedDefects, isModified]);

  const handleSliderChange = (key: keyof WeightState, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-sans text-sm font-semibold shadow-lg hover:scale-105 transition-transform"
        id="whatif-toggle"
        aria-label="Open What-If Weight Panel"
      >
        <Sliders size={18} weight="bold" />
        What-If
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[380px] max-w-full bg-[var(--surface)] border-l border-[var(--rule)] shadow-xl flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--rule)] bg-[var(--paper)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={20} weight="bold" className="text-[var(--accent)]" />
            <h2 className="font-display text-base font-semibold text-[var(--ink)]">
              What-If Analysis
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded hover:bg-[var(--rule)] transition-colors"
            aria-label="Close panel"
          >
            <X size={18} className="text-[var(--ink-muted)]" />
          </button>
        </div>
        <p className="text-[11px] text-[var(--ink-muted)] font-mono mt-1">
          Adjust risk factor weights to explore re-prioritisation scenarios
        </p>
      </div>

      {/* Sliders */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {(Object.entries(WEIGHT_LABELS) as [keyof WeightState, typeof WEIGHT_LABELS[keyof WeightState]][]).map(
          ([key, meta]) => {
            const value = weights[key];
            const normPct = (normalised[key] * 100).toFixed(1);
            const defaultVal = DEFAULT_WEIGHTS[key];
            const isDiff = Math.abs(value - defaultVal) > 0.001;

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
                    <span>{meta.icon}</span>
                    {meta.label}
                    {isDiff && (
                      <span className="text-[10px] font-mono text-[var(--accent)] bg-[rgba(200,74,8,0.08)] px-1.5 py-0.5 rounded">
                        MODIFIED
                      </span>
                    )}
                  </label>
                  <span className="text-xs font-mono text-[var(--ink-muted)]">
                    {(value * 100).toFixed(0)}% → <strong className="text-[var(--ink)]">{normPct}%</strong>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value * 100}
                  onChange={(e) => handleSliderChange(key, Number(e.target.value) / 100)}
                  className="whatif-slider w-full"
                  aria-label={`${meta.label} weight`}
                />
                <p className="text-[10px] text-[var(--ink-muted)] font-mono">
                  {meta.desc}
                </p>
              </div>
            );
          },
        )}

        {/* Info Card */}
        <div className="p-3 rounded border border-[var(--rule)] bg-[var(--paper)] space-y-2">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-[var(--info)] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[var(--ink-muted)] leading-relaxed">
              Weights are automatically renormalised to sum to 100%.
              Changes are client-side only — they don't modify stored scores.
              Use this to explore "what if we prioritised schools?" or "what if weather mattered more?" scenarios.
            </p>
          </div>
        </div>

        {/* Impact Summary */}
        {isModified && (
          <div className="p-3 rounded border border-[var(--accent)] bg-[rgba(200,74,8,0.04)] space-y-2">
            <h3 className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <ArrowsClockwise size={14} className="text-[var(--accent)]" />
              Impact Preview
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded bg-[var(--surface)] border border-[var(--rule)]">
                <div className="text-lg font-mono font-bold text-[var(--accent)]">{rankChanges}</div>
                <div className="text-[10px] text-[var(--ink-muted)]">Rank changes</div>
              </div>
              <div className="text-center p-2 rounded bg-[var(--surface)] border border-[var(--rule)]">
                <div className="text-lg font-mono font-bold text-[var(--ink)]">{defects.length}</div>
                <div className="text-[10px] text-[var(--ink-muted)]">Total defects</div>
              </div>
            </div>

            {/* Top 5 movers */}
            <div className="space-y-1">
              <h4 className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">
                Biggest movers
              </h4>
              {rerankedDefects
                .filter((d: any) => Math.abs(d._delta || 0) > 0.5)
                .sort((a: any, b: any) => Math.abs(b._delta) - Math.abs(a._delta))
                .slice(0, 5)
                .map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-[var(--paper)]"
                  >
                    <span className="text-[var(--ink-muted)]">DEF-{String(d.id).padStart(4, '0')}</span>
                    <span
                      className={`font-bold ${
                        d._delta > 0 ? 'text-[var(--sev-high)]' : 'text-[var(--ok)]'
                      }`}
                    >
                      {d._delta > 0 ? '↑' : '↓'} {Math.abs(d._delta).toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3 border-t border-[var(--rule)] bg-[var(--paper)] flex items-center gap-2">
        <button
          onClick={resetWeights}
          disabled={!isModified}
          className="btn btn-secondary text-xs flex-1 py-2 disabled:opacity-40"
        >
          Reset Defaults
        </button>
        <button
          onClick={applyRanking}
          disabled={!isModified}
          className="btn btn-primary text-xs flex-1 py-2 disabled:opacity-40"
        >
          Apply to Queue
        </button>
      </div>
    </div>
  );
}
