'use client';

import { useState } from 'react';
import {
  WorkOrder,
  priorityLabels,
  updateWorkOrder,
  isWorkOrderOverdue,
} from '@/lib/work-orders';
import { FaPlay, FaCheckCircle, FaRegClock } from 'react-icons/fa';
import CompleteWorkOrderModal from './CompleteWorkOrderModal';
import WorkOrderDetailModal from './WorkOrderDetailModal';

interface WorkOrderListProps {
  workOrders: WorkOrder[];
  showEquipmentName?: boolean;
  onStatusChange?: () => void;
  showFilters?: boolean;
}

type FilterTab = 'all' | 'overdue' | 'faults' | 'scheduled' | 'in_progress' | 'completed';

type TagKey = 'forfalt' | 'feil' | 'pagar' | 'planlagt' | 'ferdig' | 'apen';

const TAG_STYLE: Record<TagKey, { bg: string; fg: string; label: string }> = {
  forfalt:  { bg: 'bg-rustBg',  fg: 'text-rust',  label: 'Forfalt' },
  feil:     { bg: 'bg-rustBg',  fg: 'text-rust',  label: 'Åpen feil' },
  pagar:    { bg: 'bg-skyBg',   fg: 'text-sky',   label: 'Pågår' },
  planlagt: { bg: 'bg-mossBg',  fg: 'text-moss',  label: 'Planlagt' },
  ferdig:   { bg: 'bg-line2',   fg: 'text-ink3',  label: 'Fullført' },
  apen:     { bg: 'bg-amberBg', fg: 'text-amber', label: 'Åpen' },
};

function statusToTag(wo: WorkOrder): TagKey {
  if (isWorkOrderOverdue(wo.due_date, wo.status)) return 'forfalt';
  if (wo.status === 'in_progress') return 'pagar';
  if (wo.status === 'completed' || wo.status === 'closed') return 'ferdig';
  if (wo.type === 'corrective' && !['completed', 'closed'].includes(wo.status)) return 'feil';
  if (wo.status === 'scheduled') return 'planlagt';
  return 'apen';
}

function typeLabel(type: WorkOrder['type']): string {
  switch (type) {
    case 'scheduled': return 'Forebyggende';
    case 'corrective': return 'Korrektiv';
    case 'inspection': return 'Inspeksjon';
    default: return 'Arbeid';
  }
}

