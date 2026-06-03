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

  const openWorkOrders = workOrders.filter(wo =>
    !['completed', 'closed'].includes(wo.status)
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-serif text-[18px] font-medium text-ink tracking-tightish m-0">Arbeidsordre</h3>
          <p className="text-[13px] text-ink3 mt-0.5">
            {openWorkOrders.length} {openWorkOrders.length === 1 ? 'åpen ordre' : 'åpne ordrer'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rust text-white px-4 py-3 rounded-[14px] active:scale-[0.98] transition-transform font-semibold text-[14px] min-h-[44px]"
          >
            <FaExclamationTriangle /> <span>Meld feil</span>
          </button>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-moss text-white px-4 py-3 rounded-[14px] active:scale-[0.98] transition-transform font-semibold text-[14px] min-h-[44px]"
          >
            <FaCalendarAlt /> <span>Planlegg</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse motion-reduce:animate-none space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-line/60 rounded-[14px]"></div>
          ))}
        </div>
      ) : workOrders.length > 0 ? (
        <WorkOrderList
          workOrders={workOrders}
          showEquipmentName={false}
          onStatusChange={handleSuccess}
        />
      ) : (
        <div className="bg-bg border border-dashed border-line rounded-[16px] p-8 text-center">
          <FaCalendarAlt className="text-3xl text-ink3 mx-auto mb-3" />
          <h4 className="text-[15px] font-semibold text-ink mb-1.5">
            Ingen arbeidsordre registrert
          </h4>
          <p className="text-[13px] text-ink3 mb-4">
            Opprett en arbeidsordre for å planlegge vedlikehold eller melde feil
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-rust text-white px-4 py-2.5 rounded-[12px] font-semibold text-[14px]"
            >
              <FaExclamationTriangle /> <span>Meld feil</span>
            </button>
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-moss text-white px-4 py-2.5 rounded-[12px] font-semibold text-[14px]"
            >
              <FaCalendarAlt /> <span>Planlegg</span>
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
