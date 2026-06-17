// Gjenkjenn utstyr fra bilde eller dokument: foto av en maskin/kjøretøy, et
// lagret bilde, eller en PDF (f.eks. vognkort/faktura) → forslag til navn,
// modell, kategori, og avlest registreringsnummer hvis synlig.
// KUN forslag — brukeren bekrefter i skjemaet. For registrerte kjøretøy
// gjør klienten et SVV-oppslag på regnummeret etterpå.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStructured, AI_MODELS, type AiContentBlock } from '@/lib/anthropic';

export const maxDuration = 60;

interface Identification {
  name: string;
  model: string;
  category: string;
  registrationNumber: string;
  isVehicle: boolean;
  notes: string;
}

const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description:
        'Kort, beskrivende navn på utstyret på norsk. F.eks. "Traktor", "Tilhenger", ' +
        '"Gravemaskin", "Personbil". Inkluder merke hvis tydelig, f.eks. "Traktor John Deere".',
    },
    model: {
      type: 'string',
      description: 'Modell/type hvis lesbar (skilt, dekal, karosseri). Tom streng hvis ukjent.',
    },
    category: {
      type: 'string',
      description:
        'Velg den kategorien fra listen som passer best. Bruk nøyaktig samme tekst som i ' +
        'listen, eller tom streng hvis ingen passer.',
    },
    registrationNumber: {
      type: 'string',
      description:
        'Norsk registreringsnummer avlest fra skiltet (to bokstaver + fem siffer, f.eks. ' +
        '"RU40331" eller "EK12345"). Tom streng hvis ikke noe skilt er synlig/lesbart.',
    },
    isVehicle: {
      type: 'boolean',
      description: 'true hvis dette er et registrert kjøretøy eller tilhenger (har/skal ha skilt).',
    },
    notes: {
      type: 'string',
      description:
        'Korte, nyttige observasjoner på norsk (farge, synlig tilstand, særtrekk). ' +
        'Tolk det du ser — ikke bare transkriber tekst. Tom streng hvis ingenting relevant.',
    },
  },
  required: ['name', 'model', 'category', 'registrationNumber', 'isVehicle', 'notes'],
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let body: {
    documents?: Array<{ kind?: string; mediaType?: string; data?: string }>;
    images?: Array<{ mediaType?: string; data?: string }>;
    categories?: string[];
    regnrHint?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  // Godta både dokumenter (bilde + PDF) og ren bilde-liste (bakoverkompatibelt).
  const rawDocs =
    Array.isArray(body.documents) && body.documents.length
      ? body.documents
      : (Array.isArray(body.images) ? body.images : []).map((img) => ({
          kind: 'image',
          mediaType: img.mediaType,
          data: img.data,
        }));

  const docBlocks: AiContentBlock[] = rawDocs
    .slice(0, 6)
    .filter((d) => d.data && d.mediaType && (d.kind === 'pdf' || d.kind === 'image'))
    .map((d) =>
      d.kind === 'pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.data! } }
        : { type: 'image', source: { type: 'base64', media_type: d.mediaType!, data: d.data! } }
    );

  if (docBlocks.length === 0) {
    return NextResponse.json({ error: 'Mangler bilde eller dokument' }, { status: 400 });
  }

  const categories = Array.isArray(body.categories) ? body.categories.filter(Boolean) : [];
  const categoryLine = categories.length
    ? `Tilgjengelige kategorier (velg den som passer best, ellers tom): ${categories.join(', ')}.`
    : '';
  const regnrLine = body.regnrHint?.trim()
    ? `Brukeren har oppgitt registreringsnummer: ${body.regnrHint.trim().toUpperCase()}. Bruk dette med mindre dokumentet tydelig viser noe annet.`
    : '';
  const docsHint =
    docBlocks.length > 1 ? `\n\nDet er ${docBlocks.length} vedlegg — bruk dem sammen.` : '';

  try {
    const result = await extractStructured<Identification>({
      model: AI_MODELS.smart,
      system:
        'Du hjelper en gård med å registrere utstyr og kjøretøy ut fra bilder og dokumenter. ' +
        'Vedlegget kan være et foto av maskinen, et lagret bilde, eller en PDF som vognkort, ' +
        'faktura eller salgspapir. Svar alltid på norsk. Tolk det du ser — ikke bare les av tekst. ' +
        'Hvis et norsk registreringsnummer er synlig (på skilt eller i vognkort), les det av ' +
        'nøyaktig (to bokstaver fulgt av fem siffer). Et vognkort kan også oppgi merke, modell og ' +
        'årsmodell — ta det med. Vær konkret men ikke gjett vilt: bruk tom streng for felt du er ' +
        'usikker på.',
      content: [
        ...docBlocks,
        {
          type: 'text',
          text:
            `Se på vedlegget/vedleggene og identifiser utstyret. Foreslå navn, modell og kategori, ` +
            `og les av registreringsnummeret hvis det er synlig (skilt eller vognkort).\n\n${categoryLine}\n${regnrLine}${docsHint}`,
        },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'registrer_utstyr',
      toolDescription: 'Registrer det identifiserte utstyret fra vedlegget.',
      maxTokens: 1024,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Utstyrsgjenkjenning feilet:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke analysere bildet' },
      { status: 502 }
    );
  }
}
