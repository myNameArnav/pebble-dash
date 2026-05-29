// ── Embedded Parsed Data ───────────────────────────────────────────────────
const DATA = { "post": { "title": "Shipping Mega Thread", "created": null, "score": 0, "numComments": 0 }, "entries": [] };

const DATA_API_URL = window.PEBBLE_DATA_API_URL || '/api/reports';

let entries = DATA.entries;
let post = DATA.post;
let dataSource = 'loading';
let loadingMessage = '';
let dataGeneratedAt = null;

// ── Color Palette ──────────────────────────────────────────────────────────
const colors = {
  status: { Delivered: '#4ECDC4', Shipped: '#69DB7C', Confirmed: '#74C0FC', Waiting: '#FFA94D', Unknown: '#8888aa' },
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
  pageSize: window.matchMedia('(max-width: 720px)').matches ? 10 : 20,
};
const charts = {};
const expandedRows = new Set();
const compactViewport = window.matchMedia('(max-width: 720px)');
const filterControls = document.getElementById('filter-controls');
const filterToggle = document.getElementById('filter-toggle');
const filterActiveCount = document.getElementById('filter-active-count');
const filterReset = document.getElementById('filter-reset');

compactViewport.addEventListener('change', ev => {
  state.pageSize = ev.matches ? 10 : 20;
  state.page = 1;
  if (!ev.matches) {
    filterControls?.classList.remove('open');
    filterToggle?.setAttribute('aria-expanded', 'false');
  }
  renderAll();
});

