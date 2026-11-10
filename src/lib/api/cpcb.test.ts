import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../../../api/cpcb/air-quality.ts';
import { calculateHourlyPmEstimate } from './cpcb.ts';

test('calculates the illustrative PM sub-indices for the live Delhi example', () => {
  const estimate = calculateHourlyPmEstimate([
    { id: 'PM2.5', average: 356 },
    { id: 'PM10', average: 210 },
  ]);
  assert.deepEqual(estimate, {
    value: 443,
    dominantPollutant: 'PM2.5',
    pm25SubIndex: 443,
    pm10SubIndex: 174,
  });
});

test('returns no hourly PM estimate when neither particulate reading is available', () => {
  assert.equal(calculateHourlyPmEstimate([
    { id: 'NO2', average: 50 },
    { id: 'PM2.5', average: null },
    { id: 'PM10', average: null },
  ]), null);
});

async function callHandler(url: string) {
  const headers = new Map<string, string>();
  return new Promise<{ statusCode: number; headers: Map<string, string>; body: string }>(
    (resolve, reject) => {
      const req = {
        method: 'GET',
        url,
        headers: { host: 'localhost' },
      } as unknown as IncomingMessage;
      const res = {
        statusCode: 200,
        setHeader: (name: string, value: string | number) => headers.set(name.toLowerCase(), String(value)),
        end: (body?: string) => resolve({
          statusCode: res.statusCode,
          headers,
          body: body ?? '',
        }),
      } as unknown as ServerResponse;
      handler(req, res).catch(reject);
    }
  );
}

test('requires a city and state before making a CPCB request', async () => {
  const result = await callHandler('/api/cpcb/air-quality?state=Delhi');
  assert.equal(result.statusCode, 400);
  assert.match(JSON.parse(result.body).message, /State and city are required/);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('reports missing server-side data.gov.in key', async () => {
  const previousKey = process.env.DATA_GOV_IN_API_KEY;
  delete process.env.DATA_GOV_IN_API_KEY;
  try {
    const result = await callHandler('/api/cpcb/air-quality?state=Delhi&city=Delhi');
    assert.equal(result.statusCode, 503);
    assert.match(JSON.parse(result.body).message, /not configured/);
  } finally {
    if (previousKey === undefined) delete process.env.DATA_GOV_IN_API_KEY;
    else process.env.DATA_GOV_IN_API_KEY = previousKey;
  }
});

test('reports upstream connection failures without exposing secrets', async () => {
  const previousKey = process.env.DATA_GOV_IN_API_KEY;
  const previousFetch = globalThis.fetch;
  const previousConsoleError = console.error;
  const logArgs: unknown[][] = [];
  process.env.DATA_GOV_IN_API_KEY = 'test-data-key';
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ENETUNREACH' } });
  };
  console.error = (...args: unknown[]) => logArgs.push(args);

  try {
    const result = await callHandler('/api/cpcb/air-quality?state=Delhi&city=Networkville');
    assert.equal(result.statusCode, 502);
    assert.match(JSON.parse(result.body).message, /Could not connect to the CPCB data service/);
    assert.match(JSON.stringify(logArgs), /ENETUNREACH/);
    assert.equal(JSON.stringify(logArgs).includes('test-data-key'), false);
  } finally {
    globalThis.fetch = previousFetch;
    console.error = previousConsoleError;
    if (previousKey === undefined) delete process.env.DATA_GOV_IN_API_KEY;
    else process.env.DATA_GOV_IN_API_KEY = previousKey;
  }
});

test('normalizes and caches CPCB records for 30 minutes without exposing the API key', async () => {
  const previousKey = process.env.DATA_GOV_IN_API_KEY;
  const previousFetch = globalThis.fetch;
  let upstreamUrl = '';
  let upstreamRequests = 0;
  process.env.DATA_GOV_IN_API_KEY = 'test-data-key';
  globalThis.fetch = async (input) => {
    upstreamRequests += 1;
    upstreamUrl = String(input);
    return new Response(JSON.stringify({
      records: [{
        country: 'India',
        state: 'Delhi',
        city: 'Delhi',
        station: 'Test station',
        last_update: '10-11-2026 19:00:00',
        latitude: '28.6',
        longitude: '77.2',
        pollutant_id: 'PM2.5',
        min_value: '10',
        max_value: '50',
        avg_value: 'NA',
      }],
    }), { status: 200 });
  };

  try {
    const result = await callHandler('/api/cpcb/air-quality?state=Delhi&city=Cacheville');
    assert.equal(result.statusCode, 200);
    const url = new URL(upstreamUrl);
    assert.equal(url.searchParams.get('api-key'), 'test-data-key');
    assert.equal(url.searchParams.get('filters[state]'), 'Delhi');
    assert.equal(url.searchParams.get('filters[city]'), 'Cacheville');
    assert.equal(result.headers.get('cache-control'), 'public, max-age=0, s-maxage=1800, stale-while-revalidate=300');
    assert.equal(result.body.includes('test-data-key'), false);
    assert.deepEqual(JSON.parse(result.body), {
      records: [{
        country: 'India',
        state: 'Delhi',
        city: 'Delhi',
        station: 'Test station',
        last_update: '10-11-2026 19:00:00',
        latitude: 28.6,
        longitude: 77.2,
        pollutant_id: 'PM2.5',
        min_value: 10,
        max_value: 50,
        avg_value: null,
      }],
    });
    const cachedResult = await callHandler('/api/cpcb/air-quality?state=Delhi&city=Cacheville');
    assert.equal(cachedResult.statusCode, 200);
    assert.equal(upstreamRequests, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.DATA_GOV_IN_API_KEY;
    else process.env.DATA_GOV_IN_API_KEY = previousKey;
  }
});
