/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Reading } from '../provenance.ts';
import { fetchWaqiStationData, WaqiStationData } from './waqi.ts';
import {
  calculateCigaretteEquivalence,
  calculateWhoMultiple,
  convertCoToMg,
  isDataStale,
  detectAnomalySpike,
  findSafeOutdoorWindow,
  calculateAqiTrend,
  SafeWindow,
} from '../aqi.ts';

export interface CityLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  admin1?: string;
}

export const PRESET_CITIES: CityLocation[] = [
  { name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, elevation: 216, admin1: 'Delhi' },
  { name: 'Mumbai', country: 'India', latitude: 19.076, longitude: 72.8777, elevation: 14, admin1: 'Maharashtra' },
  { name: 'Kolkata', country: 'India', latitude: 22.5726, longitude: 88.3639, elevation: 9, admin1: 'West Bengal' },
  { name: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946, elevation: 920, admin1: 'Karnataka' },
  { name: 'Chennai', country: 'India', latitude: 13.0827, longitude: 80.2707, elevation: 6, admin1: 'Tamil Nadu' },
  { name: 'Lahore', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, elevation: 217, admin1: 'Punjab' },
  { name: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, elevation: 12, admin1: 'Dhaka' },
  { name: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, elevation: 44, admin1: 'Beijing' },
  { name: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456, elevation: 8, admin1: 'Jakarta' },
  { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, elevation: 11, admin1: 'England' },
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, elevation: 35, admin1: 'Île-de-France' },
  { name: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, elevation: 10, admin1: 'Lagos' },
];

export interface HourlyPoint {
  time: string;
  pm2_5: number | null;
  pm10: number | null;
  us_aqi: number | null;
  isSpike?: boolean;
  zScore?: number;
}

export interface WindData {
  speed: number | null; // km/h
  direction: number | null; // degrees
  humidity: number | null; // %
  observedAt: string | null;
}

