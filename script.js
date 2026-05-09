// ── Embedded Parsed Data ───────────────────────────────────────────────────
const DATA = { "post": { "title": "Shipping Mega Thread", "created": null, "score": 0, "numComments": 0 }, "entries": [] };

const THREAD_URL = 'https://www.reddit.com/r/pebble/comments/1sjk3c7/shipping_mega_thread';
const THREAD_JSON_URL = `${THREAD_URL}.json`;
const MORECHILDREN_URL = 'https://www.reddit.com/api/morechildren.json';
const MORECHILDREN_BATCH = 100;
const REDDIT_PAGE_DELAY_MS = 1000;

let entries = DATA.entries.map(normalizeEntry);
let post = DATA.post;
let dataSource = 'loading';
let loadingMessage = '';

// ── Color Palette ──────────────────────────────────────────────────────────
const colors = {
  status: { Shipped: '#69DB7C', Confirmed: '#74C0FC', Waiting: '#FFA94D', Unknown: '#8888aa' },
  choropleth: ['#4ECDC4', '#74C0FC', '#B197FC', '#F783AC', '#FFA94D', '#69DB7C', '#FFD43B', '#FF6B6B', '#a0e7e5', '#c4b5fd', '#fbbf24', '#fb7185'],
  batch: { 'Batch 1': '#4ECDC4', 'Batch 2': '#B197FC', 'Batch 3': '#FFA94D', 'Batch 4': '#F783AC', 'Batch 5': '#FF6B6B' },
  device: { 'Pebble Duo 2': '#FFA94D', 'Pebble Time 2': '#4ECDC4', 'Pebble Round': '#74C0FC', 'Pebble Index': '#B197FC', 'Unknown': '#8888aa' },
  colorVar: { 'Black/Grey': '#555', 'Silver/Grey': '#c0c0c0', 'Black/Red': '#FF6B6B', 'Silver/Blue': '#4DABF7', 'Unknown': '#666' }
};

// ── Chart.js Defaults ──────────────────────────────────────────────────────
Chart.defaults.color = '#8888aa';
Chart.defaults.borderColor = 'transparent';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
Chart.defaults.plugins.tooltip = Object.assign({}, Chart.defaults.plugins.tooltip, {
  backgroundColor: 'rgba(15, 15, 30, 0.95)',
  titleColor: '#e8e8f0',
  bodyColor: '#b0b0c4',
  borderColor: '#353557',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 6,
});

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  filters: { status: 'All', batch: 'All', device: 'All', color: 'All', continent: 'All' },
  search: '',
  sort: { column: 'created', asc: false },
  page: 1,
  pageSize: 20,
};
const charts = {};
const expandedRows = new Set();

