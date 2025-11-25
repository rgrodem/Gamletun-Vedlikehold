'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaTools, FaPlus, FaSearch, FaCalendarCheck, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { MdConstruction } from 'react-icons/md';
import { BsCalendar3 } from 'react-icons/bs';
import AddEquipmentModal from './AddEquipmentModal';
import LogMaintenanceModal from '../maintenance/LogMaintenanceModal';
import EditEquipmentModal from './EditEquipmentModal';
import QuickStatsBar from './QuickStatsBar';

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
  equipment_id: string;
  performed_date?: string;
}

interface NextWorkOrder {
  equipment_id: string;
  due_date: string;
  title: string;
}

interface Props {
  categories: Category[];
  equipment: Equipment[];
  recentMaintenance: MaintenanceLog[];
  workOrderCounts: Record<string, number>;
  lastMaintenanceDates?: Record<string, string>;
  nextWorkOrders?: NextWorkOrder[];
}

export default function EquipmentDashboard({
  categories,
  equipment,
  recentMaintenance,
  workOrderCounts,
  lastMaintenanceDates = {},
  nextWorkOrders = []
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipment | null>(null);
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  // Calculate stats
  const totalEquipment = equipment.length;
  const maintenanceLast30Days = recentMaintenance.length;
  const inUseCount = equipment.filter(e => e.status === 'in_use').length;
  const maintenanceCount = equipment.filter(e => e.status === 'maintenance').length;
  const totalOpenWorkOrders = Object.values(workOrderCounts).reduce((a, b) => a + b, 0);

  // Create lookup for next work order by equipment
  const nextWorkOrderByEquipment: Record<string, NextWorkOrder> = {};
  nextWorkOrders.forEach(wo => {
    if (!nextWorkOrderByEquipment[wo.equipment_id] ||
        new Date(wo.due_date) < new Date(nextWorkOrderByEquipment[wo.equipment_id].due_date)) {
      nextWorkOrderByEquipment[wo.equipment_id] = wo;
    }
  });

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Format relative date
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`;
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const formatFutureDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Forfalt';
    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I morgen';
    if (diffDays < 7) return `Om ${diffDays} dager`;
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Compact Quick Stats Bar */}
      <QuickStatsBar
        totalEquipment={totalEquipment}
        inUseCount={inUseCount}
        maintenanceCount={maintenanceCount}
        openWorkOrders={totalOpenWorkOrders}
        maintenanceLast30Days={maintenanceLast30Days}
        onFilterChange={(filter) => {
          if (filter === 'in_use') setStatusFilter('in_use');
          else if (filter === 'maintenance') setStatusFilter('maintenance');
          else setStatusFilter('all');
        }}
        activeFilter={statusFilter}
      />

      {/* Actions & Filters - More Compact */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative group flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Søk etter utstyr..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all outline-none text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none cursor-pointer text-sm"
            >
              <option value="all">Alle kategorier</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none cursor-pointer text-sm"
            >
              <option value="all">Alle statuser</option>
              <option value="active">Aktiv</option>
              <option value="in_use">I bruk</option>
              <option value="maintenance">Vedlikehold</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all font-medium text-sm whitespace-nowrap"
          >
            <FaPlus className="text-xs" />
            <span>Nytt Utstyr</span>
          </button>
        </div>

        {/* Active filters indicator */}
        {(searchTerm || selectedCategory !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Aktive filter:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                Søk: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">×</button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                {categories.find(c => c.id === selectedCategory)?.name}
                <button onClick={() => setSelectedCategory('all')} className="hover:text-green-900">×</button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                {statusFilter === 'active' ? 'Aktiv' : statusFilter === 'in_use' ? 'I bruk' : statusFilter === 'maintenance' ? 'Vedlikehold' : 'Inaktiv'}
                <button onClick={() => setStatusFilter('all')} className="hover:text-purple-900">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
            >
              Nullstill alle
            </button>
          </div>
        )}
      </div>

      {/* Equipment Grid - Enhanced Cards */}
      {filteredEquipment.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEquipment.map((item) => {
            const categoryColor = item.category?.color || '#6b7280';
            const categoryIcon = item.category?.icon || '⚙️';
            const openWorkOrders = workOrderCounts[item.id] || 0;
            const lastMaintenance = lastMaintenanceDates[item.id];
            const nextWorkOrder = nextWorkOrderByEquipment[item.id];

            return (
              <div
                key={item.id}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full"
              >
                {/* Image Section */}
                <Link href={`/equipment/${item.id}`} className="relative h-36 bg-gray-50 overflow-hidden block">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-20" style={{ color: categoryColor }}>
                      {categoryIcon}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                      item.status === 'active' ? 'bg-green-500/90 text-white' :
                      item.status === 'in_use' ? 'bg-blue-500/90 text-white' :
                      item.status === 'maintenance' ? 'bg-yellow-500/90 text-white' :
                      'bg-gray-500/90 text-white'
                    }`}>
                      {item.status === 'active' ? 'Aktiv' :
                       item.status === 'in_use' ? 'I bruk' :
                       item.status === 'maintenance' ? 'Vedlikehold' :
                       'Inaktiv'}
                    </span>
                  </div>

                  {/* Work Order Badge - Clickable */}
                  {openWorkOrders > 0 && (
                    <Link
                      href={`/work-orders?equipment=${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 left-3 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse flex items-center gap-1 transition-colors"
                    >
                      <FaTools className="text-[8px]" />
                      {openWorkOrders}
                    </Link>
                  )}
                </Link>

                {/* Content Section */}
                <div className="p-4 flex-1 flex flex-col">
                  <Link href={`/equipment/${item.id}`} className="block">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                      {item.category?.name || 'Ukategorisert'}
                    </p>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    {item.model && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.model}</p>
                    )}
                  </Link>

                  {/* Maintenance Info - NEW */}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    {/* Last Maintenance */}
                    <div className="flex items-center gap-2 text-xs">
                      <FaClock className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">Siste:</span>
                      <span className={`font-medium ${lastMaintenance ? 'text-gray-700' : 'text-orange-600'}`}>
                        {lastMaintenance ? formatRelativeDate(lastMaintenance) : 'Aldri'}
                      </span>
                    </div>

                    {/* Next Work Order */}
                    <div className="flex items-center gap-2 text-xs">
                      <FaCalendarCheck className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">Neste:</span>
                      {nextWorkOrder ? (
                        <span className={`font-medium truncate ${
                          new Date(nextWorkOrder.due_date) < new Date() ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {formatFutureDate(nextWorkOrder.due_date)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Ingen planlagt</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-auto pt-3 flex gap-2">
                    <Link
                      href={`/equipment/${item.id}`}
                      className="flex-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 rounded-lg transition-colors"
                    >
                      Detaljer →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
            <FaSearch className="text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Ingen utstyr funnet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Prøv å justere filtrene for å finne det du leter etter.'
              : 'Kom i gang ved å legge til ditt første utstyr.'}
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setStatusFilter('all');
              if (!searchTerm && selectedCategory === 'all' && statusFilter === 'all') setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            {searchTerm || selectedCategory !== 'all' || statusFilter !== 'all' ? 'Nullstill filter' : 'Legg til utstyr'}
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
