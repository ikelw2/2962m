import { useState, useEffect } from 'react';
import { cacheIsFresh, fetchWeather, readCachedWeather } from './weather';
import type { PeriodData, WeatherData } from './weather';

export function Widget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCachedWeather();
    if (cached) {
      setWeather(cached.report);
      setStale(!cacheIsFresh(cached));
    }
    if (cached && cacheIsFresh(cached)) return () => controller.abort();

    fetchWeather(controller.signal)
      .then(report => {
        if (!controller.signal.aborted) {
          setWeather(report);
          setStale(false);
          setError(false);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          console.error('Weather forecast unavailable:', err);
          setError(true);
        }
      });
    return () => controller.abort();
  }, []);

  if (!weather && error) return <p role="status">-- Weather forecast temporarily unavailable. Please consult the linked official forecasts. --</p>;
  if (!weather) return <p role="status">-- Evaluating conditions via weather models --</p>;

  const renderWindow = (title: string, period: PeriodData) => (
    <div style={{ padding: '8px', borderRadius: '8px', margin: '8px 0', border: '3px dashed #262626', backgroundColor: stale ? '#fff3cd' : period.safe ? '#e6f4ea' : '#fce8e6' }}>
      <strong>{title}:</strong>{' '}
      <span style={{ color: stale ? '#664d03' : period.safe ? '#137333' : '#c5221f' }}>
        {stale ? 'Outdated forecast — verify current conditions' : period.safe ? 'No flagged conditions' : 'Potentially hazardous conditions'}
      </span>
      <ul style={{ margin: 0, padding: '0 0 0 20px', lineHeight: 'normal', whiteSpace: 'normal' }}>
        {period.reasons.slice(0, 3).map((reason, i) => <li key={`${reason}-${i}`} style={{ margin: 0, padding: 0 }}>{reason}</li>)}
      </ul>
    </div>
  );









  
  return (
    <div style={{ fontFamily: 'sans-serif', marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
      <h4 style={{ margin: '0 0 4px 0' }}>Automated Weather Forecast</h4>
      <p style={{ color: '#666', margin: 0 }}>
        Source: Open-Meteo forecast API · Checked {new Date(weather.meta.generated_at).toLocaleString()}
      </p>
      {(stale || error) && <p role="alert" style={{ color: '#8a4b00', fontWeight: 600 }}>
        Forecast refresh failed or cached data expired. Do not rely on these conditions for a hiking decision.
      </p>}
      {renderWindow('Next 24 Hours', weather.next_24h)}
      {renderWindow('Hours 24–48', weather.next_48h)}
      <p style={{ fontSize: '0.85em', color: '#666' }}>Automated screening only; not an official mountain safety assessment. Check current forecasts, warnings, and trail conditions before hiking.</p>
    </div>
  );
}