// ── Filter logic ───────────────────────────────────────────────────────────
function getFiltered() {
  const q = state.search.trim().toLowerCase();
  return entries.filter(e => {
    if (state.filters.status !== 'All' && e.status !== state.filters.status) return false;
    if (state.filters.batch !== 'All' && e.batch !== state.filters.batch) return false;
    if (state.filters.device !== 'All' && e.device !== state.filters.device) return false;
    if (state.filters.color !== 'All' && e.color !== state.filters.color) return false;
    if (state.filters.continent !== 'All' && e.continent !== state.filters.continent) return false;
    if (q) {
      const hay = `${e.author} ${e.country} ${e.device} ${e.color} ${e.batch} ${e.body || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Reddit fetch & parsing ─────────────────────────────────────────────────
// Only top-level comments are treated as reports. Replies are usually
// follow-up questions ("what country?") rather than fresh reports, so
// walking into c.replies just inflates counts and double-attributes users.
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
    body: c.body
  });
  if (isLikelyReport(normalized)) {
    acc.push(normalized);
  }
}

// Shipping status progresses forward over time: a user's later comment is
// almost always more informative than their earlier one. Keep one row per
// author unless the same author has multiple known, distinct device reports.
const STATUS_RANK = { Shipped: 3, Confirmed: 2, Waiting: 1, Unknown: 0 };

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

function parseRedditThread(payload) {
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setLoadingStatus(message) {
  loadingMessage = message;
  const el = document.getElementById('loading-status');
  const text = document.getElementById('loading-status-text');
  if (!el || !text) return;
  el.hidden = !message;
  text.textContent = message || '';
}

async function fetchRedditPage(after) {
  const params = new URLSearchParams({
    limit: '100',
    raw_json: '1',
    depth: '1'
  });
  if (after) params.set('after', after);

  const response = await fetch(`${THREAD_JSON_URL}?${params}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Reddit fetch failed: ${response.status}`);
  }
  return response.json();
}

// depth=1 asks Reddit for direct children of the post only. Comment listings
// are paginated with [1].data.after, whose value is a t1_<comment_id> fullname.
async function fetchAllTopLevelCommentPages() {
  let after = null;
  let firstPayload = null;
  const children = [];

  do {
    if (after) await delay(REDDIT_PAGE_DELAY_MS);
    setLoadingStatus(after ? 'Fetching next Reddit comment page…' : 'Fetching Reddit data…');
    const payload = await fetchRedditPage(after);
    if (!Array.isArray(payload) || payload.length < 2 || !payload[1]?.data) {
      throw new Error('Unexpected Reddit comments payload');
    }
    if (!firstPayload) firstPayload = payload;
    children.push(...(payload[1].data.children || []));
    after = payload[1].data.after || null;
    setLoadingStatus(`Fetched ${children.length} top-level comments…`);
  } while (after);

  if (firstPayload?.[1]?.data) {
    firstPayload[1].data.children = children;
    firstPayload[1].data.after = null;
  }
  return firstPayload;
}

async function expandTopLevelMoreChildren(linkId, initialChildren) {
  const out = [];
  const queue = [];

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
    setLoadingStatus(`Fetching ${ids.length} more top-level comments…`);
    await delay(REDDIT_PAGE_DELAY_MS);

    const params = new URLSearchParams({
      api_type: 'json',
      link_id: linkId,
      children: ids.join(','),
      raw_json: '1'
    });
    const response = await fetch(`${MORECHILDREN_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) {
      console.warn(`morechildren HTTP ${response.status}; keeping ${out.length} top-level comments fetched so far`);
      break;
    }

    const data = await response.json();
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
    setLoadingStatus(`Fetched ${out.length} top-level comments…`);
  }

  return out;
}

async function loadLiveData() {
  const payload = await fetchAllTopLevelCommentPages();
  const postData = payload[0]?.data?.children?.[0]?.data;
  if (postData?.id && payload[1]?.data) {
    payload[1].data.children = await expandTopLevelMoreChildren(
      `t3_${postData.id}`,
      payload[1].data.children || []
    );
  }
  return parseRedditThread(payload);
}

// ── Post info ──────────────────────────────────────────────────────────────
function renderPostInfo() {
  const parts = ['r/pebble'];
  if (post && post.created) parts.push(`posted ${new Date(post.created).toLocaleDateString()}`);
  parts.push(`${entries.length} reports ingested`);
  parts.push(dataSource === 'live' ? 'live from Reddit' : dataSource === 'loading' ? (loadingMessage || 'fetching Reddit data…') : 'offline');
  document.getElementById('post-info').textContent = parts.join(' · ');
}

// ── Progress bar ───────────────────────────────────────────────────────────
function renderProgress(data) {
  const total = data.length;
  const shipped = data.filter(e => e.status === 'Shipped').length;
  const confirmed = data.filter(e => e.status === 'Confirmed').length;
  const waiting = data.filter(e => e.status === 'Waiting').length;
  const pct = n => total ? (n / total * 100) : 0;
  const bar = document.getElementById('progress-bar');
  bar.children[0].style.width = pct(shipped) + '%';
  bar.children[1].style.width = pct(confirmed) + '%';
  bar.children[2].style.width = pct(waiting) + '%';
  const done = shipped + confirmed;
  document.getElementById('progress-label').innerHTML =
    `<strong>${done}</strong> of <strong>${total}</strong> past confirmation (${Math.round(pct(done))}%)`;
}

// ── Stat cards ─────────────────────────────────────────────────────────────
function renderStats(data) {
  const shipped = data.filter(e => e.status === 'Shipped').length;
  const confirmed = data.filter(e => e.status === 'Confirmed').length;
  const waiting = data.filter(e => e.status === 'Waiting').length;
  const countries = new Set(data.map(e => e.country).filter(c => c !== 'Unknown')).size;
  const devices = new Set(data.map(e => e.device).filter(d => d !== 'Unknown')).size;
  const shipRate = data.length ? Math.round((shipped / data.length) * 100) : 0;

  const leads = data
    .filter(e => e.orderDate && e.confirmDate)
    .map(e => (new Date(e.confirmDate) - new Date(e.orderDate)) / 86400000);
  const avgLead = leads.length ? Math.round(leads.reduce((a, b) => a + b, 0) / leads.length) : 0;

  const cards = [
    { value: data.length, label: 'Reports', hint: 'matching filters', color: 'var(--accent)' },
    { value: shipped, label: 'Shipped', hint: `${shipRate}% of reports`, color: 'var(--green)' },
    { value: confirmed, label: 'Confirmed', hint: 'awaiting label', color: 'var(--blue)' },
    { value: waiting, label: 'Waiting', hint: 'no email yet', color: 'var(--orange)' },
    { value: countries, label: 'Countries', hint: `${devices} device models`, color: 'var(--purple)' },
    { value: avgLead ? avgLead + 'd' : '—', label: 'Avg lead', hint: 'order → confirm', color: 'var(--yellow)' },
  ];
  document.getElementById('stat-cards').innerHTML = cards.map(c =>
    `<div class="stat-card" style="--stat-color:${c.color}"><div class="label">${c.label}</div><div class="value">${c.value}</div><div class="hint">${c.hint}</div></div>`
  ).join('');
}

// ── Chart factories ────────────────────────────────────────────────────────
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }

function chartStatus(data) {
  destroyChart('status');
  const counts = {};
  data.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
  const order = ['Shipped', 'Confirmed', 'Waiting', 'Unknown'].filter(k => counts[k]);
  charts.status = new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: {
      labels: order,
      datasets: [{
        data: order.map(k => counts[k]),
        backgroundColor: order.map(k => colors.status[k]),
        borderWidth: 2,
        borderColor: '#171728',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round(ctx.parsed / total * 100) : 0;
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function chartDeviceColor(data) {
  destroyChart('deviceColor');
  const devices = [...new Set(data.map(e => e.device))].filter(d => d !== 'Unknown');
  const colorKeys = ['Black/Grey', 'Silver/Grey', 'Black/Red', 'Silver/Blue', 'Unknown'];
  const datasets = colorKeys.map(ck => ({
    label: ck,
    data: devices.map(d => data.filter(e => e.device === d && e.color === ck).length),
    backgroundColor: colors.colorVar[ck],
    borderWidth: 0, borderRadius: 4,
  })).filter(ds => ds.data.some(v => v > 0));

  charts.deviceColor = new Chart(document.getElementById('chartDeviceColor'), {
    type: 'bar',
    data: { labels: devices, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, boxWidth: 7, font: { size: 10 } } } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: '#8888aa' } },
        y: { stacked: true, grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 } }
      }
    }
  });
}

