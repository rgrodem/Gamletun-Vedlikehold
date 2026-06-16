'use client';

import { useState } from 'react';
import { FaTimes, FaImage, FaFileAlt, FaTrash, FaCamera, FaMagic } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, formatFileSize } from '@/lib/storage';
import { useModalBehavior } from '@/lib/use-modal-behavior';
import { fileToBase64 } from '@/lib/file-to-base64';

const PRESET_TYPES_FOR_MATCH = ['Oljeskift', 'Filterbytte', 'Rengjøring', 'Inspeksjon', 'Reparasjon'];

interface Equipment {
  id: string;
  name: string;
  model: string | null;
}

interface LogMaintenanceModalProps {
  equipment: Equipment;
  /** Valgfri kategorinavn — gir dokument-tolkningen mer kontekst. */
  equipmentCategory?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedLog {
  maintenanceType: string | null;
  description: string | null;
  performedDate: string | null;
  hours: number | null;
  totalCost: number | null;
}

const PRESET_TYPES = ['Oljeskift', 'Filterbytte', 'Rengjøring', 'Inspeksjon', 'Reparasjon', 'Annet'];

export default function LogMaintenanceModal({ equipment, equipmentCategory, onClose, onSuccess }: LogMaintenanceModalProps) {
  useModalBehavior(onClose);
  const [typeValue, setTypeValue] = useState('');
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState('');
  // Dokument-tolkning som samtale: forslaget vises i et kort med «Stemmer dette?».
  // Feltene fylles først inn når brukeren bekrefter med «Ja».
  const [parsed, setParsed] = useState<ParsedLog | null>(null);
  type DocPart = { data: string; mediaType: string; kind: string };
  const [docDocuments, setDocDocuments] = useState<DocPart[] | null>(null);
  const [corrections, setCorrections] = useState<string[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState('');

  const callParse = async (documents: DocPart[], corr: string[]): Promise<ParsedLog | null> => {
    const res = await fetch('/api/ai/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents,
        equipmentName: equipment.name,
        equipmentModel: equipment.model || undefined,
        equipmentCategory: equipmentCategory || undefined,
        corrections: corr,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Kunne ikke lese dokumentene.');
      return null;
    }
    return json as ParsedLog;
  };

  // Tolk alle vedlagte bilder/dokumenter sammen. Viser kortet (fyller ikke felt ennå).
  const handleAnalyzeAttachments = async () => {
    if (attachments.length === 0) return;
    setAiLoading(true);
    setAiNote('');
    setError('');
    try {
      // Send bilder + PDF til KI; hopp over svært store filer (de lagres likevel).
      const usable = attachments.filter((f) => f.size <= 25 * 1024 * 1024).slice(0, 6);
      if (usable.length === 0) {
        setError('Vedleggene er for store for KI-lesing (maks 25 MB hver).');
        return;
      }
      const documents: DocPart[] = await Promise.all(
        usable.map(async (f) => ({
          data: await fileToBase64(f),
          mediaType: f.type,
          kind: f.type === 'application/pdf' ? 'pdf' : 'image',
        }))
      );
      setDocDocuments(documents);
      setCorrections([]);
      setCorrecting(false);
      const result = await callParse(documents, []);
      if (result) setParsed(result);
    } catch (err) {
      console.error('KI-dokumentlesing feilet:', err);
      setError('Kunne ikke lese vedleggene.');
    } finally {
      setAiLoading(false);
    }
  };

  // «Nei, korriger» → send rettelse, få oppdatert tolkning.
  const handleRefineParse = async () => {
    const text = correctionText.trim();
    if (!text || !docDocuments) return;
    setAiLoading(true);
    setError('');
    try {
      const next = [...corrections, text];
      const result = await callParse(docDocuments, next);
      if (result) {
        setParsed(result);
        setCorrections(next);
        setCorrectionText('');
        setCorrecting(false);
      }
    } catch (err) {
      console.error('Korrigering feilet:', err);
      setError('Kunne ikke oppdatere tolkningen.');
    } finally {
      setAiLoading(false);
    }
  };

  // «Ja, bruk dette» → fyll inn feltene fra den bekreftede tolkningen.
  const handleAcceptParsed = () => {
    if (!parsed) return;
    if (parsed.maintenanceType) {
      const match = PRESET_TYPES_FOR_MATCH.find(
        (t) => t.toLowerCase() === String(parsed.maintenanceType).toLowerCase()
      );
      if (match) {
        setTypeValue(match);
      } else {
        setTypeValue('Annet');
        setCustomType(parsed.maintenanceType);
      }
    }
    if (parsed.description) setDescription(parsed.description);
    if (parsed.performedDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.performedDate)) {
      setPerformedDate(parsed.performedDate);
    }
    if (parsed.hours != null) setHours(String(parsed.hours));
    setParsed(null);
    setCorrecting(false);
    setAiNote('Lagt inn fra dokumentet — kontroller før du lagrer.');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const invalid = newFiles.filter(f => f.size > 40 * 1024 * 1024);
    if (invalid.length > 0) {
      alert('Noen filer er for store. Maks 40 MB per fil.');
      return;
    }
    setAttachments([...attachments, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const effectiveType = typeValue === 'Annet' ? customType : typeValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let maintenanceTypeId = null;
      if (effectiveType) {
        const { data: existingType } = await supabase
          .from('maintenance_types')
          .select('id')
          .eq('equipment_id', equipment.id)
          .eq('type_name', effectiveType)
          .single();

        if (existingType) {
          maintenanceTypeId = existingType.id;
        } else {
          const { data: newType, error: typeError } = await supabase
            .from('maintenance_types')
            .insert({ equipment_id: equipment.id, type_name: effectiveType })
            .select()
            .single();
          if (typeError) throw typeError;
          maintenanceTypeId = newType.id;
        }
      }

      const descriptionWithHours = hours
        ? `${description ? description + '\n\n' : ''}Timer brukt: ${hours}`
        : description;

      const { data: newLog, error: logError } = await supabase
        .from('maintenance_logs')
        .insert({
          equipment_id: equipment.id,
          maintenance_type_id: maintenanceTypeId,
          description: descriptionWithHours || null,
          performed_date: performedDate,
          performed_by: user?.id || null,
        })
        .select()
        .single();

      if (logError) throw logError;

      if (attachments.length > 0 && newLog) {
        for (const file of attachments) {
          try {
            const result = await uploadFile('maintenance-attachments', file, newLog.id);
            const attachmentType = file.type.startsWith('image/') ? 'image' :
                                   file.type === 'application/pdf' ? 'document' : 'form';
            await supabase
              .from('maintenance_attachments')
              .insert({
                maintenance_log_id: newLog.id,
                file_name: file.name,
                file_path: result.path,
                file_size: file.size,
                file_type: file.type,
                attachment_type: attachmentType,
                uploaded_by: user?.id || null,
              });
          } catch (uploadError) {
            console.error('Error uploading attachment:', uploadError);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error logging maintenance:', err);
      setError(err.message || 'Kunne ikke logge vedlikehold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-t-[24px] px-5 pt-2.5 pb-6 max-h-[92%] overflow-y-auto overscroll-contain noscroll"
        style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-11 h-1 rounded-full bg-line mx-auto mt-1 mb-3.5" />

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[12px] font-semibold text-moss uppercase tracking-[0.08em]">
              Logg vedlikehold
            </div>
            <h2 className="font-serif text-[24px] font-medium text-ink tracking-tight2 mt-1">
              {equipment.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="w-[44px] h-[44px] rounded-full bg-paper border border-line text-ink flex items-center justify-center"
          >
            <FaTimes className="text-[14px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          {error && (
            <div className="bg-rustBg border border-rust/30 rounded-[14px] p-3.5 text-rust text-sm">
              {error}
            </div>
          )}

          {/* KI: fyll inn fra kvittering/PDF */}
          {/* Bilder og dokumenter — lagres på loggen, og KI kan fylle ut feltene fra dem */}
          <div>
            <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.06em]">
              Bilder og dokumenter
            </label>
            <p className="text-[12px] text-ink3 mt-1 mb-2">
              Legg ved kvitteringer (PDF) og bilder — f.eks. kvittering på nye dekk og bilde av dem montert.
              Alt lagres på loggen, og KI kan fylle ut feltene fra dem.
            </p>
            <label className="block cursor-pointer bg-paper border border-dashed border-line rounded-[14px] px-5 py-[18px] text-center text-ink3">
              <span className="inline-flex items-center gap-2">
                <FaCamera className="text-[16px]" />
                <span className="text-[14px] font-medium">Ta bilde / last opp (flere mulig)</span>
              </span>
              <input
                type="file"
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                multiple
                className="hidden"
              />
            </label>

            {attachments.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-paper border border-line rounded-[12px] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {file.type.startsWith('image/')
                        ? <FaImage className="text-sky flex-shrink-0" />
                        : <FaFileAlt className="text-rust flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">{file.name}</p>
                        <p className="text-[11px] text-ink3">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-2 text-rust rounded-lg"
                      aria-label="Fjern fil"
                    >
                      <FaTrash className="text-[12px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 && !parsed && (
              <button
                type="button"
                onClick={handleAnalyzeAttachments}
                disabled={aiLoading}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-2 bg-skyBg border border-sky/30 text-sky rounded-[14px] px-4 py-3 text-[14px] font-semibold disabled:opacity-50"
              >
                <FaMagic className="text-[14px]" /> {aiLoading ? 'Leser vedleggene…' : 'Fyll inn loggen fra vedleggene (KI)'}
              </button>
            )}
            {aiNote && <p className="text-[12px] text-moss mt-1.5">{aiNote}</p>}
          </div>

          {/* KI-tolkning med «Stemmer dette?» */}
          {parsed && (
            <div className="border border-sky/40 bg-skyBg rounded-[14px] p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sky font-semibold text-[14px]">
                <FaMagic className="text-[13px]" /> KI-tolkning av dokumentet
              </div>
              {parsed.maintenanceType && (
                <p className="text-[14px] text-ink"><strong>{parsed.maintenanceType}</strong></p>
              )}
              {parsed.description && (
                <p className="text-[14px] text-ink2 whitespace-pre-line">{parsed.description}</p>
              )}
              <p className="text-[12px] text-ink3">
                {parsed.performedDate ? `Dato: ${parsed.performedDate}` : 'Dato: ikke funnet'}
                {parsed.hours != null ? ` · ${parsed.hours} t` : ''}
                {parsed.totalCost != null ? ` · ${parsed.totalCost} kr` : ''}
              </p>

              {!correcting ? (
                <div className="pt-0.5">
                  <p className="text-[14px] font-medium text-ink mb-2">Stemmer dette?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptParsed}
                      className="flex-1 bg-moss text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold"
                    >
                      Ja, bruk dette
                    </button>
                    <button
                      type="button"
                      onClick={() => setCorrecting(true)}
                      className="flex-1 bg-paper border border-line text-ink rounded-[12px] px-4 py-2.5 text-[14px] font-semibold"
                    >
                      Nei, korriger
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-0.5 flex flex-col gap-2">
                  <textarea
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    rows={2}
                    autoFocus
                    className="w-full bg-paper border border-line rounded-[12px] px-3 py-2 text-[14px] text-ink outline-none focus:border-ink3 resize-none"
                    placeholder="Beskriv hva som egentlig er gjort, f.eks. «dette er nesehjulet på liften, ikke en trillebår»"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRefineParse}
                      disabled={aiLoading || !correctionText.trim()}
                      className="flex-1 bg-ink text-paper rounded-[12px] px-4 py-2.5 text-[14px] font-semibold disabled:opacity-50"
                    >
                      {aiLoading ? 'Oppdaterer…' : 'Oppdater tolkning'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCorrecting(false); setCorrectionText(''); }}
                      className="bg-paper border border-line text-ink rounded-[12px] px-4 py-2.5 text-[14px] font-semibold"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Type chips */}
          <div>
            <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.06em]">
              Type arbeid
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PRESET_TYPES.map(t => {
                const active = typeValue === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeValue(t)}
                    className={`px-3.5 py-3 rounded-[12px] text-[14px] font-medium text-center ${
                      active
                        ? 'bg-ink text-paper border-0'
                        : 'bg-paper text-ink border border-line'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {typeValue === 'Annet' && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Beskriv arbeidet…"
                className="mt-2 w-full bg-paper border border-line rounded-[12px] px-3.5 py-3 text-[15px] text-ink outline-none focus:border-ink3"
              />
            )}
          </div>

          {/* Notat */}
          <div>
            <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.06em]">
              Notat
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Beskriv hva som ble gjort…"
              className="mt-2 w-full bg-paper border border-line rounded-[14px] px-3.5 py-3.5 text-[15px] text-ink placeholder:text-ink3 outline-none focus:border-ink3 resize-none leading-[1.5]"
              style={{ minHeight: 80 }}
            />
          </div>

          {/* Dato + Timer */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.06em]">
                Dato
              </label>
              <input
                type="date"
                value={performedDate}
                onChange={(e) => setPerformedDate(e.target.value)}
                required
                className="mt-2 w-full bg-paper border border-line rounded-[12px] px-3.5 py-3.5 text-[15px] text-ink outline-none focus:border-ink3"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-ink2 uppercase tracking-[0.06em]">
                Timer brukt
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0,5 t"
                className="mt-2 w-full bg-paper border border-line rounded-[12px] px-3.5 py-3.5 text-[15px] text-ink placeholder:text-ink3 outline-none focus:border-ink3"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !effectiveType}
            className="mt-2 bg-ink text-paper rounded-[14px] px-4 py-4.5 text-[16px] font-semibold disabled:opacity-50"
            style={{ padding: '18px 16px' }}
            aria-label="Lagre vedlikehold"
          >
            {loading ? 'Lagrer…' : 'Lagre vedlikehold'}
          </button>
        </form>
      </div>
    </div>
  );
}
