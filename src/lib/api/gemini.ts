/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LiveContextPayload {
  city: string;
  country: string;
  coordinates: { lat: number; lon: number };
  aqi: number | null;
  category: string;
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  co: number | null;
  cigaretteEquiv: number | null;
  whoPm25Multiple: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  humidity: number | null;
  observedAt: string | null;
  isStale: boolean;
  source: string;
  forecastSummary: string | null;
  safeWindow: string | null;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sourceCitation?: string;
}

/**
 * Ask VayuAI Copilot via server-side endpoint
 */
export async function askVayuCopilot(
  message: string,
  liveContext: LiveContextPayload,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = []
): Promise<string> {
  const res = await fetch('/api/gemini/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      liveContext,
      history,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `AI Copilot service error (${res.status})`);
  }

  const data = await res.json();
  return data.text || 'Atmospheric analysis unavailable.';
}

/**
 * Generate 3-bullet executive AI Insights summary based on live telemetry
 */
export async function fetchAiInsights(liveContext: LiveContextPayload): Promise<string[]> {
  const res = await fetch('/api/gemini/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ liveContext }),
  });

  if (!res.ok) {
    throw new Error('AI Insights unavailable.');
  }

  const data = await res.json();
  return Array.isArray(data.bullets) && data.bullets.length > 0
    ? data.bullets
    : [
        `Current reported AQI is ${liveContext.aqi ?? 'unavailable'} (${liveContext.category}); PM2.5 is ${liveContext.pm2_5 ?? 'unavailable'} µg/m³. Source: ${liveContext.source}.`,
        liveContext.cigaretteEquiv === null
          ? 'PM2.5 is unavailable, so a cigarette-equivalent estimate cannot be calculated.'
          : `PM2.5 corresponds to an estimated ${liveContext.cigaretteEquiv} cigarette-equivalents/day (Berkeley Earth method).`,
        liveContext.safeWindow
          ? `Forecast result: ${liveContext.safeWindow}.`
          : 'No forecast ventilation window is available.',
      ];
}