function chartCountries(data) {
  destroyChart('countries');
  const counts = {};
  data.forEach(e => { if (e.country !== 'Unknown') counts[e.country] = (counts[e.country] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  charts.countries = new Chart(document.getElementById('chartCountries'), {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Reports',
        data: sorted.map(s => s[1]),
        backgroundColor: sorted.map((_, i) => colors.choropleth[i % colors.choropleth.length]),
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 } },
        y: { grid: { display: false }, ticks: { color: '#8888aa', font: { size: 11 } } }
      }
    }
  });
}

function chartTimeline(data) {
  destroyChart('timeline');
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const normalizeChartDate = value => {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const d = `${match[1]}-${match[2]}-${match[3]}`;
    if (d > todayKey) return null;
    const time = Date.parse(`${d}T00:00:00Z`);
    return Number.isFinite(time) ? d : null;
  };
  const groupByDate = field => {
    const days = {};
    data.forEach(e => {
      const d = normalizeChartDate(e[field]);
      if (!d) return;
      days[d] = (days[d] || 0) + 1;
    });
    return days;
  };
  const ordersByDay = groupByDate('orderDate');
  const confirmsByDay = groupByDate('confirmDate');
  const shipsByDay = groupByDate('shippingDate');
  const allDates = new Set([...Object.keys(ordersByDay), ...Object.keys(confirmsByDay), ...Object.keys(shipsByDay)]);
  const sortedDates = [...allDates].sort((a, b) => Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  let o = 0, c = 0, s = 0;
  const cumO = [], cumC = [], cumS = [];
  sortedDates.forEach(d => {
    o += ordersByDay[d] || 0;
    c += confirmsByDay[d] || 0;
    s += shipsByDay[d] || 0;
    cumO.push(o); cumC.push(c); cumS.push(s);
  });
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  charts.timeline = new Chart(document.getElementById('chartTimeline'), {
    type: 'line',
    data: {
      labels: sortedDates.map(fmt),
      datasets: [
        { label: 'Orders placed', data: cumO, borderColor: '#FFD43B', backgroundColor: 'rgba(255,212,59,0.1)', tension: 0.35, fill: true, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
        { label: 'Confirmed', data: cumC, borderColor: '#74C0FC', backgroundColor: 'rgba(116,192,252,0.12)', tension: 0.35, fill: true, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
        { label: 'Shipped', data: cumS, borderColor: '#69DB7C', backgroundColor: 'rgba(105,219,124,0.12)', tension: 0.35, fill: true, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8888aa', maxTicksLimit: 14, maxRotation: 0 } },
        y: { grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 }, title: { display: true, text: 'Cumulative', color: '#7878a0', font: { size: 10 } } }
      }
    }
  });
}

function chartBatch(data) {
  destroyChart('batch');
  const batches = ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'].filter(b => data.some(e => e.batch === b));
  const statuses = ['Shipped', 'Confirmed', 'Waiting'];
  const datasets = statuses.map(s => ({
    label: s,
    data: batches.map(b => data.filter(e => e.batch === b && e.status === s).length),
    backgroundColor: colors.status[s],
    borderRadius: 4, borderSkipped: false,
  }));
  charts.batch = new Chart(document.getElementById('chartBatch'), {
    type: 'bar',
    data: { labels: batches, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, boxWidth: 7, font: { size: 10 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8888aa' } },
        y: { grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 } }
      }
    }
  });
}

function chartLeadTime(data) {
  destroyChart('leadTime');
  const leads = data
    .filter(e => e.orderDate && e.confirmDate)
    .map(e => Math.round((new Date(e.confirmDate) - new Date(e.orderDate)) / 86400000))
    .filter(n => n >= 0 && Number.isFinite(n));

  const bucketSize = 30;
  const buckets = {};
  leads.forEach(d => {
    const k = Math.floor(d / bucketSize) * bucketSize;
    buckets[k] = (buckets[k] || 0) + 1;
  });
  const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  const labels = keys.map(k => `${k}–${k + bucketSize}d`);
  const values = keys.map(k => buckets[k]);

  charts.leadTime = new Chart(document.getElementById('chartLeadTime'), {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [{
        label: 'Reports',
        data: values.length ? values : [0],
        backgroundColor: '#B197FC',
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} report${ctx.parsed.y === 1 ? '' : 's'}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8888aa', font: { size: 10 } } },
        y: { grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 } }
      }
    }
  });
}