function formatTaxDisplay(amount, currency) {
  if (!Number.isFinite(amount)) return null;
  const formatted = `$${amount.toLocaleString('en-US', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  return currency && currency !== 'USD' ? `${formatted} ${currency}` : formatted;
}

function normalizeTaxFields(entry) {
  const taxAmount = Number.isFinite(entry.taxAmount) ? entry.taxAmount : null;
  const taxCurrency = taxAmount == null ? null : (entry.taxCurrency || 'USD');
  const taxDisplay = entry.taxDisplay || entry.tax || (taxAmount == null ? null : formatTaxDisplay(taxAmount, taxCurrency));
  return { ...entry, taxAmount, taxCurrency, taxDisplay, tax: taxDisplay };
}

function enrichEntries(rawEntries) {
  return rawEntries.map(normalizeTaxFields);
}

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

function setLoadingStatus(message) {
  loadingMessage = message;
  const el = document.getElementById('loading-status');
  const text = document.getElementById('loading-status-text');
  if (!el || !text) return;
  el.hidden = !message;
  text.textContent = message || '';
}

async function loadParsedData() {
  const response = await fetch(DATA_API_URL, {
    headers: { Accept: 'application/json' },
    cache: 'default'
  });
  if (!response.ok) {
    throw new Error(`Data API failed: ${response.status}`);
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.entries) || !data.post) {
    throw new Error('Data API returned an unexpected payload');
  }
  return data;
}

// ── Post info ──────────────────────────────────────────────────────────────
function renderPostInfo() {
  const parts = ['r/pebble'];
  if (post && post.created) parts.push(`posted ${new Date(post.created).toLocaleDateString()}`);
  parts.push(`${entries.length} reports ingested`);
  if (dataSource === 'live') {
    parts.push(dataGeneratedAt ? `last refreshed at ${new Date(dataGeneratedAt).toLocaleString()}` : 'live data loaded');
  } else {
    parts.push(dataSource === 'loading' ? (loadingMessage || 'fetching parsed data...') : 'offline');
  }
  document.getElementById('post-info').textContent = parts.join(' · ');
}

// ── Progress bar ───────────────────────────────────────────────────────────
function renderProgress(data) {
  const total = data.length;
  const delivered = data.filter(e => e.status === 'Delivered').length;
  const shipped = data.filter(e => e.status === 'Shipped').length;
  const confirmed = data.filter(e => e.status === 'Confirmed').length;
  const waiting = data.filter(e => e.status === 'Waiting').length;
  const pct = n => total ? (n / total * 100) : 0;
  const bar = document.getElementById('progress-bar');
  bar.children[0].style.width = pct(delivered) + '%';
  bar.children[1].style.width = pct(shipped) + '%';
  bar.children[2].style.width = pct(confirmed) + '%';
  bar.children[3].style.width = pct(waiting) + '%';
  const done = delivered + shipped + confirmed;
  document.getElementById('progress-label').innerHTML =
    `<strong>${done}</strong> of <strong>${total}</strong> past confirmation (${Math.round(pct(done))}%)`;
}

// ── Stat cards ─────────────────────────────────────────────────────────────
function renderStats(data) {
  const delivered = data.filter(e => e.status === 'Delivered').length;
  const shipped = data.filter(e => e.status === 'Shipped').length;
  const confirmed = data.filter(e => e.status === 'Confirmed').length;
  const waiting = data.filter(e => e.status === 'Waiting').length;
  const countries = new Set(data.map(e => e.country).filter(c => c !== 'Unknown')).size;
  const devices = new Set(data.map(e => e.device).filter(d => d !== 'Unknown')).size;
  const deliveredRate = data.length ? Math.round((delivered / data.length) * 100) : 0;
  const shipRate = data.length ? Math.round(((delivered + shipped) / data.length) * 100) : 0;

  const cards = [
    { value: data.length, label: 'Reports', hint: 'matching filters', color: 'var(--accent)' },
    { value: delivered, label: 'Delivered', hint: `${deliveredRate}% of reports`, color: 'var(--accent)' },
    { value: shipped, label: 'Shipped', hint: `${shipRate}% shipped+`, color: 'var(--green)' },
    { value: confirmed, label: 'Confirmed', hint: 'awaiting label', color: 'var(--blue)' },
    { value: waiting, label: 'Waiting', hint: 'no email yet', color: 'var(--orange)' },
    { value: countries, label: 'Countries', hint: `${devices} device models`, color: 'var(--purple)' },
  ];
  document.getElementById('stat-cards').innerHTML = cards.map(c =>
    `<div class="stat-card" style="--stat-color:${c.color}"><div class="label">${c.label}</div><div class="value">${c.value}</div><div class="hint">${c.hint}</div></div>`
  ).join('');
}

// ── Insight panels ─────────────────────────────────────────────────────────
function statusCounts(data) {
  return data.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});
}

function dateKey(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function dayStartMs(value) {
  const key = dateKey(value);
  if (!key) return null;
  const time = Date.parse(`${key}T00:00:00.000Z`);
  return Number.isFinite(time) ? time : null;
}

function referenceTime() {
  const generated = dataGeneratedAt ? Date.parse(dataGeneratedAt) : NaN;
  return Number.isFinite(generated) ? generated : Date.now();
}

function countSince(data, field, sinceMs) {
  return data.filter(entry => {
    const time = dayStartMs(entry[field]);
    return Number.isFinite(time) && time >= sinceMs;
  }).length;
}

function renderBatchProgress(data) {
  const container = document.getElementById('batch-progress');
  const batches = ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5']
    .map(batch => {
      const rows = data.filter(entry => entry.batch === batch);
      const counts = statusCounts(rows);
      const delivered = counts.Delivered || 0;
      const shipped = counts.Shipped || 0;
      const confirmed = counts.Confirmed || 0;
      const waiting = counts.Waiting || 0;
      const done = delivered + shipped + confirmed;
      return {
        batch,
        rows,
        counts,
        delivered,
        shipped,
        confirmed,
        waiting,
        done,
        donePct: rows.length ? Math.round(done / rows.length * 100) : 0
      };
    })
    .filter(item => item.rows.length);

  if (!batches.length) {
    container.innerHTML = '<div class="insight-empty">No batch data for these filters.</div>';
    return;
  }

  container.innerHTML = batches.map(({ batch, rows, delivered, shipped, confirmed, waiting, done, donePct }) => {
    const other = rows.length - delivered - shipped - confirmed - waiting;
    const pct = count => rows.length ? (count / rows.length * 100) : 0;
    return `
      <div class="batch-row">
        <div class="batch-row-head">
          <span>${batch}</span>
          <strong>${donePct}%</strong>
        </div>
        <div class="mini-progress" aria-label="${batch}: ${donePct}% past confirmation">
          <span class="mini-seg delivered" style="width:${pct(delivered)}%"></span>
          <span class="mini-seg shipped" style="width:${pct(shipped)}%"></span>
          <span class="mini-seg confirmed" style="width:${pct(confirmed)}%"></span>
          <span class="mini-seg waiting" style="width:${pct(waiting)}%"></span>
          <span class="mini-seg unknown" style="width:${pct(other)}%"></span>
        </div>
        <div class="batch-row-meta">
          <span>${rows.length} reports</span>
          <span>${delivered} delivered</span>
          <span>${shipped} shipped</span>
          <span>${confirmed} confirmed</span>
          <span>${waiting} waiting</span>
        </div>
      </div>
    `;
  }).join('');
}

function daysBetween(start, end) {
  const startMs = dayStartMs(start);
  const endMs = dayStartMs(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return (endMs - startMs) / (24 * 60 * 60 * 1000);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function recentMovementDays(data) {
  const now = referenceTime();
  const today = new Date(now);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const weekAgo = todayUtc - 6 * dayMs;
  return Array.from({ length: 7 }, (_, index) => {
    const time = weekAgo + index * dayMs;
    const key = new Date(time).toISOString().slice(0, 10);
    const shipped = data.filter(entry => dateKey(entry.shippingDate) === key).length;
    const confirmed = data.filter(entry => dateKey(entry.confirmDate) === key).length;
    const label = new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short' });
    return { key, label, shipped, confirmed };
  });
}

function renderInsights(data) {
  renderBatchProgress(data);
}

// ── Chart factories ────────────────────────────────────────────────────────
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }

function chartStatus(data) {
  destroyChart('status');
  const counts = {};
  data.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
  const order = ['Delivered', 'Shipped', 'Confirmed', 'Waiting', 'Unknown'].filter(k => counts[k]);
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
  const deliveriesByDay = {};
  data.forEach(e => {
    if (e.status !== 'Delivered') return;
    const d = normalizeChartDate(e.shippingDate || e.created);
    if (!d) return;
    deliveriesByDay[d] = (deliveriesByDay[d] || 0) + 1;
  });
  const allDates = new Set([...Object.keys(ordersByDay), ...Object.keys(confirmsByDay), ...Object.keys(shipsByDay), ...Object.keys(deliveriesByDay)]);
  const sortedDates = [...allDates].sort((a, b) => Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  let o = 0, c = 0, s = 0, delivered = 0;
  const cumO = [], cumC = [], cumS = [], cumD = [];
  sortedDates.forEach(d => {
    o += ordersByDay[d] || 0;
    c += confirmsByDay[d] || 0;
    s += shipsByDay[d] || 0;
    delivered += deliveriesByDay[d] || 0;
    cumO.push(o); cumC.push(c); cumS.push(s); cumD.push(delivered);
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
        { label: 'Delivered', data: cumD, borderColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.08)', tension: 0.35, fill: false, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
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

function chartMomentum(data) {
  destroyChart('momentum');
  const days = recentMovementDays(data);
  charts.momentum = new Chart(document.getElementById('chartMomentum'), {
    type: 'bar',
    data: {
      labels: days.map(day => day.label),
      datasets: [
        {
          label: 'Confirmed',
          data: days.map(day => day.confirmed),
          backgroundColor: 'rgba(116,192,252,0.72)',
          borderRadius: 4,
        },
        {
          label: 'Shipped',
          data: days.map(day => day.shipped),
          backgroundColor: 'rgba(105,219,124,0.78)',
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            title: items => days[items[0].dataIndex]?.key || '',
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8888aa' } },
        y: { grid: { color: '#26263f' }, ticks: { color: '#8888aa', precision: 0 }, title: { display: true, text: 'Reports', color: '#7878a0', font: { size: 10 } } }
      }
    }
  });
}

function chartCycleTime(data) {
  destroyChart('cycleTime');
  const steps = [
    {
      label: 'Order → Confirm',
      values: data.map(entry => daysBetween(entry.orderDate, entry.confirmDate)).filter(Number.isFinite),
      color: '#74C0FC'
    },
    {
      label: 'Confirm → Ship',
      values: data.map(entry => daysBetween(entry.confirmDate, entry.shippingDate)).filter(Number.isFinite),
      color: '#69DB7C'
    },
    {
      label: 'Ship → Deliver',
      values: data
        .filter(entry => entry.status === 'Delivered')
        .map(entry => daysBetween(entry.shippingDate, entry.created))
        .filter(Number.isFinite),
      color: '#4ECDC4'
    }
  ].map(step => ({ ...step, avg: average(step.values) || 0 }));

  charts.cycleTime = new Chart(document.getElementById('chartCycleTime'), {
    type: 'bar',
    data: {
      labels: steps.map(step => step.label),
      datasets: [{
        label: 'Average days',
        data: steps.map(step => step.avg),
        backgroundColor: steps.map(step => step.color),
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const step = steps[ctx.dataIndex];
              return ` ${Math.round(step.avg)} days avg from ${step.values.length} report${step.values.length === 1 ? '' : 's'}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#26263f' },
          ticks: { color: '#8888aa', callback: value => `${value}d` },
          title: { display: true, text: 'Average days', color: '#7878a0', font: { size: 10 } }
        },
        y: { grid: { display: false }, ticks: { color: '#8888aa' } }
      }
    }
  });
}

