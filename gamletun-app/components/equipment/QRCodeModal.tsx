'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaTimes, FaPrint } from 'react-icons/fa';
import { useModalBehavior } from '@/lib/use-modal-behavior';

interface QRCodeModalProps {
  equipment: {
    id: string;
    name: string;
    model: string | null;
  };
  onClose: () => void;
}

/**
 * Viser en QR-kode som peker rett til utstyrets detaljside. Skriv ut og
 * klistre på maskinen — skann med mobilkameraet for å melde feil, reservere
 * eller logge vedlikehold på stedet.
 */
export default function QRCodeModal({ equipment, onClose }: QRCodeModalProps) {
  useModalBehavior(onClose);

  // window finnes ikke under SSR; sett URL-en først på klienten.
  const [url, setUrl] = useState('');
  useEffect(() => {
    setUrl(`${window.location.origin}/equipment/${equipment.id}`);
  }, [equipment.id]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 print:hidden">
          <h2 id="qr-modal-title" className="text-xl font-bold text-gray-900">QR-kode</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk"
          >
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        {/* print-area gjør at kun denne delen kommer med på utskriften */}
        <div className="print-area p-6 flex flex-col items-center text-center gap-4">
          {url ? (
            <QRCodeSVG value={url} size={220} marginSize={2} />
          ) : (
            <div className="w-[220px] h-[220px] bg-gray-100 rounded animate-pulse" />
          )}
          <div>
            <p className="text-lg font-bold text-gray-900">{equipment.name}</p>
            {equipment.model && <p className="text-sm text-gray-600">{equipment.model}</p>}
            <p className="text-xs text-gray-400 mt-2 break-all">{url}</p>
          </div>
          <p className="text-xs text-gray-500">
            Skann med mobilkameraet for å åpne utstyrssiden — meld feil, reserver
            eller logg vedlikehold direkte.
          </p>
        </div>

        <div className="p-5 pt-0 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-4 py-3 rounded-[14px] font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            <FaPrint /> Skriv ut etikett
          </button>
        </div>
      </div>
    </div>
  );
}
