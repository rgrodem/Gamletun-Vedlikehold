import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Helsesjekk + keep-alive. Treffer Supabase REST slik at gratis-prosjektet ikke
 * pauses etter inaktivitet. Kalles av en Vercel Cron (se vercel.json).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'missing_env' }, { status: 500 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/equipment?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    return NextResponse.json({ ok: res.ok, status: res.status, ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
