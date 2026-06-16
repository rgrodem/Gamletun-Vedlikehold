// Dokument-intelligens: les en kvittering/servicehefte (PDF eller bilde) og
// trekk ut felt til en ferdig vedlikeholdslogg. KUN forslag — brukeren
// godkjenner før lagring.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStructured, AI_MODELS, type AiContentBlock } from '@/lib/anthropic';

export const maxDuration = 60;

interface ParsedLog {
  maintenanceType: string | null;
  description: string | null;
  performedDate: string | null;
  hours: number | null;
  totalCost: number | null;
}

const schema = {
  type: 'object',
  properties: {
    maintenanceType: {
      type: ['string', 'null'],
      description: 'Kort type arbeid, f.eks. "Service", "Oljeskift", "Reparasjon". Norsk.',
    },
    description: {
      type: ['string', 'null'],
      description:
        'Oppsummering av hva som ble gjort, inkl. viktige deler og evt. totalkostnad. Norsk, kortfattet.',
    },
    performedDate: {
      type: ['string', 'null'],
      description: 'Dato arbeidet ble utført, format YYYY-MM-DD. Null hvis ukjent.',
    },
    hours: { type: ['number', 'null'], description: 'Antall timer brukt, hvis oppgitt.' },
    totalCost: { type: ['number', 'null'], description: 'Total kostnad i kroner, hvis oppgitt.' },
  },
  required: ['maintenanceType', 'description', 'performedDate', 'hours', 'totalCost'],
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let body: { kind?: string; mediaType?: string; data?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const { kind, mediaType, data } = body;
  if (!data || !mediaType || (kind !== 'pdf' && kind !== 'image')) {
    return NextResponse.json({ error: 'Mangler dokument' }, { status: 400 });
  }

  const docBlock: AiContentBlock =
    kind === 'pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

  try {
    const parsed = await extractStructured<ParsedLog>({
      model: AI_MODELS.smart,
      system:
        'Du leser kvitteringer, fakturaer og servicehefter for landbruks- og kjøretøyvedlikehold ' +
        'og trekker ut informasjon til en vedlikeholdslogg. Svar alltid på norsk. Hvis et felt ikke ' +
        'finnes i dokumentet, sett det til null. Ikke gjett på datoer eller tall som ikke står der.',
      content: [
        docBlock,
        {
          type: 'text',
          text:
            'Trekk ut feltene til en vedlikeholdslogg fra dette dokumentet. ' +
            'Lag en kort, nyttig beskrivelse som oppsummerer arbeidet og de viktigste delene.',
        },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'lagre_vedlikeholdslogg',
      toolDescription: 'Registrer de uthentede feltene fra dokumentet.',
      maxTokens: 1024,
    });

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Dokument-parsing feilet:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke lese dokumentet' },
      { status: 502 }
    );
  }
}
