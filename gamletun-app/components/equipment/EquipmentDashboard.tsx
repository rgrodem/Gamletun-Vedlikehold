'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaTruckMoving, FaTools, FaPlus, FaTractor, FaEdit, FaSearch } from 'react-icons/fa';
import { MdConstruction, MdOutlineSpeed } from 'react-icons/md';
import { HiDocumentReport, HiClock } from 'react-icons/hi';
import { BsCalendar3 } from 'react-icons/bs';
import AddEquipmentModal from './AddEquipmentModal';
import LogMaintenanceModal from '../maintenance/LogMaintenanceModal';
import EditEquipmentModal from './EditEquipmentModal';
import WorkOrderDashboardCard from '../work-orders/WorkOrderDashboardCard';

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
  workOrderCounts: Record<string, number>;
}

export default function EquipmentDashboard({ categories, equipment, recentMaintenance, workOrderCounts }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipment | null>(null);
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const totalEquipment = equipment.length;
  const maintenanceLast30Days = recentMaintenance.length;

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Work Orders Overview */}
      <WorkOrderDashboardCard />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
            <MdConstruction className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Totalt Utstyr</p>
            <p className="text-2xl font-bold text-gray-900">{totalEquipment}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-green-50 rounded-xl text-green-600">
            <FaTools className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Kategorier</p>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 rounded-xl text-purple-600">
            <BsCalendar3 className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Vedlikehold (30d)</p>
            <p className="text-2xl font-bold text-gray-900">{maintenanceLast30Days}</p>
          </div>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Søk etter utstyr..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm cursor-pointer"
          >
            <option value="all">Alle kategorier</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 active:scale-95 transition-all font-semibold"
        >
          <FaPlus />
          <span>Nytt Utstyr</span>
        </button>
      </div>

      {/* Equipment Grid */}
      {filteredEquipment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => {
            const categoryColor = item.category?.color || '#6b7280';
            const categoryIcon = item.category?.icon || '⚙️';
            const openWorkOrders = workOrderCounts[item.id] || 0;

            return (
              <div key={item.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
                <Link href={`/equipment/${item.id}`} className="block relative h-48 bg-gray-50 overflow-hidden">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20" style={{ color: categoryColor }}>
                      {categoryIcon}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${item.status === 'active' ? 'bg-green-500/90 text-white' :
                        item.status === 'maintenance' ? 'bg-yellow-500/90 text-white' :
                          'bg-gray-500/90 text-white'
                      }`}>
                      {item.status === 'active' ? 'Aktiv' :
                        item.status === 'maintenance' ? 'Vedlikehold' :
                          'Inaktiv'}
                    </span>
                  </div>

                  {/* Work Order Badge */}
                  {openWorkOrders > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
                      <FaTools className="text-[10px]" />
                      {openWorkOrders}
                    </div>
                  )}
                </Link>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{item.category?.name || 'Ukjent'}</p>
                      <Link href={`/equipment/${item.id}`} className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                        {item.name}
                      </Link>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-4 line-clamp-1">{item.model || 'Ingen modellspesifikasjon'}</p>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditEquipment(item);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Rediger"
                    >
                      <FaEdit className="text-lg" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMaintenanceEquipment(item);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <FaTools />
                      <span>Logg</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
            <FaSearch className="text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen utstyr funnet</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? 'Prøv å justere søkeordene eller filteret for å finne det du leter etter.'
              : 'Kom i gang ved å legge til ditt første utstyr i systemet.'}
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              if (!searchTerm && selectedCategory === 'all') setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            {searchTerm || selectedCategory !== 'all' ? 'Nullstill filter' : 'Legg til utstyr'}
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
    </div>
  );
}

