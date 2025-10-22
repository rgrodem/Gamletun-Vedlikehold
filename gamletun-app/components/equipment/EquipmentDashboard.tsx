'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaTruckMoving, FaTools, FaPlus, FaTractor, FaEdit } from 'react-icons/fa';
import { MdConstruction, MdOutlineSpeed } from 'react-icons/md';
import { HiDocumentReport, HiClock } from 'react-icons/hi';
import { BsCalendar3 } from 'react-icons/bs';
import AddEquipmentModal from './AddEquipmentModal';
import LogMaintenanceModal from '../maintenance/LogMaintenanceModal';
import EditEquipmentModal from './EditEquipmentModal';

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
  category_id: string | null;
  category: Category | null;
  notes: string | null;
}

interface MaintenanceLog {
  id: string;
}

interface Props {
  categories: Category[];
  equipment: Equipment[];
  recentMaintenance: MaintenanceLog[];
}

export default function EquipmentDashboard({ categories, equipment, recentMaintenance }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipment | null>(null);
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const handleEquipmentClick = (equipmentId: string) => {
    router.push(`/equipment/${equipmentId}`);
  };

  const totalEquipment = equipment.length;

  // Count all maintenance registrations in last 30 days
  const maintenanceLast30Days = recentMaintenance.length;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Totalt Utstyr</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalEquipment}</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-xl">
              <MdConstruction className="text-3xl text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Kategorier</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{categories.length}</p>
            </div>
            <div className="bg-green-100 p-4 rounded-xl">
              <FaTools className="text-3xl text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Vedlikehold siste 30 dager</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{maintenanceLast30Days}</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-xl">
              <BsCalendar3 className="text-3xl text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Equipment Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-2xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 font-semibold shadow-lg"
        >
          <div className="bg-white/20 p-2 rounded-lg">
            <FaPlus className="text-xl" />
          </div>
          <span>Nytt Utstyr</span>
        </button>
      </div>

      {/* Equipment Grid */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Alt Utstyr</h2>

      {equipment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => {
            const categoryColor = item.category?.color || '#6b7280';
            const categoryIcon = item.category?.icon || '⚙️';

            return (
              <div key={item.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:scale-[1.02]">
                <div
                  onClick={() => handleEquipmentClick(item.id)}
                  className="p-6 border-b border-gray-100 cursor-pointer"
                  style={{
                    background: `linear-gradient(to bottom right, ${categoryColor}15, ${categoryColor}05)`
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform text-3xl"
                        style={{
                          background: `linear-gradient(to bottom right, ${categoryColor}, ${categoryColor}dd)`
                        }}
                      >
                        {categoryIcon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.model || 'Ingen modell'}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${
                      item.status === 'active' ? 'bg-green-100' :
                      item.status === 'maintenance' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      <span className={`text-xs font-semibold ${
                        item.status === 'active' ? 'text-green-700' :
                        item.status === 'maintenance' ? 'text-yellow-700' :
                        'text-gray-700'
                      }`}>
                        {item.status === 'active' ? 'Aktiv' :
                         item.status === 'maintenance' ? 'Vedlikehold' :
                         'Inaktiv'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <HiClock className="text-lg" />
                    <span>Kategori: {item.category?.name || 'Ukjent'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditEquipment(item);
                      }}
                      className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-all duration-200 font-medium"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMaintenanceEquipment(item);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium group-hover:scale-[1.02]"
                    >
                      <FaTools />
                      <span>Logg Vedlikehold</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-12 text-center">
          <MdConstruction className="text-6xl text-blue-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen utstyr registrert ennå</h3>
          <p className="text-gray-600 mb-6">Kom i gang ved å legge til ditt første utstyr!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            <FaPlus />
            <span>Legg til utstyr</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddEquipmentModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {maintenanceEquipment && (
        <LogMaintenanceModal
          equipment={maintenanceEquipment}
          onClose={() => setMaintenanceEquipment(null)}
          onSuccess={handleSuccess}
        />
      )}

      {editEquipment && (
        <EditEquipmentModal
          equipment={editEquipment}
          categories={categories}
          onClose={() => setEditEquipment(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