function renderCharts(data) {
  chartStatus(data);
  chartDeviceColor(data);
  chartCountries(data);
  chartTimeline(data);
  chartMomentum(data);
  chartCycleTime(data);
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
  buildChips('filter-status', 'status', 'Status', ['Delivered', 'Shipped', 'Confirmed', 'Waiting', 'Unknown']);
  buildChips('filter-batch', 'batch', 'Batch', ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5']);
  buildChips('filter-color', 'color', 'Color', ['Black/Grey', 'Silver/Grey', 'Black/Red', 'Silver/Blue']);
  buildChips('filter-device', 'device', 'Device', ['Pebble Duo 2', 'Pebble Time 2', 'Pebble Round', 'Pebble Index']);
  buildChips('filter-continent', 'continent', 'Continent', ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']);
  updateFilterSummary();
}

function activeFilterCount() {
  return Object.values(state.filters).filter(value => value !== 'All').length + (state.search.trim() ? 1 : 0);
}

function updateFilterSummary() {
  const count = activeFilterCount();
  if (filterActiveCount) {
    filterActiveCount.hidden = count === 0;
    filterActiveCount.textContent = String(count);
  }
  filterReset?.toggleAttribute('data-empty', count === 0);
}

filterToggle?.addEventListener('click', () => {
  const open = !filterControls.classList.contains('open');
  filterControls.classList.toggle('open', open);
  filterToggle.setAttribute('aria-expanded', String(open));
  if (open && compactViewport.matches) {
    filterControls.scrollTop = 0;
    document.querySelector('.filter-bar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// ── Search (debounced) ────────────────────────────────────────────────────
let searchTimer;
document.getElementById('search-input').addEventListener('input', ev => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = ev.target.value;
    state.page = 1;
    updateFilterSummary();
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
  filterControls?.classList.remove('open');
  filterToggle?.setAttribute('aria-expanded', 'false');
  updateFilterSummary();
  renderAll();
});

// ── Table helpers ──────────────────────────────────────────────────────────
const badgeClass = s => ({ Delivered: 'badge-delivered', Shipped: 'badge-shipped', Confirmed: 'badge-confirmed', Waiting: 'badge-waiting', Unknown: 'badge-unknown' }[s] || 'badge-unknown');
const batchClass = b => ({ 'Batch 1': 'badge-batch1', 'Batch 2': 'badge-batch2', 'Batch 3': 'badge-batch3', 'Batch 4': 'badge-batch4', 'Batch 5': 'badge-batch5' }[b] || '');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sourceLink(entry) {
  if (!entry.permalink) return '';
  const url = escapeHtml(entry.permalink);
  return `<a class="source-link" href="${url}" target="_blank" rel="noopener">Source</a>`;
}

function orderedSortValue(entry) {
  return entry.orderDateTime || (entry.orderDate ? `${entry.orderDate} 00:00` : null);
}

function confirmedSortValue(entry) {
  return entry.confirmDateTime || (entry.confirmDate ? `${entry.confirmDate} 00:00` : null);
}

function displayOrderedDate(entry) {
  return (entry.orderDateTime || entry.orderDate || '—').replace(/\s+UTC$/, '');
}

function displayConfirmedDate(entry) {
  return (entry.confirmDateTime || entry.confirmDate || '—').replace(/\s+UTC$/, '');
}

function sortData(data) {
  const { column, asc } = state.sort;
  const dir = asc ? 1 : -1;
  return [...data].sort((a, b) => {
    const av = column === 'orderDate' ? orderedSortValue(a) : column === 'confirmDate' ? confirmedSortValue(a) : a[column];
    const bv = column === 'orderDate' ? orderedSortValue(b) : column === 'confirmDate' ? confirmedSortValue(b) : b[column];
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
    tbody.innerHTML = `<tr><td colspan="9" data-label=""><div class="empty"><div class="empty-icon">∅</div>No reports match these filters.<br>Try clearing some to see more.</div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(e => {
      const k = keyOf(e);
      const isOpen = expandedRows.has(k);
      const body = e.body ? e.body.trim() : '(no body)';
      const source = sourceLink(e);
      return `
  <tr class="data-row${isOpen ? ' expanded' : ''}" data-key="${escapeHtml(k)}">
    <td data-label="Author">${escapeHtml(e.author)}</td>
    <td data-label="Device">${escapeHtml(e.device)}</td>
    <td data-label="Color">${escapeHtml(e.color)}</td>
    <td data-label="Country">${escapeHtml(e.country)}</td>
    <td data-label="Batch">${e.batch !== 'Unknown' ? `<span class="badge ${batchClass(e.batch)}">${e.batch}</span>` : '<span class="badge badge-unknown">Unknown</span>'}</td>
    <td data-label="Status"><span class="badge ${badgeClass(e.status)}">${e.status}</span></td>
    <td data-label="Ordered">${escapeHtml(displayOrderedDate(e))}</td>
    <td data-label="Confirmed">${escapeHtml(displayConfirmedDate(e))}</td>
    <td data-label="Tax">${escapeHtml(e.taxDisplay || '—')}</td>
  </tr>
  ${isOpen ? `<tr class="expand-row"><td colspan="9" data-label=""><div class="expand-body"><div class="expand-meta"><span><strong>Posted</strong> ${new Date(e.created).toLocaleString()}</span><span><strong>Score</strong> ${e.score}</span>${e.shippingDate ? `<span><strong>Shipped</strong> ${(e.shippingDateTime || e.shippingDate).replace(/\s+UTC$/, '')}</span>` : ''}${e.taxDisplay ? `<span><strong>Tax</strong> ${escapeHtml(e.taxDisplay)}</span>` : ''}${source ? `<span>${source}</span>` : ''}</div>${escapeHtml(body)}</div></td></tr>` : ''}
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
  renderInsights(data);
  renderCharts(data);
  renderTable(data);
}

async function init() {
  renderFilterChips();
  setLoadingStatus('Fetching parsed data...');
  renderAll();
  try {
    const live = await loadParsedData();
    post = live.post;
    entries = enrichEntries(live.entries);
    dataGeneratedAt = live.generatedAt || null;
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
