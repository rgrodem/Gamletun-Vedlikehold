'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBook, FaMagic, FaTrash, FaSpinner, FaExclamationTriangle, FaCheckCircle, FaUpload, FaPaperPlane } from 'react-icons/fa';
import { uploadFile } from '@/lib/storage';
import {
  Manual,
  MANUAL_TYPE_LABELS,
  MANUAL_STATUS_LABELS,
  getManualsForEquipment,
  createManual,
  deleteManual,
} from '@/lib/manuals';
import { useRole } from '@/components/RoleProvider';

interface Props {
  equipmentId: string;
}

interface AskSource { manual: string; page_from: number | null; page_to: number | null }
interface AskResult { found: boolean; answer: string; sources: AskSource[] }

/**
 * «Manualer & assistent» på maskinens detaljside.
 * Synlighetsregel (§11.0): «Spør manualen» vises kun når maskinen har minst én
 * manual med status 'ready'. Ingen manual → ingen spør-funksjon. Medlem uten
 * manualer ser ingenting; admin ser opplasting.
 */
export default function ManualAssistantSection({ equipmentId }: Props) {
  const { isAdmin } = useRole();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [manualType, setManualType] = useState('verksted');

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);

  const load = useCallback(async () => {
    try {
      setManuals(await getManualsForEquipment(equipmentId));
    } catch {
      /* stille — seksjonen skjules uansett hvis tom */
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  // Poll mens noe indekseres, så statusen oppdaterer seg selv.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const busy = manuals.some((m) => m.status === 'parsing' || m.status === 'uploaded');
    if (busy) {
      timer.current = setTimeout(load, 4000);
      return () => { if (timer.current) clearTimeout(timer.current); };
    }
  }, [manuals, load]);

  const hasReady = manuals.some((m) => m.status === 'ready');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Velg en PDF-fil.'); return; }
    // Supabase gratisplan tillater maks 50 MB per fil. Er manualen større, del
    // den i flere PDF-er og last opp hver for seg — søket dekker alle manualene.
    if (file.size > 50 * 1024 * 1024) {
      setError('Filen er for stor (maks 50 MB). Del en stor manual i flere PDF-er og last opp hver del — søket dekker alle.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const up = await uploadFile('manuals', file, 'new');
      const manual = await createManual({
        equipmentId,
        title: file.name.replace(/\.pdf$/i, ''),
        filePath: up.path,
        manualType,
      });
      await load();
      // Start indeksering (kjører server-side; status oppdateres via polling).
      fetch('/api/manuals/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualId: manual.id }),
      }).then(() => load()).catch(() => {});
    } catch (err) {
      console.error('Opplasting feilet:', err);
      setError('Kunne ikke laste opp manualen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Slette denne manualen og søkeindeksen?')) return;
    try {
      await deleteManual(id);
      await load();
    } catch {
      setError('Kunne ikke slette manualen.');
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/manuals/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId, question: q }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Kunne ikke svare.'); return; }
      setResult(data as AskResult);
    } catch {
      setError('Kunne ikke svare.');
    } finally {
      setAsking(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-line/60 rounded-[16px] h-16" />;

  // Synlighetsregel: ingen manual + ikke admin → ingenting.
  if (manuals.length === 0 && !isAdmin) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-serif text-[18px] font-medium text-ink tracking-tightish m-0 flex items-center gap-2">
            <FaBook className="text-ink3 text-[15px]" /> Manualer & assistent
          </h3>
          <p className="text-[13px] text-ink3 mt-0.5">
            {manuals.length > 0
              ? `${manuals.length} ${manuals.length === 1 ? 'manual' : 'manualer'}`
              : 'Ingen manual lastet opp'}
          </p>
        </div>
        {isAdmin && (
          <label className={`flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-[14px] font-semibold cursor-pointer ${uploading ? 'bg-line2 text-ink3' : 'bg-moss text-white'}`}>
            {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload className="text-[12px]" />}
            <span>{uploading ? 'Laster opp…' : 'Last opp'}</span>
            <input type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        )}
      </div>

      {error && (
        <div className="bg-rustBg border border-rust/30 rounded-[12px] p-3 mb-3 text-rust text-sm">{error}</div>
      )}

      {isAdmin && manuals.length === 0 && (
        <div className="bg-bg border border-dashed border-line rounded-[16px] p-5 text-center">
          <p className="text-[13px] text-ink2 mb-2">Last opp en verkstedmanual for å aktivere assistenten.</p>
          <select
            value={manualType}
            onChange={(e) => setManualType(e.target.value)}
            className="px-3 py-2 bg-paper border border-line rounded-[10px] text-[13px] text-ink outline-none"
          >
            {Object.entries(MANUAL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}

      {/* Manualliste med status */}
      {manuals.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {manuals.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-paper border border-line rounded-[14px] px-3.5 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ink truncate">{m.title}</div>
                <div className="text-[12px] text-ink3 mt-0.5 flex items-center gap-1.5">
                  <StatusBadge status={m.status} />
                  {m.manual_type && <span>· {MANUAL_TYPE_LABELS[m.manual_type] || m.manual_type}</span>}
                  {m.page_count ? <span>· {m.page_count} s.</span> : null}
                </div>
                {m.status === 'failed' && m.error && (
                  <div className="text-[12px] text-rust mt-1">{m.error}</div>
                )}
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(m.id)} className="p-2 text-ink3 hover:text-rust" aria-label="Slett manual">
                  <FaTrash className="text-[12px]" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* §11.0: «Spør manualen» kun når minst én manual er klar */}
      {hasReady && (
        <div className="bg-bg border border-line rounded-[16px] p-3.5">
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Spør manualen… f.eks. «Hvilken olje skal brukes?»"
              className="flex-1 min-w-0 bg-paper border border-line rounded-[12px] px-3.5 py-3 text-[15px] text-ink placeholder:text-ink3 outline-none focus:border-ink2"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="flex-shrink-0 bg-ink text-paper px-4 py-3 rounded-[12px] font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {asking ? <FaSpinner className="animate-spin" /> : <FaPaperPlane className="text-[13px]" />}
            </button>
          </form>

          {asking && (
            <p className="text-[13px] text-ink3 mt-3 flex items-center gap-2">
              <FaMagic className="text-sky" /> Leter i manualen…
            </p>
          )}

          {result && !asking && (
            <div className="mt-3">
              <div className={`rounded-[12px] p-3.5 text-[14px] leading-relaxed whitespace-pre-wrap ${result.found ? 'bg-paper border border-line text-ink' : 'bg-amberBg border border-amber/30 text-ink2'}`}>
                {result.answer}
              </div>
              {result.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.sources.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-2.5 py-1 text-[12px] text-ink2">
                      <FaBook className="text-[10px] text-ink3" />
                      {s.manual}{s.page_from ? ` · s. ${s.page_from}${s.page_to && s.page_to !== s.page_from ? `–${s.page_to}` : ''}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Manual['status'] }) {
  if (status === 'ready')
    return <span className="inline-flex items-center gap-1 text-moss"><FaCheckCircle className="text-[10px]" /> {MANUAL_STATUS_LABELS.ready}</span>;
  if (status === 'failed')
    return <span className="inline-flex items-center gap-1 text-rust"><FaExclamationTriangle className="text-[10px]" /> {MANUAL_STATUS_LABELS.failed}</span>;
  return <span className="inline-flex items-center gap-1 text-sky"><FaSpinner className="animate-spin text-[10px]" /> {MANUAL_STATUS_LABELS[status]}</span>;
}
