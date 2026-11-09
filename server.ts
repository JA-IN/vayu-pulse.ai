/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google Gemini SDK if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(apiKey),
    hasWaqiToken: Boolean(process.env.WAQI_TOKEN),
  });
});

// WAQI feed endpoint (secures WAQI_TOKEN on the same host as the frontend)
app.get('/api/waqi/feed', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const token = process.env.WAQI_TOKEN;
  if (!token) {
    return res.status(503).json({ status: 'unconfigured', message: 'WAQI is not configured' });
  }

  const { lat, lon } = req.query;
  const latitude = typeof lat === 'string' ? Number(lat) : NaN;
  const longitude = typeof lon === 'string' ? Number(lon) : NaN;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({ status: 'error', message: 'Valid latitude and longitude are required' });
  }

  try {
    const waqiUrl = new URL(`https://api.waqi.info/feed/geo:${latitude};${longitude}/`);
    waqiUrl.searchParams.set('token', token);
    const response = await fetch(waqiUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return res.status(502).json({ status: 'error', message: `WAQI request failed (HTTP ${response.status})` });
    }
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('status' in payload)) {
      return res.status(502).json({ status: 'error', message: 'WAQI returned an invalid response' });
    }

    const result = payload as { status?: unknown; data?: unknown };
    if (result.status === 'ok' && result.data) return res.json(payload);
    if (
      result.status === 'error' &&
      typeof result.data === 'string' &&
      /unknown station|no station/i.test(result.data)
    ) {
      return res.status(200).json({ status: 'not_found', data: null });
    }
    return res.status(502).json({ status: 'error', message: 'WAQI could not provide station data' });
  } catch {
    return res.status(502).json({ status: 'error', message: 'WAQI could not be reached' });
  }
});

// Fallback guidance uses only values actually present in the request context.
function generateTelemetryFallback(_message: string, liveContext: any): string {
  const city = liveContext?.city || 'the selected location';
  const aqi = typeof liveContext?.aqi === 'number' ? liveContext.aqi : null;
  const source = liveContext?.source || 'Open-Meteo CAMS model';
  if (aqi === null) {
    return `Current AQI data for ${city} is unavailable. No location-specific exposure advice can be based on a missing reading. Data source: ${source}.`;
  }

  const category = liveContext?.category || 'category unavailable';
  const pm25 = typeof liveContext?.pm2_5 === 'number' ? `${liveContext.pm2_5} µg/m³` : 'unavailable';
  const aqiAdvice = aqi <= 50
    ? 'The reported AQI falls in the Good range.'
    : aqi <= 100
      ? 'The reported AQI falls in the Moderate range; unusually sensitive people may wish to reduce prolonged exertion.'
      : aqi <= 150
        ? 'The reported AQI is in the Unhealthy for Sensitive Groups range; sensitive groups should limit prolonged outdoor exertion.'
        : 'The reported AQI is in an Unhealthy-or-higher range; consider reducing strenuous outdoor exertion and follow local health guidance.';
  const safeWindow = typeof liveContext?.safeWindow === 'string' ? ` Forecast: ${liveContext.safeWindow}` : '';

  return `In ${city}, the reported AQI is ${aqi} (${category}); PM2.5: ${pm25}. ${aqiAdvice}${safeWindow} Data source: ${source}.`;
}

function generateInsightFallback(liveContext: any): string[] {
  const city = liveContext?.city || 'Selected location';
  const aqi = typeof liveContext?.aqi === 'number' ? liveContext.aqi : null;
  const pm25 = typeof liveContext?.pm2_5 === 'number' ? liveContext.pm2_5 : null;
  const cigaretteEquiv = typeof liveContext?.cigaretteEquiv === 'number' ? liveContext.cigaretteEquiv : null;
  return [
    `Current reported AQI in ${city}: ${aqi ?? 'unavailable'} (${liveContext?.category || 'category unavailable'}). Source: ${liveContext?.source || 'Open-Meteo CAMS model'}.`,
    pm25 === null
      ? 'PM2.5 is unavailable; a pollutant comparison cannot be calculated.'
      : `Modeled PM2.5 is ${pm25} µg/m³; the WHO 24-hour guideline reference is 15 µg/m³.`,
    cigaretteEquiv === null
      ? 'A cigarette-equivalent estimate is unavailable without PM2.5.'
      : `The Berkeley Earth method estimates ${cigaretteEquiv} cigarette-equivalents/day from the PM2.5 concentration.`,
  ];
}

