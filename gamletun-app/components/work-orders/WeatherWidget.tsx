'use client';

import { useEffect, useState } from 'react';

interface DailyWeather {
  date: string;
  minTemp: number | null;
  maxTemp: number | null;
  precip: number;
  symbol: string;
}

function emoji(symbol: string): string {
  if (symbol.includes('thunder')) return '⛈️';
  if (symbol.includes('snow') || symbol.includes('sleet')) return '🌨️';
  if (symbol.includes('rain') || symbol.includes('showers')) return '🌧️';
  if (symbol.includes('fog')) return '🌫️';
  if (symbol.includes('clearsky') || symbol.includes('fair')) return '☀️';
  if (symbol.includes('partlycloudy')) return '⛅';
  return '☁️';
}

function dayLabel(date: string): string {
  const d = new Date(date + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return d.toLocaleDateString('nb-NO', { weekday: 'short' });
}

/**
 * Liten værstripe for gården (MET/yr.no), til hjelp i planlegging av
 * utendørs vedlikehold. Feiler stille — viser ingenting hvis været ikke kan hentes.
 */
export default function WeatherWidget() {
  const [forecast, setForecast] = useState<DailyWeather[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/weather')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setForecast(d.forecast || []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed || (forecast && forecast.length === 0)) return null;

  return (
    <div className="bg-paper border border-line rounded-[16px] px-3.5 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
          Vær · planlegging
        </span>
        <span className="text-[11px] text-ink3">yr.no</span>
      </div>
      {!forecast ? (
        <div className="h-12 animate-pulse bg-line/50 rounded-lg" />
      ) : (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {forecast.map((d) => (
            <div
              key={d.date}
              className="flex-shrink-0 text-center min-w-[58px] rounded-[12px] bg-bg border border-line px-2 py-2"
            >
              <div className="text-[11px] text-ink3 font-medium">{dayLabel(d.date)}</div>
              <div className="text-[20px] leading-tight my-0.5">{emoji(d.symbol)}</div>
              <div className="text-[12px] text-ink font-semibold">
                {d.maxTemp ?? '–'}°{d.minTemp != null && <span className="text-ink3 font-normal">/{d.minTemp}°</span>}
              </div>
              {d.precip > 0 && <div className="text-[10.5px] text-sky">{d.precip} mm</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
