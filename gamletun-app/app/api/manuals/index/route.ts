// Indekserer en opplastet manual: henter PDF fra Storage, trekker ut tekst pr
// side (unpdf), deler i chunks og lagrer dem for fulltekstsøk. KUN admin.
// Kjøres synkront — for store manualer kan det ta tid; status settes til
// 'failed' med melding hvis noe ryker.
import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CHARS = 3500; // ca. 800–900 tokens pr chunk

// Del en sides tekst i håndterbare biter, helst på avsnitt.
function splitPage(text: string): string[] {
  const clean = text.replace(/\s+\n/g, '\n').trim();
  if (clean.length <= MAX_CHARS) return clean ? [clean] : [];
  const parts: string[] = [];
  let buf = '';
  for (const para of clean.split(/\n{2,}/)) {
    if ((buf + '\n\n' + para).length > MAX_CHARS && buf) {
      parts.push(buf.trim());
      buf = para;
    } else {
      buf = buf ? `${buf}\n\n${para}` : para;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  // Hardt kutt hvis et enkelt avsnitt er enormt.
  return parts.flatMap((p) =>
    p.length <= MAX_CHARS ? [p] : (p.match(new RegExp(`.{1,${MAX_CHARS}}`, 'gs')) || [])
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Krever admin' }, { status: 403 });

  let manualId: string;
  try {
    ({ manualId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }
  if (!manualId) return NextResponse.json({ error: 'Mangler manualId' }, { status: 400 });

  const { data: manual, error: manualErr } = await supabase
    .from('manuals').select('id, file_path').eq('id', manualId).single();
  if (manualErr || !manual) return NextResponse.json({ error: 'Fant ikke manualen' }, { status: 404 });

  await supabase.from('manuals').update({ status: 'parsing', error: null }).eq('id', manualId);

  try {
    const { data: file, error: dlErr } = await supabase.storage.from('manuals').download(manual.file_path);
    if (dlErr || !file) throw new Error('Kunne ikke hente PDF fra lager');

    const buf = new Uint8Array(await file.arrayBuffer());
    const { totalPages, text } = await extractText(buf, { mergePages: false });
    const pages: string[] = Array.isArray(text) ? text : [text];

    const rows: { manual_id: string; chunk_index: number; page_from: number; page_to: number; content: string }[] = [];
    let idx = 0;
    pages.forEach((pageText, p) => {
      for (const chunk of splitPage(pageText || '')) {
        rows.push({ manual_id: manualId, chunk_index: idx++, page_from: p + 1, page_to: p + 1, content: chunk });
      }
    });

    if (rows.length === 0) throw new Error('Fant ingen lesbar tekst i PDF-en (er den skannet/bilde?)');

    // Re-indeksering: fjern gamle chunks først.
    await supabase.from('manual_chunks').delete().eq('manual_id', manualId);
    // Sett inn i porsjoner for å unngå for store forespørsler.
    for (let i = 0; i < rows.length; i += 200) {
      const { error: insErr } = await supabase.from('manual_chunks').insert(rows.slice(i, i + 200));
      if (insErr) throw insErr;
    }

    await supabase.from('manuals').update({ status: 'ready', page_count: totalPages, error: null }).eq('id', manualId);
    return NextResponse.json({ ok: true, pages: totalPages, chunks: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Indeksering feilet';
    console.error('Manual-indeksering feilet:', err);
    await supabase.from('manuals').update({ status: 'failed', error: message }).eq('id', manualId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
