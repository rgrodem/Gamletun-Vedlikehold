'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaPlus, FaTimes, FaMagic, FaCloudDownloadAlt, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, compressImage } from '@/lib/storage';
import { fileToBase64 } from '@/lib/file-to-base64';
import ImageUpload from '../uploads/ImageUpload';
import { useModalBehavior } from '@/lib/use-modal-behavior';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ExistingEquipment {
  id: string;
  name: string;
  model: string | null;
  registration_number: string | null;
}

interface AddEquipmentModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

// Tolk et tallfelt (vekt) til heltall, eller null hvis tomt/ugyldig.
function parseIntOrNull(value: string): number | null {
  const parsed = parseInt(value.replace(/\s/g, ''), 10);
  return value.trim() && !isNaN(parsed) ? parsed : null;
}

// Normaliser tekst for sammenligning: små bokstaver, uten doble mellomrom.
function norm(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Gjør et bilde klart for KI: komprimer ned så det holder seg godt under
// API-grensen (~5 MB), ellers avvises store telefonbilder og gjenkjenningen
// feiler «raskt». PDF sendes som den er.
async function fileToAiDoc(f: File): Promise<{ data: string; mediaType: string; kind: 'pdf' | 'image' }> {
  if (f.type === 'application/pdf') {
    return { data: await fileToBase64(f), mediaType: f.type, kind: 'pdf' };
  }
  const blob = await compressImage(f, 1568, 1568, 0.8);
  return { data: await fileToBase64(blob), mediaType: 'image/jpeg', kind: 'image' };
}

export default function AddEquipmentModal({ categories, onClose, onSuccess }: AddEquipmentModalProps) {
  useModalBehavior(onClose);
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Kjøretøyfelter
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [curbWeight, setCurbWeight] = useState('');
  const [tireDimension, setTireDimension] = useState('');
  const [firstRegistrationDate, setFirstRegistrationDate] = useState('');
  const [showVehicle, setShowVehicle] = useState(false);

  // KI-gjenkjenning
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState('');

  // SVV-oppslag
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Duplikatsjekk
  const [existing, setExisting] = useState<ExistingEquipment[]>([]);
  const [duplicates, setDuplicates] = useState<ExistingEquipment[]>([]);
  const [dupKind, setDupKind] = useState<'regnr' | 'name' | null>(null);

  // Hent eksisterende utstyr for å kunne advare mot dobbeltregistrering.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('equipment')
      .select('id, name, model, registration_number')
      .then(({ data }) => setExisting((data as ExistingEquipment[]) || []));
  }, []);

  // Finn mulige duplikater: likt regnummer (sterkt signal) eller likt navn.
  const findDuplicates = (): { kind: 'regnr' | 'name' | null; matches: ExistingEquipment[] } => {
    const reg = norm(registrationNumber);
    if (reg) {
      const regMatches = existing.filter((e) => norm(e.registration_number) === reg);
      if (regMatches.length) return { kind: 'regnr', matches: regMatches };
    }
    const n = norm(name);
    if (n) {
      const nameMatches = existing.filter((e) => norm(e.name) === n);
      if (nameMatches.length) return { kind: 'name', matches: nameMatches };
    }
    return { kind: null, matches: [] };
  };

  const matchCategory = (catName: string): string => {
    if (!catName) return '';
    const hit = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    return hit?.id || '';
  };

  const runVehicleLookup = async (regnr: string): Promise<boolean> => {
    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const res = await fetch(`/api/vehicle-lookup?regnr=${encodeURIComponent(regnr)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupMessage({ type: 'error', text: data.error || 'Oppslaget feilet.' });
        return false;
      }
      if (data.registrationNumber) setRegistrationNumber(data.registrationNumber);
      if (data.totalWeightKg != null) setTotalWeight(String(data.totalWeightKg));
      if (data.curbWeightKg != null) setCurbWeight(String(data.curbWeightKg));
      if (data.tireDimension) setTireDimension(data.tireDimension);
      if (data.firstRegistrationDate) setFirstRegistrationDate(data.firstRegistrationDate);
      // "Registrert på eier" fyller Anskaffet-feltet.
      if (data.registeredOwnerDate) setPurchaseDate(data.registeredOwnerDate);
      if (data.model) setModel((prev) => prev.trim() || data.model);
      setLookupMessage({ type: 'ok', text: 'Hentet fra Statens Vegvesen.' });
      return true;
    } catch (err) {
      console.error('Kjøretøyoppslag feilet:', err);
      setLookupMessage({ type: 'error', text: 'Kunne ikke hente data.' });
      return false;
    } finally {
      setLookupLoading(false);
    }
  };

  const handleVehicleLookup = async () => {
    const regnr = registrationNumber.trim();
    if (!regnr) {
      setLookupMessage({ type: 'error', text: 'Skriv inn registreringsnummer først.' });
      return;
    }
    await runVehicleLookup(regnr);
  };

  const handleAiPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setAiLoading(true);
    setError('');
    setAiNote('');
    try {
      // Godta bilder og PDF (vognkort/faktura). Maks 6 vedlegg, 25 MB per stk.
      const usable = files
        .filter(
          (f) =>
            (f.type.startsWith('image/') || f.type === 'application/pdf') &&
            f.size <= 25 * 1024 * 1024
        )
        .slice(0, 6);
      if (usable.length === 0) {
        setError('Velg minst ett bilde eller en PDF (maks 25 MB per fil).');
        return;
      }
      const documents = await Promise.all(usable.map(fileToAiDoc));
      const res = await fetch('/api/ai/identify-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents,
          categories: categories.map((c) => c.name),
          regnrHint: registrationNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kunne ikke gjenkjenne utstyret.');
        return;
      }

      // Fyll feltene fra KI (overskriver ikke tekst brukeren allerede har skrevet).
      if (data.name) setName((prev) => prev.trim() || data.name);
      if (data.model) setModel((prev) => prev.trim() || data.model);
      if (data.notes) setNotes((prev) => prev.trim() || data.notes);
      const catId = matchCategory(data.category || '');
      if (catId) setCategoryId((prev) => prev || catId);

      let regnrFound = '';
      if (data.registrationNumber) {
        regnrFound = String(data.registrationNumber).replace(/\s+/g, '').toUpperCase();
        setRegistrationNumber(regnrFound);
      }
      if (data.isVehicle || regnrFound) setShowVehicle(true);

      // Last opp første bilde som utstyrsbilde (PDF kan ikke være utstyrsbilde).
      const firstImage = usable.find((f) => f.type.startsWith('image/'));
      if (firstImage) {
        try {
          const up = await uploadFile('equipment-images', firstImage, 'new');
          setImageUrl(up.url);
        } catch (upErr) {
          console.error('Kunne ikke laste opp bilde:', upErr);
        }
      }

      // Hvis vi fant et regnummer: hent kjøretøydata automatisk.
      if (regnrFound) {
        const ok = await runVehicleLookup(regnrFound);
        setAiNote(
          ok
            ? `Gjenkjente «${data.name || 'utstyr'}» og hentet kjøretøydata for ${regnrFound}. Kontroller og lagre.`
            : `Gjenkjente «${data.name || 'utstyr'}» og leste regnummer ${regnrFound}, men kjøretøyoppslaget feilet. Kontroller manuelt.`
        );
      } else if (data.name) {
        setAiNote(`Gjenkjente «${data.name}». Kontroller feltene og lagre.`);
      } else {
        setAiNote('Klarte ikke å fastslå type sikkert. Fyll inn navn selv, eller prøv et tydeligere bilde.');
      }
    } catch (err) {
      console.error('KI-gjenkjenning feilet:', err);
      setError('Kunne ikke gjenkjenne utstyret.');
    } finally {
      setAiLoading(false);
    }
  };

  // skipDuplicateCheck=true når brukeren har bekreftet at dette er en ny enhet.
  const handleSubmit = async (e: React.FormEvent, skipDuplicateCheck = false) => {
    e.preventDefault();

    if (!skipDuplicateCheck) {
      const { kind, matches } = findDuplicates();
      if (kind) {
        setDuplicates(matches);
        setDupKind(kind);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('equipment').insert({
        name: name.trim(),
        model: model.trim() || null,
        serial_number: serialNumber.trim() || null,
        category_id: categoryId || null,
        purchase_date: purchaseDate || null,
        notes: notes.trim() || null,
        image_url: imageUrl,
        registration_number: registrationNumber.trim().toUpperCase() || null,
        total_weight_kg: parseIntOrNull(totalWeight),
        curb_weight_kg: parseIntOrNull(curbWeight),
        tire_dimension: tireDimension.trim() || null,
        first_registration_date: firstRegistrationDate || null,
        status: 'active',
      });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kunne ikke legge til utstyr');
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="bg-white flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nytt Utstyr</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lukk modal"
          >
            <FaTimes className="text-lg sm:text-xl text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* KI: gjenkjenn fra bilde eller PDF */}
          <label className="block cursor-pointer bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center text-blue-700">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <FaMagic /> {aiLoading ? 'Gjenkjenner…' : 'Fyll ut med KI (bilde eller PDF)'}
            </span>
            <p className="text-xs text-blue-600/80 mt-0.5 font-normal">
              Ta bilde, velg et lagret bilde, eller last opp en PDF (f.eks. vognkort).
              Leser regnummer og henter kjøretøydata automatisk.
            </p>
            <input
              type="file"
              onChange={handleAiPhoto}
              accept="image/*,.pdf"
              multiple
              disabled={aiLoading}
              className="hidden"
            />
          </label>
          {aiNote && <p className="text-xs text-green-700 -mt-2">{aiNote}</p>}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Navn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
              placeholder="F.eks. Gravemaskin Volvo"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Modell</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputCls}
              placeholder="F.eks. EC20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">Velg kategori (valgfritt)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <ImageUpload
            currentImageUrl={imageUrl}
            onImageUploaded={(url) => setImageUrl(url)}
            onImageRemoved={() => setImageUrl(null)}
            bucket="equipment-images"
            folder="new"
            maxSizeMB={40}
            label="Bilde av utstyr"
            description="Last opp et bilde. Bildet vises i oversikt, detaljside og rapporter."
            aspectRatio="landscape"
          />

          {/* Kjøretøy / tilhenger */}
          <div className="border-t border-gray-200 pt-4">
            {!showVehicle ? (
              <button
                type="button"
                onClick={() => setShowVehicle(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                + Legg til kjøretøy / tilhenger (registreringsnummer)
              </button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Kjøretøy / tilhenger</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registreringsnummer</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => { setRegistrationNumber(e.target.value); setLookupMessage(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleVehicleLookup(); } }}
                      className={`${inputCls} uppercase`}
                      placeholder="F.eks. RU 4033"
                    />
                    <button
                      type="button"
                      onClick={handleVehicleLookup}
                      disabled={lookupLoading || !registrationNumber.trim()}
                      className="flex-shrink-0 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FaCloudDownloadAlt /> {lookupLoading ? 'Henter…' : 'Hent'}
                    </button>
                  </div>
                  {lookupMessage && (
                    <p className={`text-xs mt-1.5 ${lookupMessage.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                      {lookupMessage.text}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dekkdimensjon</label>
                    <input type="text" value={tireDimension} onChange={(e) => setTireDimension(e.target.value)} className={inputCls} placeholder="155 R 13" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Totalvekt (kg)</label>
                    <input type="text" inputMode="numeric" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} className={inputCls} placeholder="2000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Egenvekt (kg)</label>
                    <input type="text" inputMode="numeric" value={curbWeight} onChange={(e) => setCurbWeight(e.target.value)} className={inputCls} placeholder="345" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registrert første gang (årsmodell)</label>
                  <input type="date" value={firstRegistrationDate} onChange={(e) => setFirstRegistrationDate(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Serienummer + Anskaffet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Serienummer</label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputCls} placeholder="ABC123456" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Anskaffet</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Notater */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notater</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Ekstra informasjon om utstyret…"
            />
          </div>

          {/* Duplikatvarsel */}
          {dupKind && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">
                    {dupKind === 'regnr'
                      ? `Registreringsnummeret ${registrationNumber.trim().toUpperCase()} er allerede registrert`
                      : `«${name.trim()}» finnes allerede`}
                  </p>
                  <p className="text-sm text-amber-800 mt-0.5">
                    {dupKind === 'regnr'
                      ? 'Dette er sannsynligvis det samme kjøretøyet. Vil du åpne det som finnes, eller registrere dette som en ny enhet likevel?'
                      : 'Er dette det samme utstyret, eller en ny enhet (f.eks. en ekstra skuff til gravemaskinen)?'}
                  </p>
                  <div className="mt-2 space-y-1">
                    {duplicates.map((d) => (
                      <Link
                        key={d.id}
                        href={`/equipment/${d.id}`}
                        className="flex items-center gap-1.5 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
                      >
                        {d.name}
                        {d.model ? ` · ${d.model}` : ''}
                        {d.registration_number ? ` · ${d.registration_number}` : ''}
                        <FaArrowRight className="text-[11px]" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => { setDupKind(null); setDuplicates([]); }}
                  className="flex-1 px-4 py-2.5 border border-amber-400 text-amber-900 font-semibold rounded-lg hover:bg-amber-100 text-sm min-h-[44px]"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={(e) => { setDupKind(null); handleSubmit(e, true); }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm min-h-[44px]"
                >
                  {loading ? 'Lagrer…' : 'Registrer som ny enhet'}
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          {!dupKind && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
                aria-label="Avbryt og lukk"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || aiLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
                aria-label="Legg til nytt utstyr"
              >
                {loading ? <span>Lagrer...</span> : (<><FaPlus /><span>Legg til</span></>)}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
