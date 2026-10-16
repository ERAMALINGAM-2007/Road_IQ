/**
 * lib/knapsack.ts — 0-1 Knapsack optimizer for budget-constrained repair planning.
 * 
 * Selects the subset of repairs that maximises total risk reduction
 * within a given budget constraint.
 */

export interface KnapsackItem {
  id: number;
  defect_id: number;
  risk_score: number;
  estimated_cost_inr: number;
  class_name: string;
  severity_band: string;
  repair_method: string;
  road_name: string;
  lat: number;
  lon: number;
}

export interface KnapsackResult {
  selected: KnapsackItem[];
  excluded: KnapsackItem[];
  totalCost: number;
  totalRiskReduction: number;
  budgetUtilisation: number; // 0–1
}

/**
 * 0-1 Knapsack solver using dynamic programming.
 * 
 * - value = risk_score (higher priority = higher value)
 * - weight = estimated_cost_inr
 * - capacity = budget
 * 
 * Costs are rounded to nearest 100 INR to keep the DP table manageable.
 */
export function solveKnapsack(items: KnapsackItem[], budget: number): KnapsackResult {
  const SCALE = 100; // Round costs to nearest 100
  const n = items.length;
  const capacity = Math.floor(budget / SCALE);

  if (n === 0 || capacity <= 0) {
    return {
      selected: [],
      excluded: [...items],
      totalCost: 0,
      totalRiskReduction: 0,
      budgetUtilisation: 0,
    };
  }

  // Create scaled weights and values (multiply risk by 10 for integer precision)
  const weights = items.map((item) => Math.max(1, Math.round(item.estimated_cost_inr / SCALE)));
  const values = items.map((item) => Math.round(item.risk_score * 10));

  // DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(capacity + 1).fill(0),
  );

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // Don't take item i
      if (weights[i - 1] <= w) {
        const withItem = dp[i - 1][w - weights[i - 1]] + values[i - 1];
        if (withItem > dp[i][w]) {
          dp[i][w] = withItem;
        }
      }
    }
  }

  // Backtrack to find selected items
  const selectedIndices: Set<number> = new Set();
  let w = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedIndices.add(i - 1);
      w -= weights[i - 1];
    }
  }

  const selected = items.filter((_, idx) => selectedIndices.has(idx));
  const excluded = items.filter((_, idx) => !selectedIndices.has(idx));
  const totalCost = selected.reduce((sum, item) => sum + item.estimated_cost_inr, 0);
  const totalRiskReduction = selected.reduce((sum, item) => sum + item.risk_score, 0);

  return {
    selected,
    excluded,
    totalCost,
    totalRiskReduction,
    budgetUtilisation: budget > 0 ? totalCost / budget : 0,
  };
}