function chartActivity(data) {
  destroyChart('activity');
  const byDay = {};
  data.forEach(e => { if (!e.created) return; const d = e.created.split('T')[0]; byDay[d] = (byDay[d] || 0) + 1; });
  const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  charts.activity = new Chart(document.getElementById('chartActivity'), {
    type: 'bar',
    data: {
      labels: sorted.map(s => fmt(s[0])),
      datasets: [{ label: 'Comments', data: sorted.map(s => s[1]), backgroundColor: '#B197FC', borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8888aa', maxTicksLimit: 14, maxRotation: 0 } },
        y: { grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 } }
      }
    }
  });
}

function renderCharts(data) {
  chartStatus(data);
  chartDeviceColor(data);
  chartCountries(data);
  chartTimeline(data);
  chartBatch(data);
  chartLeadTime(data);
  chartActivity(data);
}

// ── Filter chips ───────────────────────────────────────────────────────────
function buildChips(containerId, key, label, values) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<span class="filter-label">${label}</span>`;
  const subset = entries.filter(e => {
    for (const [k, v] of Object.entries(state.filters)) {
      if (k === key || v === 'All') continue;
      if (e[k] !== v) return false;
    }
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      const hay = `${e.author} ${e.country} ${e.device} ${e.color} ${e.batch} ${e.body || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const counts = {};
  subset.forEach(e => { counts[e[key]] = (counts[e[key]] || 0) + 1; });
  if (!values) {
    values = Object.entries(counts)
      .filter(([v]) => v !== 'Unknown')
      .sort((a, b) => b[1] - a[1])
      .map(([v]) => v);
  }
  const html = ['<button class="chip active" data-value="All">All</button>']
    .concat(values.map(v =>
      `<button class="chip" data-value="${v}">${v}<span class="count">${counts[v] || 0}</span></button>`
    )).join('');
  container.insertAdjacentHTML('beforeend', html);
  container.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.value === state.filters[key]);
  });
  if (container.dataset.bound === 'true') return;
  container.addEventListener('click', ev => {
    const btn = ev.target.closest('.chip');
    if (!btn) return;
    container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    state.filters[key] = btn.dataset.value;
    state.page = 1;
    renderAll();
  });
  container.dataset.bound = 'true';
}

