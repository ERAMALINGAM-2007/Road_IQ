import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyInr,
  CheckSquare,
  XSquare,
  Lightning,
  Gauge,
  Info,
} from 'phosphor-react';
import { fetchWorkOrders } from '@/lib/api';
import { solveKnapsack, type KnapsackItem } from '@/lib/knapsack';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';

const BUDGET_PRESETS = [
  { label: '₹10K', value: 10000 },
  { label: '₹25K', value: 25000 },
  { label: '₹50K', value: 50000 },
  { label: '₹75K', value: 75000 },
  { label: '₹1L', value: 100000 },
];

export function PlannerPage() {
  const [budget, setBudget] = useState(50000);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: fetchWorkOrders,
  });

  // Convert work orders to knapsack items (only actionable ones)
  const knapsackItems: KnapsackItem[] = useMemo(
    () =>
      workOrders
        .filter((wo) => wo.status === 'scheduled' || wo.status === 'in_progress')
        .map((wo) => ({
          id: wo.id,
          defect_id: wo.defect_id,
          risk_score: wo.risk_score,
          estimated_cost_inr: wo.estimated_cost_inr,
          class_name: wo.class_name,
          severity_band: wo.severity_band,
          repair_method: wo.repair_method,
          road_name: wo.road_name,
          lat: wo.lat,
          lon: wo.lon,
        })),
    [workOrders],
  );

  // Solve knapsack
  const result = useMemo(
    () => solveKnapsack(knapsackItems, budget),
    [knapsackItems, budget],
  );

  // Compute max possible budget
  const maxBudget = useMemo(
    () =>
      Math.max(
        10000,
        knapsackItems.reduce((sum, item) => sum + item.estimated_cost_inr, 0) + 5000,
      ),
    [knapsackItems],
  );

  const avgRiskSelected =
    result.selected.length > 0
      ? result.selected.reduce((sum, item) => sum + item.risk_score, 0) / result.selected.length
      : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--rule)] pb-4">
        <span className="survey-plate text-xs text-[var(--ink-muted)]">
          DECISION ENGINE · BUDGET-CONSTRAINED REPAIR OPTIMISER
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
          Repair Planner
        </h1>
        <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
          0-1 Knapsack optimiser: maximise total risk reduction within your maintenance budget
        </p>
      </div>

      {/* Budget Control */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
            <CurrencyInr size={16} className="text-[var(--accent)]" />
            Maintenance Budget
          </h2>
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-[var(--accent)]">
              ₹{budget.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Slider */}
        <div>
          <input
            type="range"
            min={5000}
            max={maxBudget}
            step={1000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="whatif-slider w-full"
            aria-label="Budget amount"
          />
          <div className="flex justify-between text-[10px] font-mono text-[var(--ink-muted)] mt-1">
            <span>₹5,000</span>
            <span>₹{maxBudget.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setBudget(preset.value)}
              className={`px-3 py-1 rounded text-xs font-mono border transition-all ${
                budget === preset.value
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Dashboard */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[var(--ink-muted)]">
          Computing optimal repair plan...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <CheckSquare size={20} className="mx-auto text-[var(--ok)] mb-1" />
              <div className="text-xl font-mono font-bold text-[var(--ink)]">{result.selected.length}</div>
              <div className="text-[10px] text-[var(--ink-muted)] font-mono">Repairs Selected</div>
            </div>
            <div className="card p-3 text-center">
              <CurrencyInr size={20} className="mx-auto text-[var(--accent)] mb-1" />
              <div className="text-xl font-mono font-bold text-[var(--accent)]">
                ₹{result.totalCost.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] font-mono">Total Cost</div>
            </div>
            <div className="card p-3 text-center">
              <Lightning size={20} className="mx-auto text-[var(--sev-high)] mb-1" />
              <div className="text-xl font-mono font-bold text-[var(--sev-high)]">
                {result.totalRiskReduction.toFixed(0)}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] font-mono">Risk Points Addressed</div>
            </div>
            <div className="card p-3 text-center">
              <Gauge size={20} className="mx-auto text-[var(--info)] mb-1" />
              <div className="text-xl font-mono font-bold text-[var(--info)]">
                {(result.budgetUtilisation * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] font-mono">Budget Utilisation</div>
            </div>
          </div>

          {/* Budget Utilisation Bar */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[var(--ink-muted)]">Budget Allocation</span>
              <span className="text-xs font-mono font-bold text-[var(--ink)]">
                ₹{result.totalCost.toLocaleString('en-IN')} / ₹{budget.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-full bg-[var(--paper)] h-4 rounded-full overflow-hidden border border-[var(--rule)]">
              <div
                className="h-full rounded-full transition-all duration-500 relative"
                style={{
                  width: `${Math.min(result.budgetUtilisation * 100, 100)}%`,
                  background: 'linear-gradient(90deg, var(--ok), var(--accent))',
                }}
              >
                {result.budgetUtilisation > 0.2 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                    {(result.budgetUtilisation * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[var(--ink-muted)]">
              <Info size={12} className="text-[var(--info)]" />
              Remaining: ₹{(budget - result.totalCost).toLocaleString('en-IN')} · 
              Avg risk/repair: {avgRiskSelected.toFixed(1)} · 
              Cost/risk point: ₹{result.totalRiskReduction > 0 ? (result.totalCost / result.totalRiskReduction).toFixed(0) : '—'}
            </div>
          </div>

          {/* Selected Repairs Table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--rule)] bg-[var(--surface)]">
              <h3 className="text-xs font-semibold text-[var(--ink)] flex items-center gap-2">
                <CheckSquare size={14} className="text-[var(--ok)]" />
                Optimal Repair Set ({result.selected.length} repairs)
              </h3>
            </div>
            {result.selected.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[var(--ink-muted)]">
                No repairs fit within the current budget. Increase the budget to include repairs.
              </div>
            ) : (
              <div className="divide-y divide-[var(--rule)]">
                {result.selected
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--surface)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center font-mono text-[10px] font-bold bg-[var(--ok)] text-white">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                              WO-{String(item.id).padStart(3, '0')}
                            </span>
                            <span className="text-xs font-semibold text-[var(--ink)]">
                              {item.class_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                            <span className={`chip chip-${item.severity_band}`}>
                              {SEVERITY_LABELS[item.severity_band as SeverityLevel] || item.severity_band}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[var(--ink-muted)] truncate">
                            {item.repair_method} · {item.road_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-[var(--accent)]">
                            ₹{item.estimated_cost_inr.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--ink-muted)]">
                            Risk: {item.risk_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Excluded Repairs */}
          {result.excluded.length > 0 && (
            <div className="card overflow-hidden opacity-70">
              <div className="px-4 py-3 border-b border-[var(--rule)] bg-[var(--surface)]">
                <h3 className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-2">
                  <XSquare size={14} />
                  Not in Budget ({result.excluded.length} repairs deferred)
                </h3>
              </div>
              <div className="divide-y divide-[var(--rule)]">
                {result.excluded
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-4 text-[var(--ink-muted)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono">
                          WO-{String(item.id).padStart(3, '0')}
                        </span>
                        <span className="text-xs">
                          {item.class_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>
                      <div className="text-xs font-mono">
                        ₹{item.estimated_cost_inr.toLocaleString('en-IN')} · Risk {item.risk_score.toFixed(1)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Algorithm Info */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--ink)] flex items-center gap-2">
              <Info size={14} className="text-[var(--info)]" />
              Algorithm Details
            </h3>
            <div className="text-[10px] font-mono text-[var(--ink-muted)] space-y-1 leading-relaxed">
              <p>
                <strong>Method:</strong> 0-1 Knapsack dynamic programming — selects the subset of
                repairs that maximises total risk-score reduction within the budget constraint.
              </p>
              <p>
                <strong>Value function:</strong> Risk Score (higher priority defects yield more value).
              </p>
              <p>
                <strong>Weight:</strong> Estimated repair cost (INR). Costs rounded to ₹100 granularity.
              </p>
              <p>
                <strong>Note:</strong> Cost estimates are indicative and based on standard Schedule of
                Rates. Actual costs may vary by ±20% depending on site conditions.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
