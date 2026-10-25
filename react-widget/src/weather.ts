/** Browser counterpart to weather_analyze.pl. No server or scheduled workflow required. */
interface Forecast { safe: boolean; reasons: string[] }
export interface WeatherData {
  meta: { generated_at: string; source: string };
  forecast: Forecast;
}
export interface CachedWeather { savedAt: number; report: WeatherData }

export const CACHE_TTL_MS = 1 * 60 * 60 * 1000; /* 1 hour */
const CACHE_KEY = '2962m-weather-v2';
const RISK_RULES = [
  { field: 'visibility', isRisk: (value: number) => value < 2000, reason: 'Low Visibility' },
  { field: 'apparent_temperature', isRisk: (value: number) => value < -5, reason: 'Freezing Windchill' },
  { field: 'wind_speed_10m', isRisk: (value: number) => value > 30, reason: 'Hazardous Windspeed' },
  { field: 'snowfall', isRisk: (value: number) => value > 1, reason: 'Snowfall' },
  { field: 'snow_depth', isRisk: (value: number) => value > 0.05, reason: 'Snow Accumulation' },
  { field: 'cloud_cover_low', isRisk: (value: number) => value > 20, reason: 'Cloudy below 3000m ASL' },
  { field: 'cloud_cover_mid', isRisk: (value: number) => value > 50, reason: 'Cloudy between 3000-8000m ASL' },
  { field: 'precipitation', isRisk: (value: number) => value > 1, reason: 'Precipitation' },
  { field: 'wind_gusts_10m', isRisk: (value: number) => value > 40, reason: 'Hazardous Wind Gusts' },
] as const;
type Field = typeof RISK_RULES[number]['field'];
type Hourly = { time: string[] } & Record<Field, Array<number | null>>;

const API_URL = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
  latitude: '47.42', longitude: '10.98', elevation: '2962',
  hourly: RISK_RULES.map(rule => rule.field).join(','),
  forecast_days: '2', wind_speed_unit: 'mph', timezone: 'UTC',
}).toString();

function isHourly(value: unknown): value is Hourly {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const times = v.time;

  return (
    Array.isArray(times) &&
    times.length >= 48 &&
    RISK_RULES.every(
      ({ field }) => Array.isArray(v[field]) && (v[field] as unknown[]).length >= times.length
    )
  );
}

function valid(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Evaluates the 48-hour window beginning at the current UTC hour. */
export function analyzeForecast(hourly: Hourly, now = new Date()): WeatherData {
  const firstHour = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours());
  const riskReasons = new Set<string>();
  let counted = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    const timestamp = Date.parse(hourly.time[i] + 'Z'); // timezone=UTC gives timezone-less ISO hours
    if (!Number.isFinite(timestamp)) continue;
    const offset = Math.round((timestamp - firstHour) / 3600000);
    if (offset < 0 || offset >= 48) continue;
    counted++;
    for (const { field, isRisk, reason } of RISK_RULES) {
      const value = hourly[field][i];
      if (!valid(value)) throw new Error('Forecast contains missing hourly measurements');
      if (isRisk(value)) riskReasons.add(reason);
    }
  }
  if (counted !== 48) throw new Error('Forecast does not contain a complete 48-hour window');
  return {
    meta: { generated_at: now.toISOString(), source: 'Open-Meteo forecast API' },
    forecast: {
      safe: riskReasons.size === 0,
      reasons: riskReasons.size ? [...riskReasons] : ['No risk conditions noted.'],
    },
  };
}

export function readCachedWeather(): CachedWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const c = value as CachedWeather;
    if (typeof c.savedAt !== 'number' || !Number.isFinite(c.savedAt) || c.savedAt > Date.now() ||
        !c.report?.meta?.generated_at || typeof c.report?.forecast?.safe !== 'boolean' ||
        !Array.isArray(c.report.forecast.reasons)) return null;
    return c;
  } catch { return null; } // private browsing / disabled storage
}

export function cacheIsFresh(cached: CachedWeather): boolean {
  return Date.now() - cached.savedAt < CACHE_TTL_MS;
}

export async function fetchWeather(signal?: AbortSignal): Promise<WeatherData> {
  const response = await fetch(API_URL, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Open-Meteo returned incomplete forecast data');
  }
  const hourly = (payload as { hourly?: unknown }).hourly;
  if (!isHourly(hourly)) throw new Error('Open-Meteo returned incomplete forecast data');
  console.log('Open-Meteo fetched weather data:', hourly);
  const report = analyzeForecast(hourly);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), report })); }
  catch { /* Still show forecast if localStorage is blocked */ }
  return report;
}