// VayuAI Copilot chat endpoint
app.post('/api/gemini/copilot', async (req: Request, res: Response) => {
  const { message, liveContext, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // If Gemini client is not initialized, return high-accuracy meteorological fallback
  if (!aiClient) {
    const fallbackText = generateTelemetryFallback(message, liveContext);
    return res.status(200).json({ text: fallbackText });
  }

  // Exact Section 7 System Instruction
  const systemInstruction = `You are VayuAI Copilot, an authoritative, scientific air quality and environmental health assistant on the VayuPulse AI platform for the Lets Code Diwali Challenge 2026 (theme: BREATHE BETTER).

CORE OPERATIONAL MANDATES:
1. Answer ONLY using the provided air quality context below. Follow the source and provenance stated in that context: if the AQI source is a WAQI station, call it a station reading; pollutant concentrations, history, and forecasts remain Open-Meteo CAMS modeled data.
2. If specific data is not present in the context, explicitly state that it is unavailable rather than guessing or fabricating numbers.
3. NEVER diagnose medical conditions or prescribe pharmaceutical treatments. Provide evidence-backed public health countermeasures derived from WHO 2021 Global Air Quality Guidelines and US EPA AQI benchmarks.
4. Cite the provided source for each value. Cite Open-Meteo CAMS for modeled values and WAQI for station AQI; never conflate them.
5. Explain biological and photochemical mechanisms with scientific clarity:
   - PM2.5: Sub-2.5µm carbon particles bypassing upper airway ciliary defense, penetrating deep into terminal alveolar sacs and translocating across the alveolar-capillary barrier into arterial circulation.
   - PM10: Inhalable coarse particles triggering nasopharyngeal and bronchial mucosal irritation.
   - Do not claim a local thermal inversion or specific boundary-layer height unless that information is present in the supplied context.
   - Photochemical Smog: UV-driven secondary ozone formation and nitrogen dioxide (NO2) oxidation.
6. Reference the Berkeley Earth standard: 1 cigarette/day ≈ 22 µg/m³ ambient PM2.5 inhaled over 24 hours.
7. Be direct, vigilant, helpful, and concise (typically 2-4 focused paragraphs). Format critical metrics, thresholds, and times in **bold**.

CURRENT VERIFIED TELEMETRY CONTEXT:
${JSON.stringify(liveContext || {}, null, 2)}`;

  try {
    // Format conversation history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout (7s limit)')), 7000)
    );

    const apiPromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const replyText = response.text || generateTelemetryFallback(message, liveContext);
    return res.json({ text: replyText });
  } catch (err: unknown) {
    console.warn('Gemini API call failed or timed out, serving telemetry fallback:', err);
    // Return high-accuracy meteorological fallback on any API error or quota limit
    const fallbackText = generateTelemetryFallback(message, liveContext);
    return res.status(200).json({ text: fallbackText });
  }
});

// VayuAI 3-bullet Daily Insights endpoint
app.post('/api/gemini/insights', async (req: Request, res: Response) => {
  const { liveContext } = req.body;

  if (!aiClient) {
    return res.json({ bullets: generateInsightFallback(liveContext) });
  }

  const prompt = `Based strictly on this air quality context. Follow the source stated for each reading: identify WAQI AQI as a station reading when present; pollutant concentrations, history, and forecasts are Open-Meteo CAMS modeled data.
${JSON.stringify(liveContext || {}, null, 2)}

Generate exactly 3 concise bullet points (under 25 words each). Do not invent missing values, ground-station readings, or forecast windows. Cite the source supplied in the context.
Return JSON with format: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Insights API timeout')), 5000)
    );

    const apiPromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      bullets: Array.isArray(parsed.bullets) && parsed.bullets.length > 0 ? parsed.bullets : [],
    });
  } catch {
    return res.json({ bullets: generateInsightFallback(liveContext) });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`VayuPulse AI server running at http://localhost:${PORT}`);
  });
}

startServer();