function renderFilterChips() {
  buildChips('filter-status', 'status', 'Status', ['Shipped', 'Confirmed', 'Waiting', 'Unknown']);
  buildChips('filter-batch', 'batch', 'Batch', ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5']);
  buildChips('filter-device', 'device', 'Device', ['Pebble Duo 2', 'Pebble Time 2', 'Pebble Round', 'Pebble Index']);
  buildChips('filter-color', 'color', 'Color', ['Black/Grey', 'Silver/Grey', 'Black/Red', 'Silver/Blue']);
  buildChips('filter-continent', 'continent', 'Continent', ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']);
}

// ── Search (debounced) ────────────────────────────────────────────────────
let searchTimer;
document.getElementById('search-input').addEventListener('input', ev => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = ev.target.value;
    state.page = 1;
    renderAll();
  }, 160);
});

// ── Reset ──────────────────────────────────────────────────────────────────
document.getElementById('filter-reset').addEventListener('click', () => {
  state.filters = { status: 'All', batch: 'All', device: 'All', color: 'All', continent: 'All' };
  state.search = '';
  state.page = 1;
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.filter-bar .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.value === 'All');
  });
  renderAll();
});

// ── Table helpers ──────────────────────────────────────────────────────────
const badgeClass = s => ({ Shipped: 'badge-shipped', Confirmed: 'badge-confirmed', Waiting: 'badge-waiting', Unknown: 'badge-unknown' }[s] || 'badge-unknown');
const batchClass = b => ({ 'Batch 1': 'badge-batch1', 'Batch 2': 'badge-batch2', 'Batch 3': 'badge-batch3', 'Batch 4': 'badge-batch4', 'Batch 5': 'badge-batch5' }[b] || '');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sortData(data) {
  const { column, asc } = state.sort;
  const dir = asc ? 1 : -1;
  return [...data].sort((a, b) => {
    const av = a[column];
    const bv = b[column];
    // Push null/undefined/empty to the bottom
    const aEmpty = av == null || av === '' || av === 'Unknown';
    const bEmpty = bv == null || bv === '' || bv === 'Unknown';
    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;
    if (aEmpty && bEmpty) return 0;
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

function keyOf(e) { return e.author + '|' + e.created; }

// ── Table render ───────────────────────────────────────────────────────────
function renderTable(data) {
  const sorted = sortData(data);
  const pageCount = Math.max(1, Math.ceil(sorted.length / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;
  const start = (state.page - 1) * state.pageSize;
  const slice = sorted.slice(start, start + state.pageSize);
  const tbody = document.querySelector('#data-table tbody');

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><div class="empty-icon">∅</div>No reports match these filters.<br>Try clearing some to see more.</div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(e => {
      const k = keyOf(e);
      const isOpen = expandedRows.has(k);
      const body = e.body ? e.body.trim() : '(no body)';
      return `
  <tr class="data-row${isOpen ? ' expanded' : ''}" data-key="${escapeHtml(k)}">
    <td>${escapeHtml(e.author)}</td>
    <td>${escapeHtml(e.device)}</td>
    <td>${escapeHtml(e.color)}</td>
    <td>${escapeHtml(e.country)}</td>
    <td>${e.batch !== 'Unknown' ? `<span class="badge ${batchClass(e.batch)}">${e.batch}</span>` : '<span class="badge badge-unknown">Unknown</span>'}</td>
    <td><span class="badge ${badgeClass(e.status)}">${e.status}</span></td>
    <td>${e.orderDate || '—'}</td>
    <td>${e.confirmDate || '—'}</td>
  </tr>
  ${isOpen ? `<tr class="expand-row"><td colspan="8"><div class="expand-body"><div class="expand-meta"><span><strong>Posted</strong> ${new Date(e.created).toLocaleString()}</span><span><strong>Score</strong> ${e.score}</span>${e.shippingDate ? `<span><strong>Shipped</strong> ${e.shippingDate}</span>` : ''}</div>${escapeHtml(body)}</div></td></tr>` : ''}
  `;
    }).join('');
  }

  document.getElementById('table-count').textContent = `${sorted.length} report${sorted.length === 1 ? '' : 's'}`;

  document.querySelectorAll('#data-table th').forEach(th => {
    const col = th.dataset.sort;
    const icon = th.querySelector('.sort-icon');
    if (!col) return;
    if (col === state.sort.column) {
      th.classList.add('sorted');
      if (icon) icon.textContent = state.sort.asc ? '↑' : '↓';
    } else {
      th.classList.remove('sorted');
      if (icon) icon.textContent = '↕';
    }
  });

  renderPagination(pageCount);
}

function renderPagination(pageCount) {
  const container = document.getElementById('pagination');
  if (pageCount <= 1) { container.innerHTML = ''; return; }
  const pages = [];
  const show = p => pages.push(`<button class="${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`);
  const windowSize = 5;
  let from = Math.max(1, state.page - Math.floor(windowSize / 2));
  let to = Math.min(pageCount, from + windowSize - 1);
  from = Math.max(1, to - windowSize + 1);
  if (from > 1) { show(1); if (from > 2) pages.push('<span class="ellipsis">…</span>'); }
  for (let p = from; p <= to; p++) show(p);
  if (to < pageCount) { if (to < pageCount - 1) pages.push('<span class="ellipsis">…</span>'); show(pageCount); }

  container.innerHTML = `
<div>Page ${state.page} of ${pageCount}</div>
<div class="pages">
  <button data-page="prev" ${state.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
  ${pages.join('')}
  <button data-page="next" ${state.page === pageCount ? 'disabled' : ''} aria-label="Next page">›</button>
</div>
  `;
}

// ── Table event wiring ─────────────────────────────────────────────────────
document.getElementById('pagination').addEventListener('click', ev => {
  const btn = ev.target.closest('button');
  if (!btn || btn.disabled) return;
  const filtered = getFiltered();
  const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (btn.dataset.page === 'prev') state.page = Math.max(1, state.page - 1);
  else if (btn.dataset.page === 'next') state.page = Math.min(pageCount, state.page + 1);
  else state.page = Number(btn.dataset.page);
  renderTable(filtered);
  // Scroll the table into view on mobile
  document.querySelector('.table-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#data-table tbody').addEventListener('click', ev => {
  const tr = ev.target.closest('tr.data-row');
  if (!tr) return;
  const key = tr.dataset.key;
  if (expandedRows.has(key)) expandedRows.delete(key); else expandedRows.add(key);
  renderTable(getFiltered());
});

document.querySelectorAll('#data-table th').forEach(th => {
  if (!th.dataset.sort) return;
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (state.sort.column === col) state.sort.asc = !state.sort.asc;
    else { state.sort.column = col; state.sort.asc = true; }
    renderTable(getFiltered());
  });
});

// ── Orchestrator ───────────────────────────────────────────────────────────
function renderAll() {
  renderPostInfo();
  renderFilterChips();
  const data = getFiltered();
  renderProgress(data);
  renderStats(data);
  renderCharts(data);
  renderTable(data);
}

async function init() {
  renderFilterChips();
  setLoadingStatus('Fetching Reddit data…');
  renderAll();
  try {
    const live = await loadLiveData();
    post = live.post;
    entries = live.entries;
    dataSource = 'live';
    setLoadingStatus('');
    expandedRows.clear();
    renderFilterChips();
    renderAll();
  } catch (error) {
    console.error(error);
    dataSource = 'failed';
    setLoadingStatus('');
    renderAll();
  }
}

init();
