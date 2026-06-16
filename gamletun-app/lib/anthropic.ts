// Delt server-side klient mot Claude (Anthropic) API.
// KUN server-side — ANTHROPIC_API_KEY må aldri nå nettleseren.
//
// Verifiserte modell-ID-er (2026): rask = Haiku, smart/vision = Sonnet.
// Vi bruker "tool use" med tvunget tool_choice for å få garantert
// strukturert JSON ut, et mønster som er bredt støttet på alle modeller.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export const AI_MODELS = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-4-6',
} as const;

export type AiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

interface ExtractStructuredParams {
  model?: string;
  system: string;
  content: AiContentBlock[];
  /** JSON Schema for det strukturerte svaret (input_schema til verktøyet). */
  schema: Record<string, unknown>;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Send en forespørsel til Claude og få tilbake et strukturert objekt som
 * følger `schema`. Kaster ved manglende nøkkel eller API-feil.
 */
export async function extractStructured<T>({
  model = AI_MODELS.fast,
  system,
  content,
  schema,
  toolName,
  toolDescription,
  maxTokens = 1024,
}: ExtractStructuredParams): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY mangler — KI-funksjoner er ikke konfigurert.');
  }

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        tools: [{ name: toolName, description: toolDescription, input_schema: schema }],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    console.error('Kunne ikke nå Anthropic:', err);
    throw new Error('Kunne ikke nå KI-tjenesten.');
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`Anthropic-feil (${res.status}):`, body);
    if (res.status === 401) throw new Error('KI avvist — sjekk ANTHROPIC_API_KEY.');
    if (res.status === 429) throw new Error('KI er opptatt akkurat nå. Prøv igjen om litt.');
    throw new Error('KI-forespørselen feilet.');
  }

  const data = await res.json();
  const toolUse = (data.content || []).find((b: { type: string }) => b.type === 'tool_use');
  if (!toolUse?.input) {
    throw new Error('Fikk ikke et strukturert svar fra KI.');
  }
  return toolUse.input as T;
}
