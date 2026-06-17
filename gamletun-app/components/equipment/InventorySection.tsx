'use client';

import { useEffect, useState } from 'react';
import { FaPlus, FaChevronDown, FaChevronUp, FaTrash, FaBoxOpen } from 'react-icons/fa';
import {
  InventoryItem,
  InventoryLoan,
  getInventoryItems,
  getActiveLoans,
  addInventoryItem,
  updateInventoryItemTotal,
  deleteInventoryItem,
  lendOut,
  returnLoan,
  loanedQuantity,
} from '@/lib/inventory';
import { useRole } from '@/components/RoleProvider';

interface InventorySectionProps {
  equipmentId: string;
}

/**
 * Lager/utlån med antall per deltype. For utstyr som lånes ut i antall
 * (f.eks. stillasdeler) i stedet for som én enhet.
 */
export default function InventorySection({ equipmentId }: InventorySectionProps) {
  const { isAdmin } = useRole();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<InventoryLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTotal, setNewTotal] = useState('');

  const reload = async () => {
    try {
      const [itemsData, loansData] = await Promise.all([
        getInventoryItems(equipmentId),
        getActiveLoans(equipmentId),
      ]);
      setItems(itemsData);
      setLoans(loansData);
    } catch {
      setError('Kunne ikke laste lager');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [itemsData, loansData] = await Promise.all([
          getInventoryItems(equipmentId),
          getActiveLoans(equipmentId),
        ]);
        if (!cancelled) {
          setItems(itemsData);
          setLoans(loansData);
        }
      } catch {
        if (!cancelled) setError('Kunne ikke laste lager');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [equipmentId]);

  const handleAddItem = async () => {
    const name = newName.trim();
    const total = Math.max(0, parseInt(newTotal, 10) || 0);
    if (!name) return;
    try {
      await addInventoryItem(equipmentId, name, total);
      setNewName('');
      setNewTotal('');
      setShowAdd(false);
      await reload();
    } catch {
      setError('Kunne ikke legge til deltype');
    }
  };

  const totalOut = loans.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-serif text-[18px] font-medium text-ink tracking-tightish m-0">
            Deler og utlån
          </h3>
          <p className="text-[13px] text-ink3 mt-0.5">
            {items.length} {items.length === 1 ? 'deltype' : 'deltyper'}
            {totalOut > 0 ? ` · ${totalOut} ute` : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] text-ink font-medium border border-line rounded-[12px] bg-paper"
          >
            <FaPlus className="text-[11px]" /> Deltype
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rustBg border border-rust/30 rounded-[12px] p-3 mb-3">
          <p className="text-rust text-sm">{error}</p>
        </div>
      )}

      {showAdd && (
        <div className="bg-paper border border-line rounded-[14px] p-3 mb-3 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
            placeholder="F.eks. Platting"
            className="flex-1 min-w-0 px-3 py-2 border border-line rounded-[10px] text-[14px] outline-none focus:border-ink3 bg-bg"
          />
          <input
            type="text"
            inputMode="numeric"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
            placeholder="Antall"
            className="w-20 px-2 py-2 border border-line rounded-[10px] text-[14px] text-center outline-none focus:border-ink3 bg-bg"
          />
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!newName.trim()}
            className="px-3 py-2 bg-ink text-paper rounded-[10px] text-[13px] font-medium disabled:opacity-50"
          >
            Legg til
          </button>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse motion-reduce:animate-none space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-line/60 rounded-[14px]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-bg border border-dashed border-line rounded-[16px] p-6 text-center">
          <FaBoxOpen className="text-2xl text-ink3 mx-auto mb-2" />
          <p className="text-[13px] text-ink3">
            Ingen deltyper registrert. Legg til deler du låner ut i antall.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <InventoryItemRow
              key={item.id}
              item={item}
              loans={loans.filter((l) => l.inventory_item_id === item.id)}
              out={loanedQuantity(loans, item.id)}
              expanded={expanded === item.id}
              onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
              onChanged={reload}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryItemRow({
  item,
  loans,
  out,
  expanded,
  onToggle,
  onChanged,
  onError,
}: {
  item: InventoryItem;
  loans: InventoryLoan[];
  out: number;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const available = item.total_quantity - out;
  const [borrower, setBorrower] = useState('');
  const [qty, setQty] = useState('');
  const [editTotal, setEditTotal] = useState(String(item.total_quantity));
  const [busy, setBusy] = useState(false);

  const handleLend = async () => {
    const name = borrower.trim();
    const n = parseInt(qty, 10);
    if (!name || !n || n <= 0) return;
    if (n > available) { onError(`Kun ${available} tilgjengelig av ${item.name}`); return; }
    setBusy(true);
    try {
      await lendOut(item.id, name, n);
      setBorrower('');
      setQty('');
      await onChanged();
    } catch {
      onError('Kunne ikke registrere utlån');
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      await returnLoan(loanId);
      await onChanged();
    } catch {
      onError('Kunne ikke registrere innlevering');
    }
  };

  const handleSaveTotal = async () => {
    const n = Math.max(0, parseInt(editTotal, 10) || 0);
    try {
      await updateInventoryItemTotal(item.id, n);
      await onChanged();
    } catch {
      onError('Kunne ikke oppdatere totalt antall');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Slette «${item.name}» og alle utlån på den?`)) return;
    try {
      await deleteInventoryItem(item.id);
      await onChanged();
    } catch {
      onError('Kunne ikke slette deltype');
    }
  };

  return (
    <div className="bg-paper border border-line rounded-[14px] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="text-[15px] font-semibold text-ink truncate">{item.name}</span>
        <span className="flex items-center gap-2.5 flex-shrink-0">
          <span className={`text-[13px] font-semibold ${available <= 0 ? 'text-rust' : 'text-moss'}`}>
            {available} ledig
          </span>
          <span className="text-[12px] text-ink3">av {item.total_quantity}</span>
          {expanded ? <FaChevronUp className="text-ink3 text-[12px]" /> : <FaChevronDown className="text-ink3 text-[12px]" />}
        </span>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-line space-y-3">
          {/* Aktive utlån */}
          {loans.length > 0 ? (
            <div className="space-y-1.5">
              {loans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="text-ink truncate">
                    <span className="font-semibold">{loan.quantity}</span> · {loan.borrower_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReturn(loan.id)}
                    className="flex-shrink-0 text-[12px] font-medium text-moss border border-moss/40 rounded-full px-2.5 py-1"
                  >
                    Lever inn
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink3">Ingenting utlånt.</p>
          )}

          {/* Lån ut */}
          <div className="flex gap-2">
            <input
              type="text"
              value={borrower}
              onChange={(e) => setBorrower(e.target.value)}
              placeholder="Hvem låner?"
              className="flex-1 min-w-0 px-3 py-2 border border-line rounded-[10px] text-[14px] outline-none focus:border-ink3 bg-bg"
            />
            <input
              type="text"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Ant."
              className="w-16 px-2 py-2 border border-line rounded-[10px] text-[14px] text-center outline-none focus:border-ink3 bg-bg"
            />
            <button
              type="button"
              onClick={handleLend}
              disabled={busy || available <= 0 || !borrower.trim() || !qty}
              className="px-3 py-2 bg-ink text-paper rounded-[10px] text-[13px] font-medium disabled:opacity-50"
            >
              Lån ut
            </button>
          </div>

          {/* Totalt antall + slett */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ink3">Totalt antall</span>
              <input
                type="text"
                inputMode="numeric"
                value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
                className="w-16 px-2 py-1.5 border border-line rounded-[8px] text-[13px] text-center outline-none focus:border-ink3 bg-bg"
              />
              {editTotal !== String(item.total_quantity) && (
                <button
                  type="button"
                  onClick={handleSaveTotal}
                  className="text-[12px] font-medium text-ink border border-line rounded-full px-2.5 py-1"
                >
                  Lagre
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-rust"
              aria-label="Slett deltype"
            >
              <FaTrash className="text-[12px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
