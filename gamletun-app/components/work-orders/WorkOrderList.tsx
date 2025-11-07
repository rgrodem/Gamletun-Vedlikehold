'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  WorkOrder,
  WorkOrderStatus,
  statusLabels,
  statusColors,
  priorityColors,
  priorityLabels,
  typeIcons,
  updateWorkOrder
} from '@/lib/work-orders';
import { FaExternalLinkAlt, FaPlay, FaCheckCircle } from 'react-icons/fa';
import CompleteWorkOrderModal from './CompleteWorkOrderModal';
import WorkOrderDetailModal from './WorkOrderDetailModal';

interface WorkOrderListProps {
  workOrders: WorkOrder[];
  showEquipmentName?: boolean;
  onStatusChange?: () => void;
}

type FilterTab = 'all' | 'overdue' | 'faults' | 'scheduled' | 'in_progress' | 'completed';

export default function WorkOrderList({
  workOrders,
  showEquipmentName = true,
  onStatusChange
}: WorkOrderListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [workOrderToComplete, setWorkOrderToComplete] = useState<WorkOrder | null>(null);
  const [workOrderToView, setWorkOrderToView] = useState<WorkOrder | null>(null);

  // Filter work orders based on active tab
  const filteredWorkOrders = workOrders.filter(wo => {
    const now = new Date();
    const dueDate = wo.due_date ? new Date(wo.due_date) : null;
    const isOverdue = dueDate && dueDate < now && !['completed', 'closed'].includes(wo.status);

    switch (activeTab) {
      case 'overdue':
        return isOverdue;
      case 'faults':
        return wo.type === 'corrective' && !['completed', 'closed'].includes(wo.status);
      case 'scheduled':
        return wo.status === 'scheduled';
      case 'in_progress':
        return wo.status === 'in_progress';
      case 'completed':
        return wo.status === 'completed';
      default:
        return true;
    }
  });

  // Calculate counts for tabs
  const counts = {
    all: workOrders.length,
    overdue: workOrders.filter(wo => {
      const dueDate = wo.due_date ? new Date(wo.due_date) : null;
      return dueDate && dueDate < new Date() && !['completed', 'closed'].includes(wo.status);
    }).length,
    faults: workOrders.filter(wo => wo.type === 'corrective' && !['completed', 'closed'].includes(wo.status)).length,
    scheduled: workOrders.filter(wo => wo.status === 'scheduled').length,
    in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate: string | null, status: WorkOrderStatus) => {
    if (!dueDate || ['completed', 'closed'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const handleStartWorkOrder = async (workOrder: WorkOrder) => {
    try {
      await updateWorkOrder(workOrder.id, { status: 'in_progress' });
      onStatusChange?.();
    } catch (error) {
      console.error('Error starting work order:', error);
      alert('Kunne ikke starte arbeidsordre');
    }
  };

  const handleCompleteSuccess = () => {
    setWorkOrderToComplete(null);
    onStatusChange?.();
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
        {([
          { key: 'all', label: 'Alle' },
          { key: 'overdue', label: 'Forfalt' },
          { key: 'faults', label: 'Feil' },
          { key: 'scheduled', label: 'Planlagt' },
          { key: 'in_progress', label: 'Pågår' },
          { key: 'completed', label: 'Fullført' },
        ] as { key: FilterTab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all touch-manipulation min-h-[40px] ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Work Orders List */}
      {filteredWorkOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <p className="text-gray-500">Ingen arbeidsordre funnet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkOrders.map(wo => {
            const overdueFlag = isOverdue(wo.due_date, wo.status);

            return (
              <div
                key={wo.id}
                className={`bg-white rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${
                  overdueFlag ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      {/* Type Icon */}
                      <span className="text-2xl flex-shrink-0">{typeIcons[wo.type]}</span>

                      {/* Title and Equipment */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {showEquipmentName && wo.equipment?.name && (
                            <span className="font-semibold text-gray-900">{wo.equipment.name}</span>
                          )}
                          {showEquipmentName && wo.equipment?.name && <span className="text-gray-400">•</span>}
                          <h3 className="font-medium text-gray-900">{wo.title}</h3>
                        </div>

                        {/* Status, Priority, Due Date */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Status Badge */}
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${statusColors[wo.status]}`}>
                            {statusLabels[wo.status]}
                          </span>

                          {/* Priority Badge */}
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium border bg-white ${priorityColors[wo.priority]}`}>
                            {priorityLabels[wo.priority]}
                          </span>

                          {/* Due Date */}
                          {wo.due_date && (
                            <span className={`text-xs ${overdueFlag ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                              Frist: {formatDate(wo.due_date)}
                              {overdueFlag && ' (forfalt!)'}
                            </span>
                          )}

                          {/* Recurring indicator */}
                          {wo.is_recurring && (
                            <span className="text-xs text-blue-600 font-medium">🔄 Gjentas</span>
                          )}
                        </div>

                        {/* Description */}
                        {wo.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{wo.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {wo.status === 'open' && (
                      <button
                        onClick={() => handleStartWorkOrder(wo)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium touch-manipulation min-h-[44px] min-w-[44px]"
                        title="Start"
                      >
                        <FaPlay className="text-sm" />
                        <span className="hidden sm:inline">Start</span>
                      </button>
                    )}

                    {['in_progress', 'waiting_parts'].includes(wo.status) && (
                      <button
                        onClick={() => setWorkOrderToComplete(wo)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium touch-manipulation min-h-[44px] min-w-[44px]"
                        title="Fullfør"
                      >
                        <FaCheckCircle className="text-sm" />
                        <span className="hidden sm:inline">Fullfør</span>
                      </button>
                    )}

                    {/* View Details */}
                    <button
                      onClick={() => setWorkOrderToView(wo)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium touch-manipulation min-h-[44px] min-w-[44px]"
                      title="Åpne"
                    >
                      <FaExternalLinkAlt className="text-sm" />
                      <span className="hidden sm:inline">Åpne</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Work Order Modal */}
      {workOrderToComplete && (
        <CompleteWorkOrderModal
          workOrder={workOrderToComplete}
          onClose={() => setWorkOrderToComplete(null)}
          onSuccess={handleCompleteSuccess}
        />
      )}

      {/* Work Order Detail Modal */}
      {workOrderToView && (
        <WorkOrderDetailModal
          workOrder={workOrderToView}
          onClose={() => setWorkOrderToView(null)}
          onUpdate={() => {
            setWorkOrderToView(null);
            onStatusChange?.();
          }}
        />
      )}
    </div>
  );
}
