import { loadRedditData, THREAD_URL } from '../../reddit.js';

const CACHE_TTL_SECONDS = 10 * 60;
const CACHE_STALE_SECONDS = 60 * 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`,
      ...corsHeaders,
      ...(init.headers || {})
    }
  });
}

async function buildPayload() {
  const data = await loadRedditData({
    fetcher: fetch,
    delayMs: 1000
  });
  return {
    ...data,
    source: THREAD_URL,
    generatedAt: new Date().toISOString()
  };
}

export async function onRequest(context) {
  const { request, waitUntil } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const cache = caches.default;
    const cacheKey = new Request(new URL('/api/reports', request.url), {
      method: 'GET'
    });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const payload = await buildPayload();
    const response = jsonResponse(payload);
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return jsonResponse({
      error: 'Failed to load Reddit data',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 502 });
  }
}
