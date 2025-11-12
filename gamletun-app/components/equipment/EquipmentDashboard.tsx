'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaTruckMoving, FaTools, FaPlus, FaTractor, FaEdit, FaHandPaper, FaCalendarAlt } from 'react-icons/fa';
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
  image_url: string | null;
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

  const totalEquipment = equipment.length;

  // Count all maintenance registrations in last 30 days
  const maintenanceLast30Days = recentMaintenance.length;

  return (
    <>
      {/* Compact Stats Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 mb-6">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {/* Totalt Utstyr */}
          <Link
            href="/overview/equipment"
            className="flex flex-col items-center text-center hover:bg-blue-50 rounded-xl p-2 transition-colors cursor-pointer group"
          >
            <div className="bg-blue-100 p-2 sm:p-3 rounded-xl mb-2 group-hover:scale-110 transition-transform">
              <MdConstruction className="text-xl sm:text-2xl text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Utstyr</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{totalEquipment}</p>
          </Link>

          {/* Kategorier */}
          <Link
            href="/overview/categories"
            className="flex flex-col items-center text-center border-x border-gray-200 hover:bg-green-50 rounded-xl p-2 transition-colors cursor-pointer group"
          >
            <div className="bg-green-100 p-2 sm:p-3 rounded-xl mb-2 group-hover:scale-110 transition-transform">
              <FaTools className="text-xl sm:text-2xl text-green-600" />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Kategorier</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{categories.length}</p>
          </Link>

          {/* Vedlikehold */}
          <Link
            href="/overview/maintenance"
            className="flex flex-col items-center text-center hover:bg-purple-50 rounded-xl p-2 transition-colors cursor-pointer group"
          >
            <div className="bg-purple-100 p-2 sm:p-3 rounded-xl mb-2 group-hover:scale-110 transition-transform">
              <BsCalendar3 className="text-xl sm:text-2xl text-purple-600" />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">30 dager</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{maintenanceLast30Days}</p>
          </Link>
        </div>
      </div>

      {/* Reservation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/overview/my-reservations"
          className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-xl group-hover:scale-110 transition-transform">
              <FaCalendarAlt className="text-3xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Mine Reservasjoner</h3>
              <p className="text-sm text-white/90 mt-1">Se dine utstyrsreservasjoner</p>
            </div>
          </div>
        </Link>

        <Link
          href="/overview/in-use"
          className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-xl group-hover:scale-110 transition-transform">
              <FaHandPaper className="text-3xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Utstyr i Bruk</h3>
              <p className="text-sm text-white/90 mt-1">Se hvem som bruker hva</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Add Equipment Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl hover:shadow-2xl active:scale-95 transition-all duration-200 font-semibold shadow-lg w-full sm:w-auto touch-manipulation min-h-[44px]"
        >
          <div className="bg-white/20 p-2 rounded-lg">
            <FaPlus className="text-lg sm:text-xl" />
          </div>
          <span className="text-base sm:text-lg">Nytt Utstyr</span>
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
                <Link
                  href={`/equipment/${item.id}`}
                  prefetch={true}
                  className="block p-6 border-b border-gray-100 cursor-pointer"
                  style={{
                    background: `linear-gradient(to bottom right, ${categoryColor}15, ${categoryColor}05)`
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Equipment Image or Icon */}
                      {item.image_url ? (
                        <div className="relative w-16 h-16 rounded-2xl shadow-lg group-hover:scale-110 transition-transform overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div
                          className="p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform text-3xl flex-shrink-0"
                          style={{
                            background: `linear-gradient(to bottom right, ${categoryColor}, ${categoryColor}dd)`
                          }}
                        >
                          {categoryIcon}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.model || 'Ingen modell'}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${
                      item.status === 'active' ? 'bg-green-100' :
                      item.status === 'in_use' ? 'bg-blue-100' :
                      item.status === 'maintenance' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      <span className={`text-xs font-semibold ${
                        item.status === 'active' ? 'text-green-700' :
                        item.status === 'in_use' ? 'text-blue-700' :
                        item.status === 'maintenance' ? 'text-yellow-700' :
                        'text-gray-700'
                      }`}>
                        {item.status === 'active' ? 'Aktiv' :
                         item.status === 'in_use' ? 'I bruk' :
                         item.status === 'maintenance' ? 'Vedlikehold' :
                         'Inaktiv'}
                      </span>
                    </div>
                  </div>
                </Link>

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
                      className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 px-3 sm:px-4 py-3 rounded-xl transition-all duration-200 font-medium touch-manipulation min-h-[44px]"
                      aria-label="Rediger utstyr"
                    >
                      <FaEdit className="text-lg" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMaintenanceEquipment(item);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 sm:px-4 py-3 rounded-xl hover:shadow-lg active:scale-95 transition-all duration-200 font-medium touch-manipulation min-h-[44px]"
                    >
                      <FaTools className="text-base sm:text-lg" />
                      <span className="text-sm sm:text-base">Logg Vedlikehold</span>
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
