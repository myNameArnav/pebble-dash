import { normalizeEntry, isLikelyReport } from './parser.js';

export const THREAD_URL = 'https://www.reddit.com/r/pebble/comments/1sjk3c7/shipping_mega_thread';
const THREAD_PATH = '/r/pebble/comments/1sjk3c7/shipping_mega_thread';
const REDDIT_ORIGINS = ['https://www.reddit.com', 'https://old.reddit.com'];
const MORECHILDREN_BATCH = 100;
const REDDIT_PAGE_DELAY_MS = 1000;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; pebble-shipping-dashboard/1.0; +https://pebble-api.o-0.dev)';

const STATUS_RANK = { Shipped: 3, Confirmed: 2, Waiting: 1, Unknown: 0 };

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function redditHeaders(options = {}) {
  return {
    Accept: 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'User-Agent': options.userAgent || DEFAULT_USER_AGENT
  };
}

function redditUrl(origin, path) {
  return `${origin}${path}`;
}

function commentPermalink(comment) {
  if (comment.permalink) {
    return redditUrl('https://www.reddit.com', comment.permalink);
  }
  if (comment.link_id && comment.id) {
    const postId = String(comment.link_id).replace(/^t3_/, '');
    return redditUrl('https://www.reddit.com', `/comments/${postId}/_/${comment.id}/`);
  }
  return null;
}

function parseTopLevelComment(node, acc) {
  if (!node || node.kind !== 't1' || !node.data) return;
  const c = node.data;
  if (!c.author || !c.body || c.body === '[deleted]' || c.body === '[removed]') return;
  const normalized = normalizeEntry({
    author: c.author,
    created: new Date((c.created_utc || 0) * 1000).toISOString(),
    score: c.score || 0,
    device: 'Unknown',
    color: 'Unknown',
    country: 'Unknown',
    batch: 'Unknown',
    status: 'Unknown',
    orderDate: null,
    confirmDate: null,
    shippingDate: null,
    permalink: commentPermalink(c),
    body: c.body
  });
  if (isLikelyReport(normalized)) {
    acc.push(normalized);
  }
}

function compareEntries(a, b) {
  const rankDiff = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0);
  if (rankDiff !== 0) return rankDiff;
  const aTime = a.created ? Date.parse(a.created) : 0;
  const bTime = b.created ? Date.parse(b.created) : 0;
  if (aTime !== bTime) return aTime - bTime;
  return (a.score || 0) - (b.score || 0);
}

function bestEntry(entries) {
  return entries.reduce((best, entry) => (
    !best || compareEntries(entry, best) > 0 ? entry : best
  ), null);
}

function dedupeByAuthorAndDevice(entries) {
  const byAuthor = new Map();
  for (const entry of entries) {
    const key = String(entry.author || '').toLowerCase();
    if (!byAuthor.has(key)) byAuthor.set(key, []);
    byAuthor.get(key).push(entry);
  }

  const deduped = [];
  for (const authorEntries of byAuthor.values()) {
    const knownDeviceEntries = authorEntries.filter(entry => entry.device && entry.device !== 'Unknown');
    const knownDevices = new Set(knownDeviceEntries.map(entry => entry.device));
    if (knownDevices.size > 1) {
      for (const device of knownDevices) {
        deduped.push(bestEntry(knownDeviceEntries.filter(entry => entry.device === device)));
      }
    } else {
      deduped.push(bestEntry(authorEntries));
    }
  }
  return deduped.filter(Boolean);
}

export function parseRedditThread(payload) {
  if (!Array.isArray(payload) || payload.length < 2) {
    throw new Error('Unexpected Reddit thread payload');
  }
  const postData = payload[0]?.data?.children?.[0]?.data;
  if (!postData) {
    throw new Error('Post payload missing');
  }
  const parsedEntries = [];
  const commentNodes = payload[1]?.data?.children || [];
  commentNodes.forEach(node => parseTopLevelComment(node, parsedEntries));
  const dedupedEntries = dedupeByAuthorAndDevice(parsedEntries);
  return {
    post: {
      title: postData.title,
      created: new Date((postData.created_utc || 0) * 1000).toISOString(),
      score: postData.score || 0,
      numComments: postData.num_comments || dedupedEntries.length
    },
    entries: dedupedEntries
  };
}

