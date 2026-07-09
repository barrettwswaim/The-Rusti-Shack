// Server-only Gemini client for the Part D "Ask the Data" assistant.
// Never import this from a 'use client' file. GEMINI_API_KEY is read
// lazily (inside getGeminiClient(), not at module load) so this file can
// be safely imported even when the key isn't set yet without crashing
// the build - callers get a clear error only when they actually try to
// use the assistant.
import { GoogleGenAI } from '@google/genai';

// Both are current STABLE (non-preview) models as of the Gemini 3
// series (verified against ai.google.dev/gemini-api/docs/models,
// checked 2026-07-09). Preview models are deliberately excluded from
// this dropdown - they can be deprecated on two weeks' notice, which is
// not a good fit for a tool a small business relies on daily.
export const GEMINI_MODELS = {
  'gemini-3.1-flash-lite': {
    label: 'Gemini 3.1 Flash-Lite (fastest, cheapest)',
    // Paid-tier pricing per official ai.google.dev/gemini-api/docs/pricing,
    // verified 2026-07-09. USD per 1M tokens.
    inputPer1M: 0.25,
    outputPer1M: 1.5,
  },
  'gemini-3.5-flash': {
    label: 'Gemini 3.5 Flash (most capable)',
    inputPer1M: 1.5,
    outputPer1M: 9.0,
  },
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export function isAiAssistantEnabled() {
  const raw = (process.env.AI_ASSISTANT_ENABLED ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'off';
}

export function isValidGeminiModel(modelId) {
  return Object.prototype.hasOwnProperty.call(GEMINI_MODELS, modelId);
}

// Rough cost estimate shown to the manager alongside every answer. This
// is an ESTIMATE from token counts the SDK reports back, using the
// published per-1M-token rates above - it is not a substitute for the
// manager's actual Google AI Studio / Cloud billing dashboard, and the
// UI must say so.
export function estimateCostUsd(modelId, inputTokens, outputTokens) {
  const model = GEMINI_MODELS[modelId] || GEMINI_MODELS[DEFAULT_GEMINI_MODEL];
  const inputCost = (Number(inputTokens) || 0) * (model.inputPer1M / 1_000_000);
  const outputCost = (Number(outputTokens) || 0) * (model.outputPer1M / 1_000_000);
  return inputCost + outputCost;
}

let cachedClient = null;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY. Set it in .env.local (see .env.example) and in Vercel project ' +
        'settings. Never expose this value to the browser or prefix it with NEXT_PUBLIC_.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}
