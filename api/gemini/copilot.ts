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

  const body = req.body as {
    message?: unknown;
    liveContext?: unknown;
    history?: unknown;
  } | undefined;
  if (typeof body?.message !== 'string' || !body.message.trim()) {
    sendJson(res, 400, { message: 'Message is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 503, { message: 'Gemini is not configured' });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = body.liveContext ?? {};
  const history = Array.isArray(body.history)
    ? body.history.slice(-6).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const item = entry as { sender?: unknown; text?: unknown };
        if (typeof item.text !== 'string') return [];
        return [{
          role: item.sender === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: item.text }],
        }];
      })
    : [];
  const systemInstruction = `You are VayuAI Copilot, a concise, evidence-based air-quality assistant.
Use only the supplied context. State missing values instead of guessing. Follow the source and provenance stated in context: identify WAQI AQI as a station reading when present; pollutant concentrations, history, and forecasts are Open-Meteo CAMS modeled data. Do not conflate these sources. Do not diagnose or prescribe. Cite the source used.

CURRENT VERIFIED CONTEXT:
${JSON.stringify(context, null, 2)}`;

  try {
    const request = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...history,
        { role: 'user' as const, parts: [{ text: body.message }] },
      ],
      config: { systemInstruction },
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

    if (!response.text) {
      sendJson(res, 502, { message: 'Gemini returned an empty response' });
      return;
    }
    sendJson(res, 200, { text: response.text });
  } catch {
    sendJson(res, 502, { message: 'Gemini Copilot request failed. Please try again.' });
  }
}
