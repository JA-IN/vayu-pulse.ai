import type { CityLocation } from './openMeteo.ts';
import type { CpcbPollutantRecord } from '../../../api/cpcb/air-quality.ts';

export interface CpcbPollutantReading {
  id: string;
  min: number | null;
  max: number | null;
  average: number | null;
  observedAt: string | null;
  rawTimestamp: string;
}

export interface CpcbHourlyPmEstimate {
  value: number;
  dominantPollutant: 'PM2.5' | 'PM10';
  pm25SubIndex: number | null;
  pm10SubIndex: number | null;
}

export interface CpcbStationData {
  station: string;
  city: string;
  state: string;
  coordinates: [number, number];
  distanceKm: number;
  observedAt: string | null;
  pollutants: CpcbPollutantReading[];
  hourlyPmEstimate: CpcbHourlyPmEstimate | null;
}

const PM25_BREAKPOINTS = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 500, 401, 500],
] as const;

const PM10_BREAKPOINTS = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 600, 401, 500],
] as const;

const CITY_ALIASES: Record<string, string> = {
  'new delhi': 'Delhi',
};

function parseCpcbTimestamp(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 5,
    Number(minute) - 30,
    Number(second)
  );
  return new Date(timestamp).toISOString();
}

function distanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const deltaLat = radians(toLat - fromLat);
  const deltaLon = radians(toLon - fromLon);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizedNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function interpolateSubIndex(
  concentration: number | null,
  breakpoints: readonly (readonly [number, number, number, number])[]
): number | null {
  if (concentration === null || concentration < 0) return null;
  const band = breakpoints.find(([, concentrationHigh]) => concentration <= concentrationHigh);
  if (!band) return 500;
  const [concentrationLow, concentrationHigh, indexLow, indexHigh] = band;
  if (concentrationHigh === concentrationLow) return indexHigh;
  return Math.round(
    ((indexHigh - indexLow) / (concentrationHigh - concentrationLow)) *
      (concentration - concentrationLow) +
      indexLow
  );
}

export function calculateHourlyPmEstimate(
  pollutants: Pick<CpcbPollutantReading, 'id' | 'average'>[]
): CpcbHourlyPmEstimate | null {
  const pm25 = pollutants.find(({ id }) => id === 'PM2.5')?.average ?? null;
  const pm10 = pollutants.find(({ id }) => id === 'PM10')?.average ?? null;
  const pm25SubIndex = interpolateSubIndex(pm25, PM25_BREAKPOINTS);
  const pm10SubIndex = interpolateSubIndex(pm10, PM10_BREAKPOINTS);

  if (pm25SubIndex === null && pm10SubIndex === null) return null;
  if (pm25SubIndex === null) {
    if (pm10SubIndex === null) return null;
    return { value: pm10SubIndex, dominantPollutant: 'PM10', pm25SubIndex, pm10SubIndex };
  }
  if (pm10SubIndex === null || pm25SubIndex >= pm10SubIndex) {
    return {
      value: pm25SubIndex,
      dominantPollutant: 'PM2.5',
      pm25SubIndex,
      pm10SubIndex,
    };
  }
  return { value: pm10SubIndex, dominantPollutant: 'PM10', pm25SubIndex, pm10SubIndex };
}

function selectNearestStation(
  records: CpcbPollutantRecord[],
  city: CityLocation
): CpcbStationData | null {
  const stations = new Map<string, CpcbPollutantRecord[]>();
  for (const record of records) {
    const key = `${record.station}|${record.latitude}|${record.longitude}`;
    const stationRecords = stations.get(key) ?? [];
    stationRecords.push(record);
    stations.set(key, stationRecords);
  }

  const candidates = [...stations.values()]
    .map((stationRecords) => {
      const first = stationRecords[0];
      return {
        records: stationRecords,
        first,
        distance: distanceKm(city.latitude, city.longitude, first.latitude, first.longitude),
      };
    })
    .sort((a, b) => a.distance - b.distance);

  const nearest = candidates.find(({ records: stationRecords }) =>
    stationRecords.some((record) => normalizedNumber(record.avg_value) !== null)
  );
  if (!nearest) return null;

  const latestPerPollutant = new Map<string, CpcbPollutantRecord>();
  for (const record of nearest.records) {
    const existing = latestPerPollutant.get(record.pollutant_id);
    const time = parseCpcbTimestamp(record.last_update);
    const existingTime = existing ? parseCpcbTimestamp(existing.last_update) : null;
    if (!existing || (time && (!existingTime || time > existingTime))) {
      latestPerPollutant.set(record.pollutant_id, record);
    }
  }

  const pollutants = [...latestPerPollutant.values()]
    .map((record) => ({
      id: record.pollutant_id,
      min: normalizedNumber(record.min_value),
      max: normalizedNumber(record.max_value),
      average: normalizedNumber(record.avg_value),
      observedAt: parseCpcbTimestamp(record.last_update),
      rawTimestamp: record.last_update,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const timestamps = pollutants
    .map((pollutant) => pollutant.observedAt)
    .filter((timestamp): timestamp is string => timestamp !== null)
    .sort();

  return {
    station: nearest.first.station,
    city: nearest.first.city,
    state: nearest.first.state,
    coordinates: [nearest.first.latitude, nearest.first.longitude],
    distanceKm: nearest.distance,
    observedAt: timestamps.at(-1) ?? null,
    pollutants,
    hourlyPmEstimate: calculateHourlyPmEstimate(pollutants),
  };
}

export async function fetchCpcbStationData(city: CityLocation): Promise<CpcbStationData | null> {
  if (city.country.toLowerCase() !== 'india' || !city.admin1) return null;

  const cpcbCity = CITY_ALIASES[city.name.trim().toLowerCase()] ?? city.name.trim();
  const url = new URL('/api/cpcb/air-quality', window.location.origin);
  url.searchParams.set('state', city.admin1);
  url.searchParams.set('city', cpcbCity);

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(error?.message || `CPCB station request failed (HTTP ${response.status}).`);
  }

  const payload = await response.json() as { records?: CpcbPollutantRecord[] };
  if (!payload || !Array.isArray(payload.records)) {
    throw new Error('CPCB returned an invalid station response.');
  }
  return selectNearestStation(payload.records, city);
}
