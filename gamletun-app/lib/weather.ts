// Værdata fra MET Norway (yr.no) Locationforecast 2.0.
// Gratis og uten nøkkel, men krever en identifiserende User-Agent med kontakt.
// KUN server-side.

const MET_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
// MET krever ekte app-navn + kontakt i User-Agent, ellers 403.
const USER_AGENT = 'Gamletun-Vedlikehold/1.0 (https://github.com/rgrodem/gamletun-vedlikehold)';

export interface DailyWeather {
  date: string;        // YYYY-MM-DD
  minTemp: number | null;
  maxTemp: number | null;
  precip: number;      // mm sum
  symbol: string;      // MET symbol_code (rundt midt på dagen)
}

interface MetTimeseriesEntry {
  time: string;
  data: {
    instant?: { details?: { air_temperature?: number } };
    next_6_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
  };
}

// Gårdens koordinater (default Sandnes-området). MET tillater maks 4 desimaler.
export function farmCoords(): { lat: number; lon: number } {
  const lat = parseFloat(process.env.FARM_LAT || '');
  const lon = parseFloat(process.env.FARM_LON || '');
  return {
    lat: !isNaN(lat) ? lat : 58.8524,
    lon: !isNaN(lon) ? lon : 5.7352,
  };
}

export async function getDailyForecast(days = 5): Promise<DailyWeather[]> {
  const { lat, lon } = farmCoords();
  const url = `${MET_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    // Reduserer kall mot MET (de ber om maks 1 per 10 min per koordinat).
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`MET-feil ${res.status}`);
  }

  const json = await res.json();
  const series: MetTimeseriesEntry[] = json?.properties?.timeseries || [];

  const byDay = new Map<string, { temps: number[]; precip: number; midday?: string }>();
  for (const entry of series) {
    const date = entry.time.slice(0, 10);
    const hour = Number(entry.time.slice(11, 13));
    const bucket = byDay.get(date) || { temps: [], precip: 0 };
    const temp = entry.data.instant?.details?.air_temperature;
    if (typeof temp === 'number') bucket.temps.push(temp);
    const precip = entry.data.next_6_hours?.details?.precipitation_amount;
    if (typeof precip === 'number') bucket.precip += precip;
    const symbol = entry.data.next_6_hours?.summary?.symbol_code;
    // Bruk symbolet nærmest midt på dagen som representativt.
    if (symbol && (hour >= 11 && hour <= 13 || !bucket.midday)) bucket.midday = symbol;
    byDay.set(date, bucket);
  }

  return Array.from(byDay.entries())
    .slice(0, days)
    .map(([date, b]) => ({
      date,
      minTemp: b.temps.length ? Math.round(Math.min(...b.temps)) : null,
      maxTemp: b.temps.length ? Math.round(Math.max(...b.temps)) : null,
      precip: Math.round(b.precip * 10) / 10,
      symbol: b.midday || 'cloudy',
    }));
}

// Grov MET symbol_code → emoji for enkel visning.
export function weatherEmoji(symbol: string): string {
  if (symbol.includes('thunder')) return '⛈️';
  if (symbol.includes('snow') || symbol.includes('sleet')) return '🌨️';
  if (symbol.includes('rain') || symbol.includes('showers')) return '🌧️';
  if (symbol.includes('fog')) return '🌫️';
  if (symbol.includes('clearsky') || symbol.includes('fair')) return '☀️';
  if (symbol.includes('partlycloudy')) return '⛅';
  return '☁️';
}