async function fetchRedditJson(fetcher, path, params, options) {
  let lastStatus = null;
  for (const origin of REDDIT_ORIGINS) {
    const response = await fetcher(`${redditUrl(origin, path)}?${params}`, {
      headers: redditHeaders(options)
    });
    if (response.ok) return response.json();
    lastStatus = response.status;
  }
  throw new Error(`Reddit fetch failed: ${lastStatus}`);
}

async function fetchRedditPage(after, fetcher, options) {
  const params = new URLSearchParams({
    limit: '100',
    raw_json: '1',
    depth: '1'
  });
  if (after) params.set('after', after);

  return fetchRedditJson(fetcher, `${THREAD_PATH}.json`, params, options);
}

async function fetchAllTopLevelCommentPages({ fetcher, onProgress, delayMs, userAgent }) {
  let after = null;
  let firstPayload = null;
  const children = [];
  const redditOptions = { userAgent };

  do {
    if (after) await delay(delayMs);
    onProgress?.(after ? 'Fetching next Reddit comment page...' : 'Fetching Reddit data...');
    const payload = await fetchRedditPage(after, fetcher, redditOptions);
    if (!Array.isArray(payload) || payload.length < 2 || !payload[1]?.data) {
      throw new Error('Unexpected Reddit comments payload');
    }
    if (!firstPayload) firstPayload = payload;
    children.push(...(payload[1].data.children || []));
    after = payload[1].data.after || null;
    onProgress?.(`Fetched ${children.length} top-level comments...`);
  } while (after);

  if (firstPayload?.[1]?.data) {
    firstPayload[1].data.children = children;
    firstPayload[1].data.after = null;
  }
  return firstPayload;
}

async function expandTopLevelMoreChildren(linkId, initialChildren, { fetcher, onProgress, delayMs, userAgent }) {
  const out = [];
  const queue = [];
  const redditOptions = { userAgent };

  for (const child of initialChildren) {
    if (child.kind === 't1') {
      out.push(child);
    } else if (
      child.kind === 'more' &&
      child.data?.parent_id === linkId &&
      Array.isArray(child.data.children)
    ) {
      queue.push(...child.data.children);
    }
  }

  while (queue.length > 0) {
    const ids = queue.splice(0, MORECHILDREN_BATCH);
    onProgress?.(`Fetching ${ids.length} more top-level comments...`);
    await delay(delayMs);

    const params = new URLSearchParams({
      api_type: 'json',
      link_id: linkId,
      children: ids.join(','),
      raw_json: '1'
    });
    let data = null;
    try {
      data = await fetchRedditJson(fetcher, '/api/morechildren.json', params, redditOptions);
    } catch (error) {
      console.warn(`${error instanceof Error ? error.message : String(error)}; keeping ${out.length} top-level comments fetched so far`);
      break;
    }
    const things = data?.json?.data?.things || [];
    for (const thing of things) {
      if (thing.kind === 't1' && thing.data?.parent_id === linkId) {
        out.push(thing);
      } else if (
        thing.kind === 'more' &&
        thing.data?.parent_id === linkId &&
        Array.isArray(thing.data.children)
      ) {
        queue.push(...thing.data.children);
      }
    }
    onProgress?.(`Fetched ${out.length} top-level comments...`);
  }

  return out;
}

export async function loadRedditData(options = {}) {
  const fetcher = options.fetcher || fetch;
  const delayMs = options.delayMs ?? REDDIT_PAGE_DELAY_MS;
  const payload = await fetchAllTopLevelCommentPages({
    fetcher,
    onProgress: options.onProgress,
    delayMs,
    userAgent: options.userAgent
  });
  const postData = payload[0]?.data?.children?.[0]?.data;
  if (postData?.id && payload[1]?.data) {
    payload[1].data.children = await expandTopLevelMoreChildren(
      `t3_${postData.id}`,
      payload[1].data.children || [],
      {
        fetcher,
        onProgress: options.onProgress,
        delayMs,
        userAgent: options.userAgent
      }
    );
  }
  return parseRedditThread(payload);
}
