/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Reading } from '../provenance.ts';
import { isDataStale } from '../aqi.ts';

interface WaqiApiResponse {
  status?: string;
  data?: {
    aqi?: number | string;
    idx?: number;
    city?: {
      name?: string;
      geo?: [number, number];
    };
    dominentpol?: string;
    time?: {
      iso?: string;
      s?: string;
    };
    attributions?: Array<{ name?: string; url?: string }>;
  };
}

export interface WaqiStationData {
  aqi: Reading<number>;
  stationName: string | null;
  stationId: number | null;
  coordinates: [number, number];
  dominantPollutant: string | null;
  observedAt: string | null;
  attributions: string[];
}

const inFlightRequests = new Map<string, Promise<WaqiStationData | null>>();

/**
 * Fetch a nearby WAQI station through the same-origin deployment function.
 * Responses are deduplicated only while in flight; no WAQI response is cached.
 */
export async function fetchWaqiStationData(
  lat: number,
  lon: number
): Promise<WaqiStationData | null> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const existingRequest = inFlightRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = fetch(`/api/waqi/feed?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
    .then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(error?.message || `WAQI station request failed (HTTP ${res.status}).`);
      }

      const response = await res.json() as WaqiApiResponse;
      if (response.status === 'not_found') return null;
      if (response.status !== 'ok' || !response.data) {
        throw new Error('WAQI returned an invalid station response.');
      }

      const d = response.data;
      const parsedAqi = typeof d.aqi === 'number'
        ? d.aqi
        : typeof d.aqi === 'string' && d.aqi.trim()
          ? Number(d.aqi)
          : NaN;
      const value = Number.isFinite(parsedAqi) ? Math.round(parsedAqi) : null;
      if (value === null) return null;

      const observedAt = d.time?.iso || d.time?.s || null;
      const stale = isDataStale(observedAt);
      const stationName = d.city?.name ?? null;
      const attributions = d.attributions?.map((attribution) =>
        attribution.name || attribution.url || ''
      ).filter(Boolean) ?? [];
      return {
        aqi: {
          value,
          unit: 'AQI',
          kind: 'station' as const,
          source: `WAQI Ground Station${stationName ? ` (${stationName})` : ''}${
            attributions.length ? `; attribution: ${attributions.join(', ')}` : ''
          }`,
          observedAt,
          stale,
        },
        stationName,
        stationId: typeof d.idx === 'number' ? d.idx : null,
        coordinates: d.city?.geo ?? [lat, lon],
        dominantPollutant: d.dominentpol ?? null,
        observedAt,
        attributions,
      };
    });

  inFlightRequests.set(key, request);
  try {
    return await request;
  } finally {
    inFlightRequests.delete(key);
  }
}