export interface AirQualityDataset {
  city: CityLocation;
  observedAt: string | null;
  isStale: boolean;
  source: string;
  stationData: WaqiStationData | null;
  stationError: string | null;
  current: {
    us_aqi: Reading<number>;
    pm2_5: Reading<number>;
    pm10: Reading<number>;
    nitrogen_dioxide: Reading<number>;
    sulphur_dioxide: Reading<number>;
    ozone: Reading<number>;
    carbon_monoxide: Reading<number>;
    cigaretteEquiv: Reading<number>;
    whoRatioPm25: Reading<number>;
    whoRatioPm10: Reading<number>;
  };
  wind: WindData;
  historicalHours: HourlyPoint[];
  forecastHours: HourlyPoint[];
  spikes: Array<{ time: string; aqi: number; zScore: number }>;
  safeWindow: SafeWindow;
  trend: {
    direction: 'improving' | 'deteriorating' | 'stable';
    slope: number;
    label: string;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ApiError extends Error {
  isRateLimited: boolean;
  retryAfterSeconds: number;

  constructor(message: string, isRateLimited = false, retryAfterSeconds = 60) {
    super(message);
    this.name = 'ApiError';
    this.isRateLimited = isRateLimited;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Fetch air quality data from Open-Meteo with caching and error handling
 */
export async function fetchAirQualityData(
  city: CityLocation,
  forceRefresh = false
): Promise<AirQualityDataset> {
  const cacheKey = `aqi_${city.latitude.toFixed(3)}_${city.longitude.toFixed(3)}`;
  const now = Date.now();
  const stationRequest = fetchWaqiStationData(city.latitude, city.longitude).then(
    (stationData) => ({ stationData, stationError: null }),
    (error: unknown) => ({
      stationData: null,
      stationError: error instanceof Error ? error.message : 'WAQI station data is unavailable.',
    })
  );
  const withStationReading = (
    modelDataset: AirQualityDataset,
    result: Awaited<typeof stationRequest>
  ): AirQualityDataset => ({
    ...modelDataset,
    observedAt: result.stationData?.observedAt ?? modelDataset.observedAt,
    isStale: result.stationData?.aqi.stale ?? modelDataset.isStale,
    source: result.stationData
      ? `${result.stationData.aqi.source}; pollutants and history from Open-Meteo CAMS`
      : modelDataset.source,
    stationData: result.stationData,
    stationError: result.stationError,
    current: {
      ...modelDataset.current,
      us_aqi: result.stationData?.aqi ?? modelDataset.current.us_aqi,
    },
  });

  if (!forceRefresh) {
    const cached = cache.get(cacheKey) as CacheEntry<AirQualityDataset> | undefined;
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return withStationReading(cached.data, await stationRequest);
    }
  }

  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.latitude}&longitude=${city.longitude}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide&hourly=pm2_5,pm10,us_aqi&past_days=30&forecast_days=3&timezone=auto`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=wind_speed_10m,wind_direction_10m,relative_humidity_2m&timezone=auto`;

  let aqiRes: Response;
  let weatherRes: Response;

  try {
    [aqiRes, weatherRes] = await Promise.all([
      fetch(aqiUrl),
      fetch(weatherUrl).catch(() => new Response('{}', { status: 200 })),
    ]);
  } catch {
    throw new ApiError('Network connection failed. The open meteorological service could not be reached.');
  }

  if (aqiRes.status === 429) {
    throw new ApiError('Open-Meteo rate limit exceeded. Please wait 60 seconds.', true, 60);
  }

  if (!aqiRes.ok) {
    throw new ApiError(`Air quality data unavailable (HTTP ${aqiRes.status}).`);
  }

  const aqiJson = await aqiRes.json();
  const weatherJson = await weatherRes.json().catch(() => ({}));

  if (!aqiJson || !aqiJson.current) {
    throw new ApiError('Incomplete or missing air quality readings returned by the provider.');
  }

  const observedAt: string | null = aqiJson.current.time || null;
  const isStale = isDataStale(observedAt);
  const sourceName = 'Open-Meteo (CAMS / Copernicus)';

  // Process current pollutant readings
  const rawAqi = typeof aqiJson.current.us_aqi === 'number' ? Math.round(aqiJson.current.us_aqi) : null;
  const rawPm25 = typeof aqiJson.current.pm2_5 === 'number' ? Math.round(aqiJson.current.pm2_5 * 10) / 10 : null;
  const rawPm10 = typeof aqiJson.current.pm10 === 'number' ? Math.round(aqiJson.current.pm10 * 10) / 10 : null;
  const rawNo2 = typeof aqiJson.current.nitrogen_dioxide === 'number' ? Math.round(aqiJson.current.nitrogen_dioxide * 10) / 10 : null;
  const rawSo2 = typeof aqiJson.current.sulphur_dioxide === 'number' ? Math.round(aqiJson.current.sulphur_dioxide * 10) / 10 : null;
  const rawO3 = typeof aqiJson.current.ozone === 'number' ? Math.round(aqiJson.current.ozone * 10) / 10 : null;
  const rawCoUg = typeof aqiJson.current.carbon_monoxide === 'number' ? aqiJson.current.carbon_monoxide : null;
  const coMg = convertCoToMg(rawCoUg);

  // Derived metrics
  const cigCount = calculateCigaretteEquivalence(rawPm25);
  const whoPm25 = calculateWhoMultiple('pm2_5', rawPm25);
  const whoPm10 = calculateWhoMultiple('pm10', rawPm10);

  // Parse Hourly past vs forecast
  const hourlyTimes: string[] = aqiJson.hourly?.time || [];
  const hourlyPm25: Array<number | null> = aqiJson.hourly?.pm2_5 || [];
  const hourlyPm10: Array<number | null> = aqiJson.hourly?.pm10 || [];
  const hourlyAqiVals: Array<number | null> = aqiJson.hourly?.us_aqi || [];

  const historicalHours: HourlyPoint[] = [];
  const forecastHours: HourlyPoint[] = [];

  const observedTimeMs = observedAt ? new Date(observedAt).getTime() : now;

  // Extract baseline for trailing 7-day anomaly detection
  const pastAqiBaseline: number[] = [];

  for (let i = 0; i < hourlyTimes.length; i++) {
    const t = hourlyTimes[i];
    const pointTimeMs = new Date(t).getTime();
    const point: HourlyPoint = {
      time: t,
      pm2_5: hourlyPm25[i] ?? null,
      pm10: hourlyPm10[i] ?? null,
      us_aqi: hourlyAqiVals[i] ?? null,
    };

    if (pointTimeMs <= observedTimeMs) {
      historicalHours.push(point);
      if (point.us_aqi !== null) {
        pastAqiBaseline.push(point.us_aqi);
      }
    } else {
      forecastHours.push(point);
    }
  }

  // Detect spikes across historical points using trailing 7-day window
  const detectedSpikes: Array<{ time: string; aqi: number; zScore: number }> = [];
  for (let i = 0; i < historicalHours.length; i++) {
    const pt = historicalHours[i];
    if (pt.us_aqi !== null && i >= 24) {
      const windowSlice = pastAqiBaseline.slice(Math.max(0, i - 168), i);
      const anomaly = detectAnomalySpike(pt.us_aqi, windowSlice);
      if (anomaly.isSpike) {
        pt.isSpike = true;
        pt.zScore = anomaly.zScore;
        detectedSpikes.push({
          time: pt.time,
          aqi: pt.us_aqi,
          zScore: anomaly.zScore,
        });
      }
    }
  }

  // Safe window calculation on forecast
  const forecastAqiPoints = forecastHours.map((h) => ({ time: h.time, aqi: h.us_aqi }));
  const safeWindow = findSafeOutdoorWindow(forecastAqiPoints, 150);

  // Trend from recent 12 hours
  const recentHistorical = historicalHours.slice(-12).map((h) => h.us_aqi).filter((v): v is number => v !== null);
  const trend = calculateAqiTrend(recentHistorical);

  // Weather / Wind parse
  const wind: WindData = {
    speed: typeof weatherJson.current?.wind_speed_10m === 'number' ? weatherJson.current.wind_speed_10m : null,
    direction: typeof weatherJson.current?.wind_direction_10m === 'number' ? weatherJson.current.wind_direction_10m : null,
    humidity: typeof weatherJson.current?.relative_humidity_2m === 'number' ? weatherJson.current.relative_humidity_2m : null,
    observedAt: weatherJson.current?.time || observedAt,
  };

  const dataset: AirQualityDataset = {
    city,
    observedAt,
    isStale,
    source: sourceName,
    stationData: null,
    stationError: null,
    current: {
      us_aqi: {
        value: rawAqi,
        unit: 'AQI',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      pm2_5: {
        value: rawPm25,
        unit: 'µg/m³',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      pm10: {
        value: rawPm10,
        unit: 'µg/m³',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      nitrogen_dioxide: {
        value: rawNo2,
        unit: 'µg/m³',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      sulphur_dioxide: {
        value: rawSo2,
        unit: 'µg/m³',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      ozone: {
        value: rawO3,
        unit: 'µg/m³',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      carbon_monoxide: {
        value: coMg,
        unit: 'mg/m³',
        kind: 'modeled',
        source: sourceName,
        observedAt,
        stale: isStale,
      },
      cigaretteEquiv: {
        value: cigCount,
        unit: 'cigs/day',
        kind: 'derived',
        source: 'Berkeley Earth passive-smoking estimate (PM2.5 ÷ 22)',
        observedAt,
      },
      whoRatioPm25: {
        value: whoPm25,
        unit: 'x WHO cap',
        kind: 'derived',
        source: 'WHO 2021 Guideline (15 µg/m³)',
        observedAt,
      },
      whoRatioPm10: {
        value: whoPm10,
        unit: 'x WHO cap',
        kind: 'derived',
        source: 'WHO 2021 Guideline (45 µg/m³)',
        observedAt,
      },
    },
    wind,
    historicalHours,
    forecastHours,
    spikes: detectedSpikes.slice(-5), // last 5 spikes
    safeWindow,
    trend,
  };

  cache.set(cacheKey, { data: dataset, timestamp: now });
  return withStationReading(dataset, await stationRequest);
}

/**
 * Search city coordinates using Open-Meteo Geocoding
 */
export async function searchCities(query: string): Promise<CityLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new ApiError(`City search failed (HTTP ${res.status}).`);
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    return data.results.map((r: { name: string; country: string; latitude: number; longitude: number; elevation?: number; admin1?: string }) => ({
      name: r.name,
      country: r.country || '',
      latitude: r.latitude,
      longitude: r.longitude,
      elevation: r.elevation,
      admin1: r.admin1,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network connection failed. City search could not be reached.');
  }
}
