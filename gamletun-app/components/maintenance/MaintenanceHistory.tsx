'use client';

import { useState } from 'react';
import { FaTools, FaCalendar, FaEdit } from 'react-icons/fa';
import { HiClock } from 'react-icons/hi';
import EditMaintenanceModal from './EditMaintenanceModal';

interface MaintenanceLog {
  id: string;
  description: string | null;
  performed_date: string;
  created_at: string;
  maintenance_type: {
    type_name: string;
  } | null;
}

interface MaintenanceHistoryProps {
  logs: MaintenanceLog[];
  equipmentName: string;
  onUpdate: () => void;
}

export default function MaintenanceHistory({ logs, equipmentName, onUpdate }: MaintenanceHistoryProps) {
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center">
        <FaTools className="text-4xl text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Ingen vedlikeholdshistorikk ennå</p>
        <p className="text-sm text-gray-500 mt-1">Klikk på "Logg Vedlikehold" for å legge til</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <HiClock className="text-2xl text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Vedlikeholdshistorikk</h3>
            <p className="text-sm text-gray-600">{equipmentName}</p>
          </div>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                    <FaTools className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {log.maintenance_type?.type_name || 'Vedlikehold'}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <FaCalendar className="text-xs" />
                      <span>{formatDate(log.performed_date)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingLog(log)}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  title="Rediger vedlikehold"
                >
                  <FaEdit className="text-lg" />
                </button>
              </div>

              {log.description && (
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-lg p-3 mt-3">
                  {log.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <EditMaintenanceModal
          log={editingLog}
          equipmentName={equipmentName}
          onClose={() => setEditingLog(null)}
          onSuccess={() => {
            setEditingLog(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
