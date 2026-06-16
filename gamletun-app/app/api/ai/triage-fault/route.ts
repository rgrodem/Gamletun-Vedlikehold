// Auto-triagering: tekstbasert feilbeskrivelse → foreslått prioritet og
// kategori. Rask og billig (Haiku). KUN forslag.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStructured, AI_MODELS } from '@/lib/anthropic';

interface Triage {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  rationale: string;
}

const schema = {
  type: 'object',
  properties: {
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'urgent'],
      description:
        'low = kosmetisk (utstyret kan brukes), medium = bør utbedres, ' +
        'high = utstyret bør ikke brukes, urgent = sikkerhetsrisiko/akutt.',
    },
    category: {
      type: 'string',
      description: 'Kort kategori, norsk: f.eks. Elektrisk, Hydraulisk, Mekanisk, Motor, Dekk/hjul, Annet.',
    },
    rationale: { type: 'string', description: 'Kort begrunnelse, norsk, én setning.' },
  },
  required: ['priority', 'category', 'rationale'],
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let body: { title?: string; description?: string; equipmentName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const text = [body.title, body.description].filter(Boolean).join('. ').trim();
  if (!text) {
    return NextResponse.json({ error: 'Mangler beskrivelse' }, { status: 400 });
  }

  try {
    const triage = await extractStructured<Triage>({
      model: AI_MODELS.fast,
      system:
        'Du klassifiserer feilmeldinger på landbruksutstyr og kjøretøy. Svar på norsk. ' +
        'Velg prioritet konservativt: ved tvil om sikkerhet, velg høyere.',
      content: [
        {
          type: 'text',
          text: `${body.equipmentName ? `Utstyr: ${body.equipmentName}.\n` : ''}Feil: ${text}`,
        },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'klassifiser_feil',
      toolDescription: 'Sett prioritet og kategori for feilmeldingen.',
      maxTokens: 256,
    });

    return NextResponse.json(triage);
  } catch (err) {
    console.error('Triagering feilet:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke vurdere feilen' },
      { status: 502 }
    );
  }
}
