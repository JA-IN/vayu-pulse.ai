import type { IncomingMessage, ServerResponse } from 'node:http';

export interface CpcbPollutantRecord {
  country: string;
  state: string;
  city: string;
  station: string;
  last_update: string;
  latitude: number;
  longitude: number;
  pollutant_id: string;
  min_value: number | null;
  max_value: number | null;
  avg_value: number | null;
}

interface DataGovResponse {
  records?: unknown[];
  total?: number;
  count?: number;
}

const API_URL = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
const CPCB_CACHE_TTL_MS = 30 * 60 * 1000;
const INDIA_STATES = new Set([
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]);

interface CpcbCacheEntry {
  records: CpcbPollutantRecord[];
  cachedAt: number;
}

const cpcbCache = new Map<string, CpcbCacheEntry>();
const cpcbRequestsInFlight = new Map<string, Promise<CpcbPollutantRecord[]>>();

function readString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readMeasurement(value: unknown): number | null {
  const text = readString(value);
  if (!text || text.toUpperCase() === 'NA') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRecord(value: unknown): CpcbPollutantRecord | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const latitude = readMeasurement(row.latitude);
  const longitude = readMeasurement(row.longitude);
  const pollutantId = readString(row.pollutant_id);
  const station = readString(row.station);
  if (latitude === null || longitude === null || !pollutantId || !station) return null;

  return {
    country: readString(row.country),
    state: readString(row.state),
    city: readString(row.city),
    station,
    last_update: readString(row.last_update),
    latitude,
    longitude,
    pollutant_id: pollutantId,
    min_value: readMeasurement(row.min_value ?? row.pollutant_min),
    max_value: readMeasurement(row.max_value ?? row.pollutant_max),
    avg_value: readMeasurement(row.avg_value ?? row.pollutant_avg),
  };
}

async function requestCpcbRecords(state: string, city: string, token: string): Promise<CpcbPollutantRecord[]> {
  const url = new URL(API_URL);
  url.searchParams.set('api-key', token);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1000');
  url.searchParams.set('filters[country]', 'India');
  url.searchParams.set('filters[state]', state);
  url.searchParams.set('filters[city]', city);

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  } catch (error) {
    const cause = error instanceof Error && 'cause' in error ? error.cause : undefined;
    const causeCode = cause && typeof cause === 'object' && 'code' in cause &&
      typeof cause.code === 'string'
      ? cause.code
      : undefined;
    console.error('[CPCB] Could not reach data.gov.in', {
      error: error instanceof Error ? error.message : 'Unknown fetch error',
      causeCode,
    });
    throw new Error('Could not connect to the CPCB data service. Check the Vercel function logs and try again later.');
  }

  if (response.status === 429) {
    throw new Error('CPCB data service rate limit reached. Please try again later.');
  }
  if (!response.ok) {
    throw new Error(`CPCB data request failed (HTTP ${response.status}).`);
  }

  let payload: DataGovResponse;
  try {
    payload = await response.json() as DataGovResponse;
  } catch {
    throw new Error('CPCB returned an invalid response.');
  }
  if (!Array.isArray(payload.records)) {
    throw new Error('CPCB response did not contain station records.');
  }

  return payload.records
    .map(normalizeRecord)
    .filter((record): record is CpcbPollutantRecord => record !== null);
}

export async function fetchCpcbRecords(state: string, city: string): Promise<CpcbPollutantRecord[]> {
  const token = process.env.DATA_GOV_IN_API_KEY;
  if (!token) {
    throw new Error('CPCB station data is not configured. Add DATA_GOV_IN_API_KEY to the deployment environment.');
  }
  if (!INDIA_STATES.has(state)) {
    throw new Error('CPCB station data requires a supported Indian state or territory.');
  }
  if (!city.trim() || city.length > 100) {
    throw new Error('A valid Indian city is required to request CPCB station data.');
  }

  const cacheKey = `${state.toLowerCase()}|${city.trim().toLowerCase()}`;
  const cached = cpcbCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CPCB_CACHE_TTL_MS) {
    return cached.records;
  }

  const inFlight = cpcbRequestsInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = requestCpcbRecords(state, city.trim(), token);
  cpcbRequestsInFlight.set(cacheKey, request);
  try {
    const records = await request;
    cpcbCache.set(cacheKey, { records, cachedAt: Date.now() });
    return records;
  } finally {
    cpcbRequestsInFlight.delete(cacheKey);
  }
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  cacheControl = 'no-store'
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.end(JSON.stringify(body));
}

interface CpcbRequest extends IncomingMessage {
  query?: Record<string, unknown>;
}

export default async function handler(req: CpcbRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  const state = readString(req.query?.state ?? url.searchParams.get('state'));
  const city = readString(req.query?.city ?? url.searchParams.get('city'));
  if (!state || !city) {
    sendJson(res, 400, { message: 'State and city are required for CPCB station data.' });
    return;
  }

  try {
    const records = await fetchCpcbRecords(state, city);
    sendJson(res, 200, { records }, 'public, max-age=0, s-maxage=1800, stale-while-revalidate=300');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CPCB station data is unavailable.';
    const statusCode = message.includes('not configured') ? 503
      : message.includes('supported Indian state') || message.includes('valid Indian city') ? 400
      : 502;
    sendJson(res, statusCode, { message });
  }
}
