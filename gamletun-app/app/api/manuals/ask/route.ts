// «Spør manualen»: henter relevante chunks fra maskinens ferdig-indekserte
// manualer (fulltekstsøk), og lar Claude svare KUN ut fra dem, med kilder.
// Finner søket ingenting → svar uten å spørre modellen.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStructured, AI_MODELS } from '@/lib/anthropic';

export const maxDuration = 60;

interface ChunkRow {
  chunk_id: string;
  manual_id: string;
  manual_title: string;
  page_from: number | null;
  page_to: number | null;
  content: string;
}

interface Answer {
  found: boolean;
  answer: string;
  source_numbers: number[];
}

const schema = {
  type: 'object',
  properties: {
    found: {
      type: 'boolean',
      description: 'true hvis kildene faktisk inneholder svaret. false hvis det ikke står der.',
    },
    answer: {
      type: 'string',
      description:
        'Svaret på norsk, KUN basert på kildene. Hvis found=false: forklar kort at det ikke ' +
        'står i manualene for denne maskinen. Aldri gjett momentverdier, oljetyper, mengder, ' +
        'intervaller eller delenummer som ikke står i kildene.',
    },
    source_numbers: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Numrene på kildene du faktisk brukte (f.eks. [1, 3]). Tom hvis found=false.',
    },
  },
  required: ['found', 'answer', 'source_numbers'],
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let body: { equipmentId?: string; question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }
  const equipmentId = body.equipmentId;
  const question = (body.question || '').trim();
  if (!equipmentId || !question) {
    return NextResponse.json({ error: 'Mangler maskin eller spørsmål' }, { status: 400 });
  }

  const { data: chunks, error: searchErr } = await supabase.rpc('search_manual_chunks', {
    p_equipment_id: equipmentId,
    p_query: question,
    p_limit: 8,
  });
  if (searchErr) {
    console.error('Manualsøk feilet:', searchErr);
    return NextResponse.json({ error: 'Søket feilet' }, { status: 500 });
  }

  const rows = (chunks || []) as ChunkRow[];

  const logQuery = (answer: string, found: boolean) =>
    supabase.from('manual_queries').insert({
      equipment_id: equipmentId, user_id: user.id, question, answer, found,
    }).then(undefined, () => {});

  // Ingen treff → ikke spør modellen.
  if (rows.length === 0) {
    const answer = 'Fant ikke noe om dette i manualene som er knyttet til denne maskinen.';
    await logQuery(answer, false);
    return NextResponse.json({ found: false, answer, sources: [] });
  }

  const pageLabel = (r: ChunkRow) =>
    r.page_from ? `s. ${r.page_from}${r.page_to && r.page_to !== r.page_from ? `–${r.page_to}` : ''}` : '';
  const context = rows
    .map((r, i) => `[Kilde ${i + 1}] ${r.manual_title}${pageLabel(r) ? `, ${pageLabel(r)}` : ''}:\n${r.content}`)
    .join('\n\n');

  try {
    const result = await extractStructured<Answer>({
      model: AI_MODELS.smart,
      system:
        'Du er en teknisk reparasjons- og serviceassistent for maskiner og kjøretøy. Svar KUN ' +
        'basert på de oppgitte kildeutdragene fra denne maskinens manualer. Står ikke svaret i ' +
        'kildene: sett found=false og si tydelig at det ikke står i manualene — IKKE gjett. ' +
        'Aldri finn på momentverdier, oljetyper, mengder, intervaller eller delenummer. Svar på norsk.',
      content: [
        {
          type: 'text',
          text: `Spørsmål: ${question}\n\nKilder:\n${context}\n\nSvar kun ut fra kildene over, og oppgi hvilke kildenumre du brukte.`,
        },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'svar_fra_manual',
      toolDescription: 'Svar på spørsmålet basert kun på kildene.',
      maxTokens: 1200,
    });

    const used = new Set((result.source_numbers || []).filter((n) => n >= 1 && n <= rows.length));
    const sources = Array.from(used).map((n) => {
      const r = rows[n - 1];
      return { manual: r.manual_title, page_from: r.page_from, page_to: r.page_to };
    });

    await logQuery(result.answer, result.found);
    return NextResponse.json({ found: result.found, answer: result.answer, sources });
  } catch (err) {
    console.error('Manualsvar feilet:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke svare' },
      { status: 502 }
    );
  }
}
