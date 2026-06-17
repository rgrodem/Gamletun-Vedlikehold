// Leser en kvittering/faktura (PDF eller bilde) og foreslår delelinjer til
// varelageret: navn, antall, enhet, pris, kategori, type (forbruk vs
// utstyrsspesifikk) og hvilket utstyr delen sannsynligvis passer til.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStructured, AI_MODELS, type AiContentBlock } from '@/lib/anthropic';

export const maxDuration = 60;

interface ParsedLine {
  name: string;
  partNumber: string | null;
  quantity: number | null;
  unit: 'stk' | 'liter' | 'meter' | 'kg' | null;
  unitCost: number | null;
  category: string | null;
  partType: 'consumable' | 'equipment_specific' | null;
  suggestedEquipment: string[];
}

const schema = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      description: 'Én linje per reservedel/forbruksvare på kvitteringen. Hopp over frakt, gebyr og arbeid.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Varenavn, norsk.' },
          partNumber: { type: ['string', 'null'], description: 'Delenummer hvis oppgitt.' },
          quantity: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'], enum: ['stk', 'liter', 'meter', 'kg', null] },
          unitCost: { type: ['number', 'null'], description: 'Enhetspris i kr.' },
          category: { type: ['string', 'null'], description: 'Kort kategori: filter, olje, reim, pakning, etc.' },
          partType: {
            type: ['string', 'null'],
            enum: ['consumable', 'equipment_specific', null],
            description: 'consumable = generelt forbruk (olje, fett). equipment_specific = del knyttet til en bestemt maskin (filter, pakning).',
          },
          suggestedEquipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Navn på utstyr fra listen som delen sannsynligvis passer til. Tom hvis usikkert.',
          },
        },
        required: ['name', 'partNumber', 'quantity', 'unit', 'unitCost', 'category', 'partType', 'suggestedEquipment'],
      },
    },
  },
  required: ['lines'],
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });

  let body: {
    documents?: Array<{ kind?: string; mediaType?: string; data?: string }>;
    equipmentNames?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const docBlocks: AiContentBlock[] = (body.documents || [])
    .slice(0, 6)
    .filter((d) => d.data && d.mediaType && (d.kind === 'pdf' || d.kind === 'image'))
    .map((d) =>
      d.kind === 'pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.data! } }
        : { type: 'image', source: { type: 'base64', media_type: d.mediaType!, data: d.data! } }
    );

  if (docBlocks.length === 0) {
    return NextResponse.json({ error: 'Mangler dokument' }, { status: 400 });
  }

  const equipmentList = (body.equipmentNames || []).filter(Boolean);
  const equipmentContext = equipmentList.length
    ? `Tilgjengelig utstyr på gården: ${equipmentList.join(', ')}.`
    : 'Ingen utstyrsliste oppgitt.';

  try {
    const result = await extractStructured<{ lines: ParsedLine[] }>({
      model: AI_MODELS.smart,
      system:
        'Du leser kvitteringer/fakturaer for reservedeler og forbruksmateriell til en gård, og ' +
        'trekker ut delelinjene til et varelager. Svar på norsk. Tolk varelinjene: skill mellom ' +
        'generelt forbruk (olje, fett → consumable, ofte i liter) og utstyrsspesifikke deler ' +
        '(filtre, pakninger, reimer → equipment_specific). Foreslå hvilket utstyr fra listen en ' +
        'del sannsynligvis passer til ut fra delenavn/-nummer. Hopp over frakt, gebyr, arbeid og ' +
        'andre ikke-vare-linjer. Ikke gjett på tall som ikke står der.',
      content: [
        ...docBlocks,
        { type: 'text', text: `${equipmentContext}\n\nTrekk ut delelinjene fra kvitteringen.` },
      ],
      schema: schema as unknown as Record<string, unknown>,
      toolName: 'registrer_delelinjer',
      toolDescription: 'Registrer de uthentede delelinjene fra kvitteringen.',
      maxTokens: 2048,
    });

    return NextResponse.json({ lines: result.lines || [] });
  } catch (err) {
    console.error('Kvittering-parsing (deler) feilet:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunne ikke lese kvitteringen' },
      { status: 502 }
    );
  }
}
