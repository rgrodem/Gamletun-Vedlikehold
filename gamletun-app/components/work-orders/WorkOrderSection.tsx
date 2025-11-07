'use client';

import { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaCalendarAlt, FaPlus } from 'react-icons/fa';
import { getWorkOrders, WorkOrder } from '@/lib/work-orders';
import WorkOrderList from './WorkOrderList';
import ReportFaultModal from './ReportFaultModal';
import ScheduleMaintenanceModal from './ScheduleMaintenanceModal';

interface Equipment {
  id: string;
  name: string;
}

interface WorkOrderSectionProps {
  equipment: Equipment;
  onUpdate: () => void;
}

export default function WorkOrderSection({ equipment, onUpdate }: WorkOrderSectionProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    loadWorkOrders();
  }, [equipment.id]);

  const loadWorkOrders = async () => {
    try {
      const data = await getWorkOrders({ equipment_id: equipment.id });
      setWorkOrders(data);
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    loadWorkOrders();
    onUpdate();
  };

  const handleStatusChange = () => {
    loadWorkOrders();
    onUpdate();
  };

  const openWorkOrders = workOrders.filter(wo =>
    !['completed', 'closed'].includes(wo.status)
  );

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Arbeidsordre</h2>
          <p className="text-sm text-gray-600 mt-1">
            {openWorkOrders.length} {openWorkOrders.length === 1 ? 'åpen ordre' : 'åpne ordrer'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-3 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200 font-medium touch-manipulation min-h-[44px]"
          >
            <FaExclamationTriangle className="text-lg" />
            <span>Meld feil</span>
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200 font-medium touch-manipulation min-h-[44px]"
          >
            <FaCalendarAlt className="text-lg" />
            <span>Planlegg vedlikehold</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      ) : workOrders.length > 0 ? (
        <WorkOrderList
          workOrders={workOrders}
          showEquipmentName={false}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <FaCalendarAlt className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Ingen arbeidsordre registrert
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Opprett en arbeidsordre for å planlegge vedlikehold eller melde feil
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <FaExclamationTriangle />
              <span>Meld feil</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <FaCalendarAlt />
              <span>Planlegg vedlikehold</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showReportModal && (
        <ReportFaultModal
          equipment={equipment}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            handleSuccess();
          }}
        />
      )}

      {showScheduleModal && (
        <ScheduleMaintenanceModal
          equipment={equipment}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            handleSuccess();
          }}
        />
      )}
    </div>
  );
}
