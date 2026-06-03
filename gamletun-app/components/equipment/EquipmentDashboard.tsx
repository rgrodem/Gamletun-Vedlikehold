'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaPlus, FaChevronRight } from 'react-icons/fa';
import ReportFaultModal from '../work-orders/ReportFaultModal';
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
  equipment_id: string;
  performed_date?: string;
}

interface NextWorkOrder {
  equipment_id: string;
  due_date: string;
  title: string;
}

interface ReservationSummary {
  id: string;
  equipment_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  notes: string | null;
  user_profile?: {
    id: string;
    full_name: string;
  } | null;
}

interface Props {
  categories: Category[];
  equipment: Equipment[];
  reservations: ReservationSummary[];
  recentMaintenance: MaintenanceLog[];
  workOrderCounts: Record<string, number>;
  lastMaintenanceDates?: Record<string, string>;
  nextWorkOrders?: NextWorkOrder[];
}

type StatusKey = 'in_use' | 'active' | 'maintenance' | 'inactive';
type DisplayStatusKey = StatusKey | 'reserved';

const STATUS_PILL: Record<DisplayStatusKey, { bg: string; fg: string; dot: string; label: string }> = {
  in_use:      { bg: 'bg-skyBg',   fg: 'text-sky',   dot: 'bg-sky',   label: 'I bruk' },
  reserved:    { bg: 'bg-rustBg',  fg: 'text-rust',  dot: 'bg-rust',  label: 'Reservert' },
  active:      { bg: 'bg-mossBg',  fg: 'text-moss',  dot: 'bg-moss',  label: 'Klar' },
  maintenance: { bg: 'bg-amberBg', fg: 'text-amber', dot: 'bg-amber', label: 'Vedlikehold' },
  inactive:    { bg: 'bg-line2',   fg: 'text-ink3',  dot: 'bg-ink3',  label: 'Inaktiv' },
};

function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const s = (STATUS_PILL[status as DisplayStatusKey] ?? STATUS_PILL.inactive);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-tightish ${s.bg} ${s.fg} ${
        small ? 'px-2 py-[2px] text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'God morgen';
  if (h < 17) return 'God dag';
  return 'God kveld';
}

