import { useState, useEffect } from 'react';
import { cacheIsFresh, fetchWeather, readCachedWeather } from './weather';
import type { WeatherData } from './weather';

const CONDITION_MESSAGES = {
  stale: 'Outdated forecast — verify current conditions',
  safe: 'Favorable',
  hazardous: 'Unfavorable',
};

export function Widget() {
  const [cached] = useState(readCachedWeather);
  const [weather, setWeather] = useState<WeatherData | null>(cached?.report ?? null);
  const [error, setError] = useState(false);
  const [stale, setStale] = useState(cached ? !cacheIsFresh(cached) : false);

  useEffect(() => {
    const controller = new AbortController();
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
  }, [cached]);

  if (!weather && error) return <p role="status">-- Forecast generator temporarily unavailable. Please consult the linked official forecasts. --</p>;
  if (!weather) return <p role="status">-- Evaluating conditions --</p>;

  const condition: keyof typeof CONDITION_MESSAGES =
    stale ? 'stale' : weather.forecast.safe ? 'safe' : 'hazardous';

  return (
    <div className='weather-widget-container'>
      {(stale || error) && <p role="alert" className='weather-widget-p-alert'>
        Forecast generation failed or cached data expired.
      </p>}
      <div className={`weather-widget-container-inside weather-widget-container-inside--${condition}`}>
        Conditions Over Next 48 Hours:{' '}
        <span className='weather-widget-condition'>{CONDITION_MESSAGES[condition]}</span>
        <ul>
          {weather.forecast.reasons.slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}
        </ul>
      </div>
      <p className='weather-widget-p'>
      Generated {new Date(weather.meta.generated_at).toLocaleString()} from Deutscher Wetterdienst data. Not an official safety assessment.
      </p>
    </div>
  );
}
