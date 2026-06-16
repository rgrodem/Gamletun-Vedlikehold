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

  let body: { mediaType?: string; data?: string; equipmentName?: string; equipmentCategory?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const { mediaType, data, equipmentName, equipmentCategory } = body;
  if (!data || !mediaType?.startsWith('image/')) {
    return NextResponse.json({ error: 'Mangler bilde' }, { status: 400 });
  }

  const contextLine = equipmentName
    ? `Utstyret er: ${equipmentName}${equipmentCategory ? ` (kategori: ${equipmentCategory})` : ''}.`
    : '';

  try {
    const diagnosis = await extractStructured<Diagnosis>({
      model: AI_MODELS.smart,
      system:
        'Du er en erfaren landbruksmekaniker som vurderer feil på maskiner og kjøretøy ut fra foto. ' +
        'Svar alltid på norsk. Vær konkret, men ikke overdriv sikkerheten — dette er et forslag som ' +
        'en person skal kontrollere. Velg prioritet konservativt: ved tvil om sikkerhet, velg høyere.',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        {
          type: 'text',
          text:
            `${contextLine}\n\nSe på bildet og vurder feilen: gi en kort tittel, sannsynlig årsak, ` +
            'alvorlighet (prioritet), foreslått utbedring og sannsynlige deler.',
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
