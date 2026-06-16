// Feildiagnose fra bilde: foto av en feil → sannsynlig årsak, alvorlighet,
// foreslått tittel/prioritet og deler. KUN forslag — brukeren bekrefter.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStructured, AI_MODELS } from '@/lib/anthropic';

export const maxDuration = 60;

interface Diagnosis {
  title: string;
  likelyCause: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedAction: string;
  suggestedParts: string[];
}

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Kort tittel på feilen, norsk. F.eks. "Hydraulikklekkasje".' },
    likelyCause: { type: 'string', description: 'Sannsynlig årsak, 1–2 setninger, norsk.' },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'urgent'],
      description:
        'Alvorlighet: low = kosmetisk (utstyret kan brukes), medium = bør utbedres, ' +
        'high = utstyret bør ikke brukes, urgent = sikkerhetsrisiko/akutt.',
    },
    suggestedAction: { type: 'string', description: 'Foreslått utbedring, norsk, kortfattet.' },
    suggestedParts: {
      type: 'array',
      items: { type: 'string' },
      description: 'Sannsynlige deler som trengs (norsk). Tom liste hvis usikkert.',
    },
  },
  required: ['title', 'likelyCause', 'priority', 'suggestedAction', 'suggestedParts'],
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let body: {
    images?: Array<{ mediaType?: string; data?: string }>;
    mediaType?: string;
    data?: string;
    equipmentName?: string;
    equipmentCategory?: string;
    corrections?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const { equipmentName, equipmentCategory, corrections } = body;

  // Støtt flere bilder (images[]) og ett enkelt (bakoverkompatibelt). Maks 6.
  const rawImages =
    Array.isArray(body.images) && body.images.length
      ? body.images
      : body.data
        ? [{ mediaType: body.mediaType, data: body.data }]
        : [];

  const imageBlocks = rawImages
    .slice(0, 6)
    .filter((img) => img.data && img.mediaType?.startsWith('image/'))
    .map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mediaType!, data: img.data! },
    }));

  if (imageBlocks.length === 0) {
    return NextResponse.json({ error: 'Mangler bilde' }, { status: 400 });
  }

  const contextLine = equipmentName
    ? `Utstyret er: ${equipmentName}${equipmentCategory ? ` (kategori: ${equipmentCategory})` : ''}.`
    : '';

  // Hvis brukeren har korrigert tidligere diagnoser, ta korreksjonene med i
  // konteksten så KI lager en oppdatert diagnose som stemmer med virkeligheten.
  const correctionBlock =
    Array.isArray(corrections) && corrections.length
      ? '\n\nDu foreslo tidligere en diagnose, men brukeren — som ser utstyret fysisk — har ' +
        'korrigert deg. Korreksjoner (nyeste sist):\n' +
        corrections.map((c, i) => `${i + 1}. ${c}`).join('\n') +
        '\n\nLag en OPPDATERT diagnose som tar hensyn til korreksjonene. Stol på brukeren.'
      : '';

  const imagesHint =
    imageBlocks.length > 1
      ? `\n\nDet er ${imageBlocks.length} bilder — bruk dem sammen for å forstå feilen.`
      : '';

  try {
    const diagnosis = await extractStructured<Diagnosis>({
      model: AI_MODELS.smart,
      system:
        'Du er en erfaren landbruksmekaniker som vurderer feil på maskiner og kjøretøy ut fra foto. ' +
        'Svar alltid på norsk. Vær konkret, men ikke overdriv sikkerheten — dette er et forslag som ' +
        'en person skal kontrollere. Velg prioritet konservativt: ved tvil om sikkerhet, velg høyere.',
      content: [
        ...imageBlocks,
        {
          type: 'text',
          text:
            `${contextLine}\n\nSe på bildet/bildene og vurder feilen: gi en kort tittel, sannsynlig årsak, ` +
            `alvorlighet (prioritet), foreslått utbedring og sannsynlige deler.${imagesHint}${correctionBlock}`,
        },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'registrer_feildiagnose',
      toolDescription: 'Registrer diagnosen av feilen på bildet.',
      maxTokens: 1024,
    });

    return NextResponse.json(diagnosis);
  } catch (err) {
    console.error('Feildiagnose feilet:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke analysere bildet' },
      { status: 502 }
    );
  }
}
