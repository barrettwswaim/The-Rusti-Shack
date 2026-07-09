// Server-only rate limiting + usage tracking for the Part D "Ask the
// Data" AI assistant. Same reasoning as lib/managerRateLimit.js: an
// in-memory counter resets on every serverless invocation and protects
// nothing on Vercel, so this uses a persistent Supabase table
// (ai_assistant_usage - see supabase/migrations/0012_part_d_ai_usage_log.sql).
//
// This is a single-owner private tool (not public, one manager), so the
// limit is generous - it exists to catch a runaway loop or a mistaken
// bulk-testing script hammering a paid API, not to throttle real usage.
// Only imported by app/api/management-ai/route.js.
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TABLE = 'ai_assistant_usage';

const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Fail closed: if the rate-limit check itself fails (e.g. DB
// unreachable), treat the request as NOT allowed rather than letting an
// unlimited number of paid API calls through.
const FAIL_CLOSED = { allowed: false, reason: 'unavailable' };

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

// Call before running any Gemini call for this request.
export async function checkAiRateLimit(ip) {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await supabaseAdmin
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', windowStart);

  if (error) {
    console.error('AI rate limit: lookup failed', error.message);
    return { ...FAIL_CLOSED, ip };
  }

  const used = count || 0;
  if (used >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, reason: 'rate_limited', ip, used, limit: MAX_REQUESTS_PER_WINDOW };
  }
  return { allowed: true, ip, used, limit: MAX_REQUESTS_PER_WINDOW, remaining: MAX_REQUESTS_PER_WINDOW - used };
}

// Call after every attempted request (successful, refused, or errored)
// so the usage log and the rate limit stay accurate together.
export async function recordAiUsage({
  ip,
  model,
  inputTokens = 0,
  outputTokens = 0,
  estimatedCostUsd = 0,
  toolCalls = 0,
  refused = false,
  error = false,
}) {
  const { error: insertError } = await supabaseAdmin.from(TABLE).insert({
    ip_address: ip,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: estimatedCostUsd,
    tool_calls: toolCalls,
    refused,
    error,
  });
  if (insertError) {
    console.error('AI usage log: insert failed', insertError.message);
  }
}

// Powers the "usage today" display in the assistant UI. Aggregated
// server-side in JS (small row count for a single-shop tool - no need
// for a SQL aggregate function here).
export async function getUsageSummary(hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('input_tokens, output_tokens, estimated_cost_usd, refused, error')
    .gte('created_at', since);

  if (error) {
    console.error('AI usage summary: query failed', error.message);
    return { requestCount: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, refusedCount: 0, errorCount: 0 };
  }

  const rows = data || [];
  return {
    requestCount: rows.length,
    inputTokens: rows.reduce((s, r) => s + (r.input_tokens || 0), 0),
    outputTokens: rows.reduce((s, r) => s + (r.output_tokens || 0), 0),
    estimatedCostUsd: rows.reduce((s, r) => s + (Number(r.estimated_cost_usd) || 0), 0),
    refusedCount: rows.filter((r) => r.refused).length,
    errorCount: rows.filter((r) => r.error).length,
  };
}
