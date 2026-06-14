// Oppslag mot Statens Vegvesen sitt API for tekniske kjøretøyopplysninger.
// Kjøres KUN server-side slik at API-nøkkelen aldri når nettleseren.
//
// Miljøvariabler:
//  - SVV_API_KEY  (påkrevd) — API-nøkkel fra Statens Vegvesen
//  - SVV_API_URL  (valgfri) — overstyrer endepunktet
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SVV_URL =
  process.env.SVV_API_URL ||
  'https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata';

export async function GET(request: NextRequest) {
  // Krev innlogget bruker — ellers ville ruten vært en åpen proxy som
  // brenner det daglige oppslagsvolumet (50 000/dag).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }

  const apiKey = process.env.SVV_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Kjøretøyoppslag er ikke konfigurert (SVV_API_KEY mangler).' },
      { status: 503 }
    );
  }

  const kjennemerke = (request.nextUrl.searchParams.get('regnr') || '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!kjennemerke) {
    return NextResponse.json({ error: 'Mangler registreringsnummer' }, { status: 400 });
  }

  let svvResponse: Response;
  try {
    svvResponse = await fetch(`${SVV_URL}?kjennemerke=${encodeURIComponent(kjennemerke)}`, {
      headers: { 'SVV-Authorization': `Apikey ${apiKey}`, Accept: 'application/json' },
    });
  } catch (err) {
    console.error('SVV-oppslag feilet:', err);
    return NextResponse.json({ error: 'Kunne ikke nå Statens Vegvesen' }, { status: 502 });
  }

  if (svvResponse.status === 404) {
    return NextResponse.json({ error: 'Fant ikke kjøretøyet' }, { status: 404 });
  }
  if (!svvResponse.ok) {
    console.error(`SVV-feil (${svvResponse.status}):`, await svvResponse.text());
    const msg =
      svvResponse.status === 401 || svvResponse.status === 403
        ? 'Avvist av Statens Vegvesen — sjekk API-nøkkelen.'
        : 'Oppslag mot Statens Vegvesen feilet.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const data = await svvResponse.json();
  const vehicle = data?.kjoretoydataListe?.[0];
  if (!vehicle) {
    return NextResponse.json(
      { error: 'Fant ingen data for dette registreringsnummeret' },
      { status: 404 }
    );
  }

  const tekniskeData = vehicle?.godkjenning?.tekniskGodkjenning?.tekniskeData;
  const vekter = tekniskeData?.vekter;
  const firstTire =
    tekniskeData?.dekkOgFelg?.akselDekkOgFelgKombinasjon?.[0]?.akselDekkOgFelg?.[0];
  const generelt = tekniskeData?.generelt;

  // Normaliser en dato- eller tidsstempelverdi til 'YYYY-MM-DD'.
  const asDate = (value: unknown): string | null =>
    typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null;

  // "Registrert på eier" ligger ikke alltid på samme felt — prøv de mest
  // sannsynlige stiene i tur og orden.
  const registrering = vehicle?.registrering;
  const registeredOwnerDate =
    asDate(registrering?.fomTidspunkt) ??
    asDate(registrering?.fomDato) ??
    asDate(registrering?.registrertForstegangPaEierDato) ??
    null;

  const response: Record<string, unknown> = {
    registrationNumber: vehicle?.kjoretoyId?.kjennemerke ?? kjennemerke,
    totalWeightKg: vekter?.tillattTotalvekt ?? null,
    curbWeightKg: vekter?.egenvekt ?? null,
    tireDimension: firstTire?.dekkdimensjon ?? null,
    make: generelt?.merke?.[0]?.merke ?? null,
    model: generelt?.handelsbetegnelse?.[0] ?? null,
    firstRegistrationDate: asDate(vehicle?.forstegangsregistrering?.registrertForstegangNorgeDato),
    registeredOwnerDate,
  };

  // ?debug=1 returnerer de rå registrerings-objektene (ingen eieridentitet)
  // så feltstier kan bekreftes mot en ekte respons ved behov.
  if (request.nextUrl.searchParams.get('debug')) {
    response._debug = {
      forstegangsregistrering: vehicle?.forstegangsregistrering ?? null,
      registrering: registrering ?? null,
    };
  }

  return NextResponse.json(response);
}
