'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaTools, FaEdit, FaTrash, FaFileExport, FaHandPaper } from 'react-icons/fa';
import { HiClock } from 'react-icons/hi';
import MaintenanceHistory from '../maintenance/MaintenanceHistory';
import LogMaintenanceModal from '../maintenance/LogMaintenanceModal';
import EditEquipmentModal from './EditEquipmentModal';
import WorkOrderSection from '../work-orders/WorkOrderSection';
import DocumentSection from './DocumentSection';
import ReservationModal from '../reservations/ReservationModal';
import ActiveReservationBadge from '../reservations/ActiveReservationBadge';
import { getActiveReservationForEquipment, type Reservation } from '@/lib/reservations';

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
  image_url: string | null;
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
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [loadingReservation, setLoadingReservation] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadActiveReservation();
  }, [equipment.id]);

  const loadActiveReservation = async () => {
    try {
      const reservation = await getActiveReservationForEquipment(equipment.id);
      setActiveReservation(reservation);
    } catch (error) {
      console.error('Error loading reservation:', error);
    } finally {
      setLoadingReservation(false);
    }
  };

  const handleSuccess = () => {
    loadActiveReservation();
    router.refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_use':
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
      case 'in_use':
        return 'I bruk';
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FaArrowLeft className="text-xs" />
        <span>Tilbake til oversikt</span>
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex gap-4">
            {/* Equipment Image or Icon */}
            {equipment.image_url ? (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-md overflow-hidden flex-shrink-0">
                <Image
                  src={equipment.image_url}
                  alt={equipment.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 64px, 80px"
                />
              </div>
            ) : (
              equipment.category && (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-md flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0"
                  style={{
                    background: `linear-gradient(to bottom right, ${equipment.category.color}, ${equipment.category.color}dd)`
                  }}
                >
                  {equipment.category.icon}
                </div>
              )
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{equipment.name}</h1>
              {equipment.model && (
                <p className="text-sm text-gray-600 mb-2">Modell: {equipment.model}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(equipment.status)}`}
                >
                  {getStatusText(equipment.status)}
                </span>
                {equipment.category && (
                  <span className="text-xs text-gray-500">
                    {equipment.category.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!activeReservation && equipment.status !== 'maintenance' && (
              <button
                onClick={() => setShowReservationModal(true)}
                disabled={loadingReservation}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                <FaHandPaper className="text-xs" />
                <span>Reserver</span>
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <FaEdit className="text-xs" />
              <span>Rediger</span>
            </button>
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <FaTools className="text-xs" />
              <span>Logg Vedlikehold</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <FaFileExport className="text-xs" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Reservation Badge */}
      {activeReservation && (
        <ActiveReservationBadge reservation={activeReservation} onUpdate={handleSuccess} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <HiClock className="text-xl text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Totalt vedlikehold</p>
              <p className="text-xl font-bold text-gray-900">{maintenanceLogs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <FaTools className="text-xl text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Siste vedlikehold</p>
              <p className="text-base font-bold text-gray-900">
                {maintenanceLogs.length > 0
                  ? new Date(maintenanceLogs[0].performed_date).toLocaleDateString('nb-NO')
                  : 'Aldri'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <FaEdit className="text-xl text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Opprettet</p>
              <p className="text-base font-bold text-gray-900">
                {new Date(equipment.created_at).toLocaleDateString('nb-NO')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Orders */}
      <WorkOrderSection equipment={{ id: equipment.id, name: equipment.name }} onUpdate={handleSuccess} />

      {/* Documents */}
      <DocumentSection equipmentId={equipment.id} onUpdate={handleSuccess} />

      {/* Maintenance History */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <MaintenanceHistory logs={maintenanceLogs} equipmentName={equipment.name} onUpdate={handleSuccess} />
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

      {showReservationModal && (
        <ReservationModal
          equipment={equipment}
          onClose={() => setShowReservationModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