function dateLabel(): string {
  return new Date().toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function EquipmentDashboard({
  categories,
  equipment,
  reservations,
  recentMaintenance,
  workOrderCounts,
  lastMaintenanceDates = {},
  nextWorkOrders = [],
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipment | null>(null);
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const [faultEquipment, setFaultEquipment] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const addFromNav = searchParams.get('add') === 'equipment';
  // Allow deep-linking to a pre-filtered category, e.g. from the equipment
  // detail page's "Kategori" tile (/?category=<id>).
  const categoryFromUrl = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryFromUrl && categories.some((c) => c.id === categoryFromUrl) ? categoryFromUrl : 'all'
  );

  const handleSuccess = () => router.refresh();
  const handleCloseAddModal = () => {
    setShowAddModal(false);
    if (addFromNav) router.replace('/', { scroll: false });
  };
  const now = new Date();

  useEffect(() => {
    if (addFromNav) setShowAddModal(true);
  }, [addFromNav]);

  const reservationsByEquipment = useMemo(() => {
    const map = new Map<string, ReservationSummary>();
    reservations.forEach((reservation) => {
      const existing = map.get(reservation.equipment_id);
      if (!existing || new Date(reservation.start_time) < new Date(existing.start_time)) {
        map.set(reservation.equipment_id, reservation);
      }
    });
    return map;
  }, [reservations]);

  // Attention-card stats
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  const toDueDate = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(value);
  };
  const overdueCount = nextWorkOrders.filter(w => toDueDate(w.due_date) < todayStart).length;
  const openOrdersCount = Object.values(workOrderCounts).reduce((a, b) => a + b, 0);
  const thisWeekCount = nextWorkOrders.filter(w => {
    const d = toDueDate(w.due_date);
    return d >= todayStart && d <= weekEnd;
  }).length;
  const attentionTotal = openOrdersCount;

  // Category chip counts
  const categoryChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = [
      { id: 'all', label: `Alt · ${equipment.length}` },
    ];
    categories.forEach(c => {
      const count = equipment.filter(e => e.category_id === c.id).length;
      if (count > 0) chips.push({ id: c.id, label: `${c.name} · ${count}` });
    });
    return chips;
  }, [categories, equipment]);

  const filtered = equipment.filter(e => {
    const matchSearch =
      !searchTerm ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' || e.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      {/* Greeting + date */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-[13px] text-ink3">{dateLabel()}</div>
          <h1 className="font-serif text-[28px] font-medium text-ink tracking-tight2 mt-0.5 leading-tight">
            {greeting()}
          </h1>
        </div>
      </div>

      {/* Attention card */}
      <Link
        href="/work-orders?filter=all_open"
        className="block rounded-[20px] bg-ink text-paper p-[18px] pb-4 overflow-hidden relative"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
          Krever oppmerksomhet
        </div>
        <div className="font-serif text-[34px] font-medium tracking-tight2 leading-none mt-1">
          {attentionTotal} {attentionTotal === 1 ? 'sak' : 'saker'}
        </div>
        <div className="flex gap-2.5 mt-4">
          <AttentionTile count={overdueCount} label="Forfalt" tone="rust" />
          <AttentionTile count={openOrdersCount} label="Åpne ordrer" tone="rust" />
          <AttentionTile count={thisWeekCount} label="Denne uken" tone="moss" />
        </div>
      </Link>

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-paper border border-line rounded-[14px] px-3.5 py-3.5 text-ink3">
        <FaSearch className="text-[16px] flex-shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Søk etter utstyr, kategori…"
          className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink3 outline-none"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-0.5">
        {categoryChips.map((c) => {
          const active = c.id === selectedCategory;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`flex-shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink border border-line'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Section header */}
      <div className="flex items-baseline justify-between pt-1">
        <h2 className="font-serif text-[20px] font-medium text-ink tracking-tightish m-0">
          Alt utstyr
        </h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink font-medium"
        >
          <FaPlus className="text-[11px]" /> Legg til
        </button>
      </div>

      {/* Equipment list */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {filtered.map((e) => {
            const wo = workOrderCounts[e.id] || 0;
            const tint = e.category?.color || '#4c6a3a';
            const icon = e.category?.icon || '⚙️';
            const reservation = reservationsByEquipment.get(e.id);
            const reservationStarted = reservation ? new Date(reservation.start_time) <= now : false;
            const displayStatus =
              e.status === 'maintenance' || e.status === 'inactive'
                ? e.status
                : reservation
                  ? reservationStarted ? 'in_use' : 'reserved'
                  : e.status === 'in_use' ? 'active' : e.status;
            const reservationTime = reservation
              ? new Date(reservation.start_time).toLocaleString('nb-NO', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;
            return (
              <Link
                key={e.id}
                href={`/equipment/${e.id}`}
                className="flex items-center gap-3.5 bg-paper border border-line rounded-[18px] p-3.5"
              >
                <div
                  className="relative w-16 h-16 rounded-[14px] flex-shrink-0 flex items-center justify-center text-[28px] border border-line overflow-hidden"
                  style={{
                    background: `repeating-linear-gradient(135deg, ${tint}22 0 6px, ${tint}11 6px 12px)`,
                  }}
                >
                  {e.image_url ? (
                    <Image src={e.image_url} alt={e.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <span>{icon}</span>
                  )}
                  {wo > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 bg-rust text-white text-[11px] font-bold rounded-full flex items-center justify-center border-[2px] border-paper"
                      style={{ minWidth: 20, height: 20, padding: '0 4px' }}
                    >
                      {wo}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-semibold text-ink tracking-tightish truncate">
                    {e.name}
                  </div>
                  {e.model && (
                    <div className="text-[13px] text-ink3 mt-[2px] truncate">{e.model}</div>
                  )}
                  <div className="mt-2">
                    <StatusPill status={displayStatus} small />
                  </div>
                  {reservation && (
                    <div className="text-[12px] text-ink3 mt-1 truncate">
                      {reservationStarted ? 'Brukes av' : 'Reservert av'} {reservation.user_profile?.full_name || 'ukjent bruker'}
                      {reservationTime ? ` fra ${reservationTime}` : ''}
                    </div>
                  )}
                </div>

                <FaChevronRight className="text-ink3 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-paper border border-line rounded-[18px] p-8 text-center">
          <p className="text-ink2 mb-4 text-sm">Ingen utstyr funnet.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              if (!searchTerm && selectedCategory === 'all') setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[14px] font-medium text-sm"
          >
            {searchTerm || selectedCategory !== 'all' ? 'Nullstill' : 'Legg til utstyr'}
          </button>
        </div>
      )}

      <div className="h-6" />

      {/* Modals */}
      {showAddModal && (
        <AddEquipmentModal
          categories={categories}
          onClose={handleCloseAddModal}
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
      {faultEquipment && (
        <ReportFaultModal
          equipment={faultEquipment}
          onClose={() => setFaultEquipment(null)}
          onSuccess={() => { setFaultEquipment(null); handleSuccess(); }}
        />
      )}
    </div>
  );
}

function AttentionTile({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'rust' | 'moss';
}) {
  const color = tone === 'rust' ? '#e9c0a5' : '#d5deb0';
  return (
    <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="text-[22px] font-semibold leading-none" style={{ color }}>
        {count}
      </div>
      <div className="text-[11px] opacity-75 mt-0.5">{label}</div>
    </div>
  );
}
