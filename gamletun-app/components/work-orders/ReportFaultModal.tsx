'use client';

import { useEffect, useState } from 'react';
import { FaTimes, FaExclamationTriangle, FaCamera, FaImage, FaTrash, FaMagic } from 'react-icons/fa';
import { createWorkOrder, WorkOrderPriority } from '@/lib/work-orders';
import { getActiveReservationForEquipment } from '@/lib/reservations';
import { uploadWorkOrderAttachment } from '@/lib/work-order-attachments';
import { formatFileSize } from '@/lib/storage';
import { useModalBehavior } from '@/lib/use-modal-behavior';
import { fileToBase64 } from '@/lib/file-to-base64';

interface Equipment {
  id: string;
  name: string;
}

interface ReportFaultModalProps {
  equipment: Equipment;
  /** Valgfri kategorinavn — gir KI-feildiagnose mer kontekst. */
  equipmentCategory?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Diagnosis {
  title: string;
  likelyCause: string;
  priority: WorkOrderPriority;
  suggestedAction: string;
  suggestedParts: string[];
}

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: 'Lav',
  medium: 'Medium',
  high: 'Høy',
  urgent: 'Akutt',
};

export default function ReportFaultModal({ equipment, equipmentCategory, onClose, onSuccess }: ReportFaultModalProps) {
  useModalBehavior(onClose);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('high');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservedBy, setReservedBy] = useState<{ name: string; from: string } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState('');
  // Feildiagnose-samtale: forslaget vises i et kort med «Stemmer dette?».
  // Feltene fylles først inn når brukeren bekrefter med «Ja».
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [photoData, setPhotoData] = useState<{ data: string; mediaType: string } | null>(null);
  const [corrections, setCorrections] = useState<string[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState('');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (newFiles.some(f => f.size > 40 * 1024 * 1024)) {
      setError('Noen filer er for store. Maks 40 MB per fil.');
      return;
    }
    setPhotos(prev => [...prev, ...newFiles]);
  };

  // Kall diagnose-ruten med bildet + evt. tidligere korreksjoner.
  const callDiagnose = async (
    data: string,
    mediaType: string,
    corr: string[]
  ): Promise<Diagnosis | null> => {
    const res = await fetch('/api/ai/diagnose-fault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaType,
        data,
        equipmentName: equipment.name,
        equipmentCategory: equipmentCategory || undefined,
        corrections: corr,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || 'Kunne ikke analysere bildet.');
      return null;
    }
    return d as Diagnosis;
  };

  // Steg 1: analyser første foto. Viser diagnose-kortet (fyller ikke felt ennå).
  const handleDiagnose = async () => {
    const photo = photos[0];
    if (!photo) return;
    setAiLoading(true);
    setAiNote('');
    setError('');
    try {
      const data = await fileToBase64(photo);
      setPhotoData({ data, mediaType: photo.type });
      setCorrections([]);
      setCorrecting(false);
      const d = await callDiagnose(data, photo.type, []);
      if (d) setDiagnosis(d);
    } catch (err) {
      console.error('Feildiagnose feilet:', err);
      setError('Kunne ikke analysere bildet.');
    } finally {
      setAiLoading(false);
    }
  };

  // «Nei, korriger» → send brukerens rettelse og få oppdatert diagnose.
  const handleRefine = async () => {
    const text = correctionText.trim();
    if (!text || !photoData) return;
    setAiLoading(true);
    setError('');
    try {
      const next = [...corrections, text];
      const d = await callDiagnose(photoData.data, photoData.mediaType, next);
      if (d) {
        setDiagnosis(d);
        setCorrections(next);
        setCorrectionText('');
        setCorrecting(false);
      }
    } catch (err) {
      console.error('Korrigering feilet:', err);
      setError('Kunne ikke oppdatere diagnosen.');
    } finally {
      setAiLoading(false);
    }
  };

  // «Ja, bruk dette» → fyll inn feltene fra den bekreftede diagnosen.
  const handleAcceptDiagnosis = () => {
    if (!diagnosis) return;
    if (!title.trim()) setTitle(diagnosis.title);
    setPriority(diagnosis.priority);
    const parts = diagnosis.suggestedParts?.length
      ? `\nMulige deler: ${diagnosis.suggestedParts.join(', ')}.`
      : '';
    const summary = `${diagnosis.likelyCause}${diagnosis.suggestedAction ? `\nForslag: ${diagnosis.suggestedAction}` : ''}${parts}`.trim();
    if (summary) {
      setDescription((prev) => (prev.trim() ? `${prev}\n\n${summary}` : summary));
    }
    setDiagnosis(null);
    setCorrecting(false);
    setAiNote('Diagnose lagt inn — kontroller og meld feilen.');
  };

  // Auto-triagering: foreslå prioritet ut fra tittel/beskrivelse.
  const handleTriage = async () => {
    if (!title.trim() && !description.trim()) return;
    setAiLoading(true);
    setAiNote('');
    setError('');
    try {
      const res = await fetch('/api/ai/triage-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, equipmentName: equipment.name }),
      });
      const t = await res.json();
      if (!res.ok) {
        setError(t.error || 'Kunne ikke vurdere feilen.');
        return;
      }
      if (t.priority) setPriority(t.priority);
      setAiNote(`KI foreslår: ${t.category || 'ukjent kategori'} · ${t.rationale || ''}`.trim());
    } catch (err) {
      console.error('Triagering feilet:', err);
      setError('Kunne ikke vurdere feilen.');
    } finally {
      setAiLoading(false);
    }
  };

  // Warn the reporter if this equipment is already reserved by someone — they
  // should be told it's now defective. (Email notification is a later step.)
  useEffect(() => {
    let cancelled = false;
    getActiveReservationForEquipment(equipment.id)
      .then((res) => {
        if (cancelled || !res) return;
        setReservedBy({
          name: res.user_profile?.full_name || 'en bruker',
          from: new Date(res.start_time).toLocaleString('nb-NO', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          }),
        });
      })
      .catch((err) => {
        console.error('Failed to check active reservation:', err);
      });
    return () => { cancelled = true; };
  }, [equipment.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const workOrder = await createWorkOrder({
        equipment_id: equipment.id,
        type: 'corrective',
        priority,
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
      });

      // Last opp foto av feilen. Feilmeldingen er allerede opprettet, så en
      // feilet opplasting skal ikke stoppe flyten — bare logges.
      for (const photo of photos) {
        try {
          await uploadWorkOrderAttachment(workOrder.id, photo);
        } catch (uploadError) {
          console.error('Error uploading fault photo:', uploadError);
        }
      }

      // E-postvarsel i bakgrunnen — skal aldri blokkere innmeldingen.
      fetch('/api/notify/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: workOrder.id }),
      }).catch((notifyError) => console.error('E-postvarsel feilet:', notifyError));

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error creating fault report:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke opprette feilmelding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-labelledby="fault-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8">
        {/* Header */}
        <div className="bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <FaExclamationTriangle className="text-2xl text-red-600" />
            </div>
            <div>
              <h2 id="fault-modal-title" className="text-2xl font-bold text-gray-900">Meld feil</h2>
              <p className="text-sm text-gray-600">{equipment.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {aiNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
              <FaMagic className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-900 text-sm">{aiNote}</p>
            </div>
          )}

          {reservedBy && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3">
              <FaExclamationTriangle className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-amber-900 text-sm">
                <strong>OBS:</strong> dette utstyret er reservert av{' '}
                <strong>{reservedBy.name}</strong> fra {reservedBy.from}. Gi beskjed om at
                utstyret nå er meldt defekt.
                {priority === 'low'
                  ? ' Denne feilen har lav prioritet og blokkerer ikke nye reservasjoner.'
                  : ' Når feilen er åpen kan utstyret ikke reserveres på nytt.'}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tittel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[44px]"
              placeholder="F.eks. Hydraulikk-lekkasje, Lys defekt, Motor starter ikke"
            />
            <p className="text-xs text-gray-500 mt-1">Kort beskrivelse av feilen</p>
          </div>

          {/* Priority */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Prioritet <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleTriage}
                disabled={aiLoading || (!title.trim() && !description.trim())}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 disabled:opacity-40"
              >
                <FaMagic className="text-[11px]" /> {aiLoading ? 'Vurderer…' : 'Foreslå prioritet'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'urgent'] as WorkOrderPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all border-2 touch-manipulation min-h-[44px] ${
                    priority === p
                      ? p === 'urgent'
                        ? 'bg-red-500 text-white border-red-600'
                        : p === 'high'
                        ? 'bg-orange-500 text-white border-orange-600'
                        : p === 'medium'
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-gray-500 text-white border-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {p === 'urgent' ? 'Akutt' : p === 'high' ? 'Høy' : p === 'medium' ? 'Medium' : 'Lav'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {priority === 'low'
                ? 'Lav prioritet er for kosmetiske feil (f.eks. sprukket lyktglass). Utstyret kan fortsatt reserveres og brukes.'
                : 'Utstyret kan ikke reserveres før feilen er utbedret.'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Detaljert beskrivelse av problemet..."
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Foto av feilen (valgfritt)
            </label>
            <label className="block cursor-pointer border border-dashed border-gray-300 rounded-xl px-5 py-5 text-center text-gray-500 hover:border-gray-400 transition-colors">
              <span className="inline-flex items-center gap-2">
                <FaCamera className="text-[16px]" />
                <span className="text-sm font-medium">Ta bilde eller last opp</span>
              </span>
              <input
                type="file"
                onChange={handlePhotoSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
            </label>
            {photos.length > 0 && !diagnosis && (
              <button
                type="button"
                onClick={handleDiagnose}
                disabled={aiLoading}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <FaMagic /> {aiLoading ? 'Analyserer…' : 'Analyser bilde med KI'}
              </button>
            )}

            {/* KI-diagnose med «Stemmer dette?» */}
            {diagnosis && (
              <div className="mt-2.5 border border-blue-200 bg-blue-50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                  <FaMagic className="text-[13px]" /> KI-diagnose
                </div>
                <p className="text-sm text-gray-900">
                  <strong>{diagnosis.title}</strong> · prioritet {PRIORITY_LABEL[diagnosis.priority]}
                </p>
                <p className="text-sm text-gray-700">{diagnosis.likelyCause}</p>
                {diagnosis.suggestedAction && (
                  <p className="text-sm text-gray-700">Forslag: {diagnosis.suggestedAction}</p>
                )}
                {diagnosis.suggestedParts?.length > 0 && (
                  <p className="text-xs text-gray-600">Deler: {diagnosis.suggestedParts.join(', ')}</p>
                )}

                {!correcting ? (
                  <div className="pt-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">Stemmer dette?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAcceptDiagnosis}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold min-h-[44px]"
                      >
                        Ja, bruk dette
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorrecting(true)}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold min-h-[44px]"
                      >
                        Nei, korriger
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 space-y-2">
                    <textarea
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      rows={2}
                      autoFocus
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Beskriv hva som egentlig er feil, f.eks. «det er bremselyset som blinker, ikke varmetråder»"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRefine}
                        disabled={aiLoading || !correctionText.trim()}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 min-h-[44px]"
                      >
                        {aiLoading ? 'Oppdaterer…' : 'Oppdater diagnose'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCorrecting(false); setCorrectionText(''); }}
                        className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold min-h-[44px]"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {photos.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {photos.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <FaImage className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-[11px] text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                      className="p-2 text-red-600 rounded-lg"
                      aria-label="Fjern bilde"
                    >
                      <FaTrash className="text-[12px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Frist (valgfritt)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[44px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              {loading ? (
                <span>Melder feil...</span>
              ) : (
                <>
                  <FaExclamationTriangle />
                  <span>Meld feil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
