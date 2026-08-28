// Compartilhado entre Edge Functions: CORS + helper de resposta JSON.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

function resolveOrigin(origin?: string | null): string {
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
}

/** CORS headers — use as a value or call with origin for dynamic matching. */
export function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(origin),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }
}

/** Static CORS headers for OPTIONS responses (uses default origin). */
export const staticCorsHeaders = corsHeaders()

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...staticCorsHeaders },
  })
}