'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaEllipsisH, FaEdit, FaFileExport, FaCheck, FaExclamationTriangle, FaHandPaper } from 'react-icons/fa';
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

type StatusKey = 'in_use' | 'active' | 'maintenance' | 'inactive';
const PILL: Record<StatusKey, { bg: string; fg: string; dot: string; label: string }> = {
  in_use:      { bg: 'bg-skyBg',   fg: 'text-sky',   dot: 'bg-sky',   label: 'I bruk' },
  active:      { bg: 'bg-mossBg',  fg: 'text-moss',  dot: 'bg-moss',  label: 'Klar' },
  maintenance: { bg: 'bg-amberBg', fg: 'text-amber', dot: 'bg-amber', label: 'Vedlikehold' },
  inactive:    { bg: 'bg-line2',   fg: 'text-ink3',  dot: 'bg-ink3',  label: 'Inaktiv' },
};

function StatusPill({ status }: { status: string }) {
  const s = PILL[status as StatusKey] ?? PILL.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`;
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

export default function EquipmentDetailClient({
  equipment,
  maintenanceLogs,
  categories,
}: EquipmentDetailClientProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showMore, setShowMore] = useState(false);
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

  const tint = equipment.category?.color || '#4c6a3a';
  const icon = equipment.category?.icon || '⚙️';
  const lastDate = maintenanceLogs[0]?.performed_date;

  return (
    <div className="-mx-5 sm:-mx-6 lg:-mx-8 -mt-5 overflow-x-clip max-w-[100vw]">
      {/* Hero */}
      <div
        className="relative h-[200px] flex items-end p-4 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 40% 70%, ${tint}44 0%, transparent 55%),
            repeating-linear-gradient(135deg, ${tint}22 0 10px, ${tint}0e 10px 20px)
          `,
        }}
      >
        <Link
          href="/"
          aria-label="Tilbake"
          className="absolute top-4 left-4 w-10 h-10 rounded-full border border-line flex items-center justify-center text-ink"
          style={{ background: 'rgba(255,253,248,0.9)', backdropFilter: 'blur(8px)' }}
        >
          <FaArrowLeft className="text-[14px]" />
        </Link>
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          aria-label="Mer"
          className="absolute top-4 right-4 w-10 h-10 rounded-full border border-line flex items-center justify-center text-ink"
          style={{ background: 'rgba(255,253,248,0.9)', backdropFilter: 'blur(8px)' }}
        >
          <FaEllipsisH className="text-[14px]" />
        </button>

        {showMore && (
          <div className="absolute top-16 right-4 z-10 bg-paper border border-line rounded-[14px] py-1 shadow-md min-w-[180px]">
            <button
              type="button"
              onClick={() => { setShowEditModal(true); setShowMore(false); }}
              className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-line2 flex items-center gap-2"
            >
              <FaEdit className="text-ink3 text-xs" /> Rediger
            </button>
            <button
              type="button"
              onClick={() => { exportToCSV(); setShowMore(false); }}
              className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-line2 flex items-center gap-2"
            >
              <FaFileExport className="text-ink3 text-xs" /> Eksporter CSV
            </button>
            {!activeReservation && equipment.status !== 'maintenance' && (
              <button
                type="button"
                onClick={() => { setShowReservationModal(true); setShowMore(false); }}
                disabled={loadingReservation}
                className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-line2 flex items-center gap-2"
              >
                <FaHandPaper className="text-ink3 text-xs" /> Reserver
              </button>
            )}
          </div>
        )}

        {equipment.image_url ? (
          <div className="relative w-[96px] h-[96px] rounded-[18px] overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
            <Image src={equipment.image_url} alt={equipment.name} fill className="object-cover" sizes="96px" />
          </div>
        ) : (
          <div
            className="text-[80px] leading-none"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Title slab */}
      <div className="px-5 pt-5 sm:px-6 lg:px-8 min-w-0">
        <div className="text-[11px] font-semibold text-moss uppercase tracking-[0.1em]">
          {equipment.category?.name || 'Utstyr'}
        </div>
        <h1 className="font-serif text-[28px] font-medium text-ink tracking-tight2 leading-[1.1] mt-1 mb-1.5 break-words">
          {equipment.name}
        </h1>
        <div className="text-[14px] text-ink2 mb-3 break-words">
          {equipment.model || '—'}
          {equipment.serial_number && ` · Serienr. ${equipment.serial_number}`}
        </div>
        <StatusPill status={equipment.status} />
      </div>

      {activeReservation && (
        <div className="px-5 pt-4 sm:px-6 lg:px-8">
          <ActiveReservationBadge reservation={activeReservation} onUpdate={handleSuccess} />
        </div>
      )}

      {/* Metadata grid */}
      <div className="px-5 pt-5 sm:px-6 lg:px-8 grid grid-cols-2 gap-2.5">
        <MetaTile k="Sist vedlikeholdt" v={formatRelative(lastDate)} sub={maintenanceLogs[0]?.maintenance_type?.type_name || ''} />
        <MetaTile k="Totalt logget" v={`${maintenanceLogs.length}`} sub={maintenanceLogs.length === 1 ? 'oppføring' : 'oppføringer'} />
        <MetaTile
          k="Kategori"
          v={equipment.category?.name || '—'}
          sub={equipment.category?.icon || ''}
        />
        <MetaTile
          k="Anskaffet"
          v={equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString('nb-NO', { year: 'numeric', month: 'short' }) : '—'}
          sub=""
        />
      </div>

      {/* Action row */}
      <div className="px-5 pt-4 sm:px-6 lg:px-8 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="bg-moss text-white rounded-[14px] px-4 py-4 text-[15px] font-semibold flex items-center justify-center gap-2"
        >
          <FaCheck className="text-[14px]" /> Logg vedlikehold
        </button>
        <Link
          href={`/work-orders?equipment=${equipment.id}`}
          className="bg-paper text-rust border border-line rounded-[14px] px-4 py-4 text-[15px] font-semibold flex items-center justify-center gap-2"
        >
          <FaExclamationTriangle className="text-[14px]" /> Se ordrer
        </Link>
      </div>

      {/* Content sections */}
      <div className="px-5 pt-6 sm:px-6 lg:px-8 space-y-5 min-w-0">
        <WorkOrderSection equipment={{ id: equipment.id, name: equipment.name }} onUpdate={handleSuccess} />
        <DocumentSection equipmentId={equipment.id} onUpdate={handleSuccess} />

        <div>
          <h3 className="font-serif text-[18px] font-medium text-ink tracking-tightish mb-2.5">Historikk</h3>
          <div className="bg-paper border border-line rounded-[16px] overflow-hidden">
            <MaintenanceHistory logs={maintenanceLogs} equipmentName={equipment.name} onUpdate={handleSuccess} />
          </div>
        </div>
      </div>

      <div className="h-8" />

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

function MetaTile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="bg-paper border border-line rounded-[16px] px-3.5 py-3 min-w-0">
      <div className="text-[11px] text-ink3 font-medium uppercase tracking-[0.06em]">{k}</div>
      <div className="font-serif text-[22px] font-medium text-ink tracking-tight2 mt-1 leading-tight break-words">{v}</div>
      {sub && <div className="text-[12px] text-ink3 mt-0.5">{sub}</div>}
    </div>
  );
}
