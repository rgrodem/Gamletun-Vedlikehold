// Værvarsel for gården (MET Norway). Brukes av værwidgeten i planleggingen.
import { NextResponse } from 'next/server';
import { getDailyForecast } from '@/lib/weather';

export async function GET() {
  try {
    const forecast = await getDailyForecast(5);
    return NextResponse.json(
      { forecast },
      { headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' } }
    );
  } catch (err) {
    console.error('Værhenting feilet:', err);
    return NextResponse.json({ error: 'Kunne ikke hente værvarsel' }, { status: 502 });
  }
}
