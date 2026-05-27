import { loadRedditData, THREAD_URL } from './reddit.js';

const CACHE_KEY = 'reports:v1';
const CACHE_TTL_SECONDS = 10 * 60;
const CACHE_STALE_SECONDS = 60 * 60;
const KV_CACHE_TTL_SECONDS = CACHE_STALE_SECONDS + CACHE_TTL_SECONDS;

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
      'Cache-Control': 'no-store',
      ...corsHeaders,
      ...(init.headers || {})
    }
  });
}

function cacheRecord(payload) {
  return {
    payload,
    cachedAt: new Date().toISOString()
  };
}

function isFresh(record) {
  const cachedAt = Date.parse(record?.cachedAt || '');
  return Number.isFinite(cachedAt) && Date.now() - cachedAt < CACHE_TTL_SECONDS * 1000;
}

function serverCacheKey(requestUrl) {
  const url = new URL('/api/reports', requestUrl);
  return new Request(url.toString(), { method: 'GET' });
}

function internalCacheResponse(record) {
  return new Response(JSON.stringify(record), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`
    }
  });
}

async function buildPayload(env) {
  const data = await loadRedditData({
    fetcher: fetch,
    delayMs: 1000,
    userAgent: env.REDDIT_USER_AGENT
  });
  return {
    ...data,
    source: THREAD_URL,
    generatedAt: new Date().toISOString()
  };
}

async function readCachedRecord(request, env) {
  if (env.REPORTS_CACHE) {
    return env.REPORTS_CACHE.get(CACHE_KEY, { type: 'json', cacheTtl: 60 });
  }

  const cached = await caches.default.match(serverCacheKey(request.url));
  return cached ? cached.json() : null;
}

async function writeCachedRecord(record, request, env) {
  if (env.REPORTS_CACHE) {
    await env.REPORTS_CACHE.put(CACHE_KEY, JSON.stringify(record), {
      expirationTtl: KV_CACHE_TTL_SECONDS
    });
    return;
  }

  await caches.default.put(serverCacheKey(request.url), internalCacheResponse(record));
}

async function refreshReports(env, request = new Request('https://pebble-cache.local/api/reports')) {
  const payload = await buildPayload(env);
  const record = cacheRecord(payload);
  await writeCachedRecord(record, request, env);
  return record;
}

async function handleReports(request, env, ctx) {
  const cached = await readCachedRecord(request, env);
  if (cached?.payload) {
    if (!isFresh(cached)) {
      ctx.waitUntil(refreshReports(env, request));
    }
    return jsonResponse(cached.payload, {
      headers: { 'X-Reports-Cache': isFresh(cached) ? 'HIT' : 'STALE' }
    });
  }

  const record = await refreshReports(env, request);
  return jsonResponse(record.payload, {
    headers: { 'X-Reports-Cache': 'MISS' }
  });
}

async function handleScheduled(env) {
  if (!env.REPORTS_CACHE) {
    console.warn('Skipping scheduled refresh because REPORTS_CACHE is not bound.');
    return;
  }

  await refreshReports(env);
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
    }

    if (url.pathname === '/' || url.pathname === '/api/reports') {
      try {
        return await handleReports(request, env, ctx);
      } catch (error) {
        return jsonResponse({
          error: 'Failed to load Reddit data',
          message: error instanceof Error ? error.message : String(error)
        }, { status: 502 });
      }
    }

    return jsonResponse({ error: 'Not found' }, { status: 404 });
  }
};
