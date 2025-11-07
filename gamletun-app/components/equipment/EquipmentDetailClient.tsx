'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaTools, FaEdit, FaTrash, FaFileExport } from 'react-icons/fa';
import { HiClock } from 'react-icons/hi';
import MaintenanceHistory from '../maintenance/MaintenanceHistory';
import LogMaintenanceModal from '../maintenance/LogMaintenanceModal';
import EditEquipmentModal from './EditEquipmentModal';
import WorkOrderSection from '../work-orders/WorkOrderSection';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Equipment {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  status: string;
  created_at: string;
  category: Category | null;
  category_id: string | null;
  notes: string | null;
}

interface MaintenanceLog {
  id: string;
  description: string | null;
  performed_date: string;
  created_at: string;
  maintenance_type: {
    type_name: string;
  } | null;
}

interface EquipmentDetailClientProps {
  equipment: Equipment;
  maintenanceLogs: MaintenanceLog[];
  categories: Category[];
}

export default function EquipmentDetailClient({
  equipment,
  maintenanceLogs,
  categories,
}: EquipmentDetailClientProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'maintenance':
        return 'Under vedlikehold';
      case 'inactive':
        return 'Inaktiv';
      default:
        return status;
    }
  };

  const exportToCSV = () => {
    const headers = ['Dato', 'Type', 'Beskrivelse'];
    const rows = maintenanceLogs.map(log => [
      new Date(log.performed_date).toLocaleDateString('nb-NO'),
      log.maintenance_type?.type_name || 'Vedlikehold',
      log.description || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${equipment.name}_vedlikehold_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <FaArrowLeft />
            <span>Tilbake til oversikt</span>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {equipment.category && (
                  <span className="text-3xl">{equipment.category.icon}</span>
                )}
                <h1 className="text-3xl font-bold text-gray-900">{equipment.name}</h1>
              </div>
              {equipment.model && (
                <p className="text-gray-600 mb-2">Modell: {equipment.model}</p>
              )}
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(equipment.status)}`}
                >
                  {getStatusText(equipment.status)}
                </span>
                {equipment.category && (
                  <span className="text-sm text-gray-500">
                    {equipment.category.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl transition-all duration-200 font-medium"
              >
                <FaEdit />
                <span>Rediger</span>
              </button>
              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
              >
                <FaTools />
                <span>Logg Vedlikehold</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
              >
                <FaFileExport />
                <span>Eksporter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <HiClock className="text-2xl text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Totalt vedlikehold</p>
                  <p className="text-2xl font-bold text-gray-900">{maintenanceLogs.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <FaTools className="text-2xl text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Siste vedlikehold</p>
                  <p className="text-lg font-bold text-gray-900">
                    {maintenanceLogs.length > 0
                      ? new Date(maintenanceLogs[0].performed_date).toLocaleDateString('nb-NO')
                      : 'Aldri'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <FaEdit className="text-2xl text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Opprettet</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(equipment.created_at).toLocaleDateString('nb-NO')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Orders */}
          <div className="lg:col-span-3">
            <WorkOrderSection equipment={{ id: equipment.id, name: equipment.name }} onUpdate={handleSuccess} />
          </div>

          {/* Maintenance History */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <MaintenanceHistory logs={maintenanceLogs} equipmentName={equipment.name} onUpdate={handleSuccess} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLogModal && (
        <LogMaintenanceModal
          equipment={equipment}
          onClose={() => setShowLogModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showEditModal && (
        <EditEquipmentModal
          equipment={equipment}
          categories={categories}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
