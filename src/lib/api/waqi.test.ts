import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../../../api/waqi/feed.ts';

async function callHandler(url: string, method = 'GET') {
  const headers = new Map<string, string>();
  return new Promise<{ statusCode: number; headers: Map<string, string>; body: string }>(
    (resolve, reject) => {
      const req = {
        method,
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

test('rejects invalid coordinates before contacting WAQI', async () => {
  const result = await callHandler('/api/waqi/feed?lat=91&lon=77');
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).status, 'error');
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('reports missing server-side token as unconfigured', async () => {
  const previousToken = process.env.WAQI_TOKEN;
  delete process.env.WAQI_TOKEN;
  try {
    const result = await callHandler('/api/waqi/feed?lat=28.6&lon=77.2');
    assert.equal(result.statusCode, 503);
    assert.equal(JSON.parse(result.body).status, 'unconfigured');
  } finally {
    if (previousToken === undefined) delete process.env.WAQI_TOKEN;
    else process.env.WAQI_TOKEN = previousToken;
  }
});

test('forwards valid station responses without exposing or caching the token', async () => {
  const previousToken = process.env.WAQI_TOKEN;
  const previousFetch = globalThis.fetch;
  let upstreamUrl = '';
  process.env.WAQI_TOKEN = 'test-waqi-token';
  globalThis.fetch = async (input) => {
    upstreamUrl = String(input);
    return new Response(JSON.stringify({ status: 'ok', data: { aqi: 42 } }), { status: 200 });
  };

  try {
    const result = await callHandler('/api/waqi/feed?lat=28.6&lon=77.2');
    assert.equal(result.statusCode, 200);
    assert.equal(new URL(upstreamUrl).searchParams.get('token'), 'test-waqi-token');
    assert.equal(result.body.includes('test-waqi-token'), false);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(JSON.parse(result.body), { status: 'ok', data: { aqi: 42 } });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.WAQI_TOKEN;
    else process.env.WAQI_TOKEN = previousToken;
  }
});