export default function WorkOrderList({
  workOrders,
  showEquipmentName = true,
  onStatusChange,
  showFilters = true,
}: WorkOrderListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [workOrderToComplete, setWorkOrderToComplete] = useState<WorkOrder | null>(null);
  const [workOrderToView, setWorkOrderToView] = useState<WorkOrder | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const filteredWorkOrders = workOrders.filter(wo => {
    switch (activeTab) {
      case 'overdue': return isWorkOrderOverdue(wo.due_date, wo.status);
      case 'faults': return wo.type === 'corrective' && !['completed', 'closed'].includes(wo.status);
      case 'scheduled': return wo.status === 'scheduled';
      case 'in_progress': return wo.status === 'in_progress';
      case 'completed': return wo.status === 'completed';
      default: return true;
    }
  });

  const counts = {
    all: workOrders.length,
    overdue: workOrders.filter(wo => isWorkOrderOverdue(wo.due_date, wo.status)).length,
    faults: workOrders.filter(wo => wo.type === 'corrective' && !['completed', 'closed'].includes(wo.status)).length,
    scheduled: workOrders.filter(wo => wo.status === 'scheduled').length,
    in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
  };

  const formatDue = (dateString: string | null, overdueFlag: boolean) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
    if (overdueFlag) {
      const dayDiff = Math.abs(diffDays) || 0;
      return `Forfalt · ${dayDiff} ${dayDiff === 1 ? 'dag' : 'dager'}`;
    }
    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I morgen';
    if (diffDays > 0 && diffDays < 7) return `Om ${diffDays} dager`;
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const handleStart = async (wo: WorkOrder) => {
    setStartError(null);
    try {
      await updateWorkOrder(wo.id, { status: 'in_progress' });
      onStatusChange?.();
    } catch (err) {
      console.error(err);
      setStartError(err instanceof Error ? err.message : 'Kunne ikke starte arbeidsordre. Prøv igjen.');
    }
  };

  const handleCompleteSuccess = () => {
    setWorkOrderToComplete(null);
    onStatusChange?.();
  };

  return (
    <div className="space-y-3">
      {startError && (
        <div className="bg-rustBg border border-rust/30 rounded-[14px] p-3">
          <p className="text-rust text-sm">{startError}</p>
        </div>
      )}

      {showFilters && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(
            [
              { key: 'all',         label: `Alle · ${counts.all}` },
              { key: 'overdue',     label: `Forfalt · ${counts.overdue}` },
              { key: 'faults',      label: `Feil · ${counts.faults}` },
              { key: 'scheduled',   label: `Planlagt · ${counts.scheduled}` },
              { key: 'in_progress', label: `Pågår · ${counts.in_progress}` },
              { key: 'completed',   label: `Fullført · ${counts.completed}` },
            ] as { key: FilterTab; label: string }[]
          ).map(tab => {
            const on = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[13px] font-medium ${
                  on ? 'bg-ink text-paper' : 'bg-paper text-ink border border-line'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {filteredWorkOrders.length === 0 ? (
        <div className="bg-paper rounded-[18px] p-8 text-center border border-line">
          <p className="text-ink2 text-sm">Ingen arbeidsordre funnet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredWorkOrders.map(wo => {
            const overdueFlag = isWorkOrderOverdue(wo.due_date, wo.status);
            const tagKey = statusToTag(wo);
            const tag = TAG_STYLE[tagKey];
            return (
              <button
                key={wo.id}
                type="button"
                onClick={() => setWorkOrderToView(wo)}
                className={`text-left w-full bg-paper border rounded-[16px] px-4 py-3.5 ${
                  overdueFlag ? 'border-l-[3px] border-l-rust border-line' : 'border-line'
                }`}
              >
                <div className="flex justify-between items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-ink3 uppercase tracking-[0.08em]">
                      {typeLabel(wo.type)}
                    </div>
                    <div className="text-[15px] font-semibold text-ink tracking-tightish mt-1">
                      {wo.title}
                    </div>
                    {showEquipmentName && wo.equipment?.name && (
                      <div className="text-[13px] text-ink2 mt-0.5">{wo.equipment.name}</div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${tag.bg} ${tag.fg}`}
                  >
                    {tag.label}
                  </span>
                </div>

                <div
                  className="mt-2.5 pt-2.5 flex justify-between items-center text-[12px] text-ink3"
                  style={{ borderTop: '1px dashed var(--line)' }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FaRegClock className="text-[12px]" />
                    {formatDue(wo.due_date, overdueFlag) || priorityLabels[wo.priority]}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    {wo.status === 'open' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleStart(wo); }}
                        className="inline-flex items-center gap-1 text-ink font-medium"
                      >
                        <FaPlay className="text-[10px]" /> Start
                      </button>
                    )}
                    {['in_progress', 'waiting_parts'].includes(wo.status) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setWorkOrderToComplete(wo); }}
                        className="inline-flex items-center gap-1 text-moss font-semibold"
                      >
                        <FaCheckCircle className="text-[10px]" /> Fullfør
                      </button>
                    )}
                    <span className="text-ink font-medium">Åpne →</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {workOrderToComplete && (
        <CompleteWorkOrderModal
          workOrder={workOrderToComplete}
          onClose={() => setWorkOrderToComplete(null)}
          onSuccess={handleCompleteSuccess}
        />
      )}

      {workOrderToView && (
        <WorkOrderDetailModal
          workOrder={workOrderToView}
          onClose={() => setWorkOrderToView(null)}
          // Keep the modal open on updates (e.g. "Start arbeid") so the user
          // can go straight to "Bekreft reparasjon" without reopening it.
          onUpdate={() => onStatusChange?.()}
        />
      )}
    </div>
  );
}
