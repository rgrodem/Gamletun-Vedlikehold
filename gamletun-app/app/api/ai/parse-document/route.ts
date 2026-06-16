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

  let body: {
    kind?: string;
    mediaType?: string;
    data?: string;
    equipmentName?: string;
    equipmentCategory?: string;
    equipmentModel?: string;
    corrections?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const { kind, mediaType, data, equipmentName, equipmentCategory, equipmentModel, corrections } = body;
  if (!data || !mediaType || (kind !== 'pdf' && kind !== 'image')) {
    return NextResponse.json({ error: 'Mangler dokument' }, { status: 400 });
  }

  const docBlock: AiContentBlock =
    kind === 'pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

  // Utstyrskontekst gjør at modellen kan TOLKE dokumentet i lys av riktig
  // maskin (f.eks. forstå at "dekk til trillebår/nesehjul" gjelder nesehjulet
  // på en lift) i stedet for å kopiere kvitteringsteksten ordrett.
  const equipmentContext = equipmentName
    ? `Denne loggen gjelder utstyret: ${equipmentName}` +
      `${equipmentModel ? `, modell ${equipmentModel}` : ''}` +
      `${equipmentCategory ? `, kategori ${equipmentCategory}` : ''}.`
    : 'Det er ikke oppgitt hvilket utstyr loggen gjelder.';

  const correctionBlock =
    Array.isArray(corrections) && corrections.length
      ? '\n\nDu foreslo tidligere en logg, men brukeren har korrigert deg ' +
        '(nyeste sist):\n' +
        corrections.map((c, i) => `${i + 1}. ${c}`).join('\n') +
        '\n\nLag en OPPDATERT logg som tar hensyn til korreksjonene.'
      : '';

  try {
    const parsed = await extractStructured<ParsedLog>({
      model: AI_MODELS.smart,
      system:
        'Du leser kvitteringer, fakturaer og servicehefter og lager en vedlikeholdslogg for ET ' +
        'BESTEMT utstyr. Svar alltid på norsk.\n' +
        'VIKTIG: Du skal TOLKE dokumentet i lys av utstyret — ikke bare kopiere teksten.\n' +
        '- Beskriv hva som ble gjort/byttet/reparert og hvorfor, tilpasset utstyret. Hvis ' +
        'dokumentet bruker en generisk betegnelse (f.eks. "dekk til trillebår/nesehjul") men ' +
        'utstyret er en lift, så beskriv det som nesehjulet/styrehjulet på liften.\n' +
        '- Ta MED det som er relevant for vedlikehold/reparasjon: arbeid, deler, og evt. kostnad.\n' +
        '- UTELAT butikk-, ordre-, betalings- og hentingsinformasjon (f.eks. "kan hentes i ' +
        'butikk", adresse, kundenummer, ordrenummer, leveringsmåte). Det hører ikke hjemme i en ' +
        'vedlikeholdslogg.\n' +
        'Hvis et felt ikke finnes, sett det til null. Ikke gjett på datoer/tall som ikke står der.',
      content: [
        docBlock,
        {
          type: 'text',
          text:
            `${equipmentContext}\n\nLes dokumentet og lag en vedlikeholdslogg: en kort, tolket ` +
            `beskrivelse av hva som ble gjort på dette utstyret, med de viktigste delene og ` +
            `evt. totalkostnad. Husk å utelate butikk-/ordre-/hentingsinfo.${correctionBlock}`,
        },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'lagre_vedlikeholdslogg',
      toolDescription: 'Registrer de tolkede feltene til vedlikeholdsloggen.',
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
