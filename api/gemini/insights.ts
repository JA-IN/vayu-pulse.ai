import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }

  const body = req.body as { liveContext?: unknown } | undefined;
  if (!body || !body.liveContext || typeof body.liveContext !== 'object') {
    sendJson(res, 400, { message: 'Air-quality context is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 503, { message: 'Gemini is not configured' });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Based only on this air-quality context, generate exactly 3 concise bullet points (under 25 words each). Do not invent missing values, station readings, or forecast windows. Follow the source stated in context: distinguish WAQI station AQI from Open-Meteo CAMS modeled pollutants, history, and forecasts. Cite the source used.

Context:
${JSON.stringify(body.liveContext, null, 2)}

Return JSON: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }`;

  try {
    const request = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const response = await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Gemini request timed out')), 7000);
      }),
    ]).finally(() => {
      if (timeout) clearTimeout(timeout);
    });

    const parsed: unknown = JSON.parse(response.text || '{}');
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('bullets' in parsed) ||
      !Array.isArray(parsed.bullets) ||
      parsed.bullets.length !== 3 ||
      !parsed.bullets.every((bullet) => typeof bullet === 'string')
    ) {
      sendJson(res, 502, { message: 'Gemini returned an invalid insights response' });
      return;
    }
    sendJson(res, 200, { bullets: parsed.bullets });
  } catch {
    sendJson(res, 502, { message: 'Gemini Insights request failed. Please try again.' });
  }
}
