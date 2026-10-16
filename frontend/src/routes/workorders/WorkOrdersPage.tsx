import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Kanban,
  Clock,
  Wrench,
  CheckCircle,
  XCircle,
  CurrencyInr,
  MapPin,
  UserCircle,
} from 'phosphor-react';
import {
  fetchWorkOrders,
  updateWorkOrderStatus,
  type WorkOrderItem,
} from '@/lib/api';
import { SEVERITY_LABELS, type SeverityLevel } from '@/lib/tokens';

type KanbanStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const COLUMNS: { key: KanbanStatus; label: string; icon: React.ReactNode; accent: string }[] = [
  {
    key: 'scheduled',
    label: 'Scheduled',
    icon: <Clock size={16} weight="bold" />,
    accent: 'var(--warning)',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: <Wrench size={16} weight="bold" />,
    accent: 'var(--info)',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: <CheckCircle size={16} weight="bold" />,
    accent: 'var(--ok)',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: <XCircle size={16} weight="bold" />,
    accent: 'var(--ink-muted)',
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'var(--sev-critical)',
  high: 'var(--sev-high)',
  medium: 'var(--sev-medium)',
  low: 'var(--sev-low)',
};

function WorkOrderCard({
  wo,
  onDragStart,
}: {
  wo: WorkOrderItem;
  onDragStart: (e: React.DragEvent, id: number) => void;
}) {
  const priorityColor = PRIORITY_COLORS[wo.priority] || 'var(--ink-muted)';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, wo.id)}
      className="kanban-card card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--ink)] transition-all group"
      id={`wo-${wo.id}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold text-[var(--ink-muted)]">
            WO-{String(wo.id).padStart(3, '0')}
          </span>
          <span
            className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
            style={{
              color: priorityColor,
              backgroundColor: `color-mix(in srgb, ${priorityColor} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${priorityColor} 25%, transparent)`,
            }}
          >
            {wo.priority}
          </span>
        </div>
        <span className={`chip chip-${wo.severity_band}`}>
          {SEVERITY_LABELS[wo.severity_band as SeverityLevel] || wo.severity_band}
        </span>
      </div>

      {/* Defect Info */}
      <div className="mb-2">
        <div className="text-xs font-semibold text-[var(--ink)] leading-snug">
          {wo.class_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)] font-mono mt-0.5">
          <MapPin size={10} />
          {wo.road_name}
        </div>
      </div>

      {/* Repair method + cost */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)] border-t border-[var(--rule)] pt-2 mt-2">
        <span className="truncate max-w-[60%]">{wo.repair_method}</span>
        <span className="flex items-center gap-0.5 font-bold text-[var(--ink)] whitespace-nowrap">
          <CurrencyInr size={10} />
          ₹{wo.estimated_cost_inr.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Crew + Date */}
      {(wo.assigned_crew || wo.scheduled_date) && (
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)] mt-1.5">
          {wo.assigned_crew && (
            <span className="flex items-center gap-1">
              <UserCircle size={10} />
              {wo.assigned_crew}
            </span>
          )}
          {wo.scheduled_date && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {wo.scheduled_date}
            </span>
          )}
        </div>
      )}

      {/* Notes (truncated) */}
      {wo.notes && (
        <p className="text-[10px] text-[var(--ink-muted)] font-mono mt-1.5 line-clamp-2 italic opacity-70">
          {wo.notes}
        </p>
      )}

      {/* Risk score bar */}
      <div className="mt-2 pt-1.5 border-t border-[var(--rule)]">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[var(--ink-muted)]">Risk</span>
          <span className="font-bold text-[var(--accent)]">{wo.risk_score.toFixed(1)}</span>
        </div>
        <div className="w-full bg-[var(--paper)] h-1.5 rounded-full overflow-hidden border border-[var(--rule)] mt-0.5">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${wo.risk_score}%`,
              backgroundColor: wo.risk_score >= 75 ? 'var(--sev-critical)' : wo.risk_score >= 50 ? 'var(--sev-high)' : wo.risk_score >= 25 ? 'var(--sev-medium)' : 'var(--sev-low)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  orders,
  onDragStart,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  column: typeof COLUMNS[0];
  orders: WorkOrderItem[];
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDrop: (e: React.DragEvent, status: KanbanStatus) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}) {
  const totalCost = orders.reduce((sum, wo) => sum + wo.estimated_cost_inr, 0);

  return (
    <div
      className={`flex flex-col min-h-[400px] rounded border transition-all ${
        isDragOver
          ? 'border-[var(--accent)] bg-[rgba(200,74,8,0.03)]'
          : 'border-[var(--rule)] bg-[var(--paper)]'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.key)}
    >
      {/* Column Header */}
      <div
        className="px-4 py-3 border-b border-[var(--rule)] rounded-t"
        style={{ borderTop: `3px solid ${column.accent}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color: column.accent }}>{column.icon}</span>
            <span className="text-xs font-semibold text-[var(--ink)]">{column.label}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink-muted)]">
            {orders.length}
          </span>
        </div>
        <div className="text-[10px] font-mono text-[var(--ink-muted)] mt-1 flex items-center gap-1">
          <CurrencyInr size={10} />
          ₹{totalCost.toLocaleString('en-IN')} total
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[10px] font-mono text-[var(--ink-muted)] opacity-50">
            Drop work orders here
          </div>
        ) : (
          orders.map((wo) => (
            <WorkOrderCard key={wo.id} wo={wo} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

export function WorkOrdersPage() {
  const queryClient = useQueryClient();
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: fetchWorkOrders,
  });

  const handleDragStart = useCallback((e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: KanbanStatus) => {
      e.preventDefault();
      setDragOverColumn(null);

      const id = Number(e.dataTransfer.getData('text/plain'));
      if (!id) return;

      const current = workOrders.find((wo) => wo.id === id);
      if (!current || current.status === newStatus) return;

      // Optimistic update
      queryClient.setQueryData<WorkOrderItem[]>(['work-orders'], (old) =>
        (old || []).map((wo) => (wo.id === id ? { ...wo, status: newStatus } : wo)),
      );

      await updateWorkOrderStatus(id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
    [workOrders, queryClient],
  );

  // Group by status
  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = workOrders
        .filter((wo) => wo.status === col.key)
        .sort((a, b) => b.risk_score - a.risk_score);
      return acc;
    },
    {} as Record<KanbanStatus, WorkOrderItem[]>,
  );

  // Summary stats
  const totalBudget = workOrders
    .filter((wo) => wo.status !== 'cancelled')
    .reduce((sum, wo) => sum + wo.estimated_cost_inr, 0);
  const completedCost = workOrders
    .filter((wo) => wo.status === 'completed')
    .reduce((sum, wo) => sum + wo.estimated_cost_inr, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--rule)] pb-4">
        <div>
          <span className="survey-plate text-xs text-[var(--ink-muted)]">
            MAINTENANCE OPS · WORK ORDER LIFECYCLE
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
            Work Order Board
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
            Drag cards between columns to update lifecycle status
          </p>
        </div>

        {/* Budget overview */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-2 rounded bg-[var(--surface)] border border-[var(--rule)] text-center">
            <div className="text-[10px] text-[var(--ink-muted)]">Active Orders</div>
            <div className="text-sm font-bold text-[var(--ink)]">{workOrders.filter(wo => wo.status !== 'cancelled').length}</div>
          </div>
          <div className="px-3 py-2 rounded bg-[var(--surface)] border border-[var(--rule)] text-center">
            <div className="text-[10px] text-[var(--ink-muted)]">Total Budget</div>
            <div className="text-sm font-bold text-[var(--accent)]">₹{totalBudget.toLocaleString('en-IN')}</div>
          </div>
          <div className="px-3 py-2 rounded bg-[var(--surface)] border border-[var(--rule)] text-center">
            <div className="text-[10px] text-[var(--ink-muted)]">Completed</div>
            <div className="text-sm font-bold text-[var(--ok)]">₹{completedCost.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[var(--ink-muted)]">
          Loading work orders...
        </div>
      ) : workOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <Kanban size={32} className="mx-auto text-[var(--ink-muted)] mb-3" />
          <p className="text-xs font-mono text-[var(--ink-muted)]">
            No work orders have been created yet.
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">
            Verify defects in the Review queue, then schedule repairs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              orders={grouped[col.key] || []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              isDragOver={dragOverColumn === col.key}
              onDragOver={() => setDragOverColumn(col.key)}
              onDragLeave={() => setDragOverColumn(null)}
            />
          ))}
        </div>
      )}

      {/* Repair Methods Legend */}
      <div className="card p-4 space-y-2">
        <h3 className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
          <Wrench size={14} className="text-[var(--accent)]" />
          Repair Methods & Estimated Costs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { method: 'Cold Mix Asphalt Patching', cost: '₹1,800 – ₹3,200', time: '30 min', use: 'Small–medium potholes' },
            { method: 'Hot Mix Asphalt Patching', cost: '₹3,500 – ₹6,000', time: '1–2 hrs', use: 'Large potholes, heavy traffic' },
            { method: 'Crack Sealing (Rubberised Bitumen)', cost: '₹800 – ₹1,800', time: '20 min', use: 'Linear cracks <15mm' },
            { method: 'Microsurfacing Treatment', cost: '₹4,500 – ₹7,000', time: '2–4 hrs', use: 'Alligator cracking, surface wear' },
            { method: 'Thin Overlay (25mm SDBC)', cost: '₹4,000 – ₹6,000', time: '3–5 hrs', use: 'Wide-area surface damage' },
            { method: 'Full-Depth Reconstruction', cost: '₹12,000 – ₹25,000', time: '1–2 days', use: 'Structural failure' },
          ].map((r) => (
            <div
              key={r.method}
              className="p-2.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-[10px] font-mono"
            >
              <div className="font-semibold text-[var(--ink)] text-[11px]">{r.method}</div>
              <div className="text-[var(--ink-muted)] mt-1 space-y-0.5">
                <div>Cost: <strong className="text-[var(--ink)]">{r.cost}</strong></div>
                <div>Time: {r.time} · {r.use}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
