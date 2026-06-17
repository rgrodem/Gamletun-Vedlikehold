'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaTimes, FaPrint } from 'react-icons/fa';
import { Part, UNIT_LABELS } from '@/lib/parts';
import { useModalBehavior } from '@/lib/use-modal-behavior';

interface Props {
  part: Part;
  compat: { equipment_id: string; name: string }[];
  onClose: () => void;
}

/**
 * QR-etikett for fysisk lager: skann for å åpne delesiden, og les av navn,
 * delenummer, hylle og hvilket utstyr delen passer til.
 */
export default function PartLabelModal({ part, compat, onClose }: Props) {
  useModalBehavior(onClose);
  const [url, setUrl] = useState('');
  useEffect(() => {
    setUrl(`${window.location.origin}/parts/${part.id}`);
  }, [part.id]);

  const fits = compat.map((c) => c.name).join(', ');

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">Etikett</h2>
          <button onClick={onClose} aria-label="Lukk" className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        <div className="print-area p-6">
          <div className="border-2 border-gray-900 rounded-lg p-4 flex gap-4 items-center">
            {url ? <QRCodeSVG value={url} size={120} marginSize={1} /> : <div className="w-[120px] h-[120px] bg-gray-100 animate-pulse rounded" />}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-gray-900 leading-tight">{part.name}</p>
              {part.part_number && <p className="text-sm text-gray-700 mt-0.5">Delenr: {part.part_number}</p>}
              {part.location && <p className="text-sm text-gray-700">Hylle: {part.location}</p>}
              <p className="text-xs text-gray-500 mt-1">Enhet: {UNIT_LABELS[part.unit]}{part.min_stock > 0 ? ` · min. ${part.min_stock}` : ''}</p>
              {fits && <p className="text-xs text-gray-700 mt-1"><span className="font-semibold">Passer:</span> {fits}</p>}
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-4 py-3 rounded-[14px] font-semibold text-[15px]"
          >
            <FaPrint /> Skriv ut etikett
          </button>
        </div>
      </div>
    </div>
  );
}
