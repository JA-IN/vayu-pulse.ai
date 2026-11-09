import type { IncomingMessage, ServerResponse } from 'node:http';

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { status: 'error', message: 'Method not allowed' });
    return;
  }

  const requestUrl = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  const latitude = Number(requestUrl.searchParams.get('lat'));
  const longitude = Number(requestUrl.searchParams.get('lon'));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    sendJson(res, 400, { status: 'error', message: 'Valid latitude and longitude are required' });
    return;
  }

  const token = process.env.WAQI_TOKEN;
  if (!token) {
    sendJson(res, 503, { status: 'unconfigured', message: 'WAQI is not configured' });
    return;
  }

  const waqiUrl = new URL(`https://api.waqi.info/feed/geo:${latitude};${longitude}/`);
  waqiUrl.searchParams.set('token', token);

  try {
    const response = await fetch(waqiUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      sendJson(res, 502, { status: 'error', message: `WAQI request failed (HTTP ${response.status})` });
      return;
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('status' in payload)) {
      sendJson(res, 502, { status: 'error', message: 'WAQI returned an invalid response' });
      return;
    }

    const result = payload as { status?: unknown; data?: unknown };
    if (result.status === 'ok' && result.data) {
      sendJson(res, 200, payload);
      return;
    }

    if (
      result.status === 'error' &&
      typeof result.data === 'string' &&
      /unknown station|no station/i.test(result.data)
    ) {
      sendJson(res, 200, { status: 'not_found', data: null });
      return;
    }

    sendJson(res, 502, { status: 'error', message: 'WAQI could not provide station data' });
  } catch {
    sendJson(res, 502, { status: 'error', message: 'WAQI could not be reached' });
  }
}
