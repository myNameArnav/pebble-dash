// ── Embedded Parsed Data ───────────────────────────────────────────────────
const DATA = { "post": { "title": "Shipping Mega Thread", "created": null, "score": 0, "numComments": 0 }, "entries": [] };
function toTitleCase(value) {
  return value.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function cleanBodyText(body) {
  return String(body || '')
    .replace(/[*_~`>#()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLines(body) {
  return String(body || '')
    .split('\n')
    .map(line => line.replace(/[*_~`>#()[\]]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeCountry(value) {
  const v = String(value || '').trim().toLowerCase();
  const aliases = {
    // US / UK
    us: 'US', usa: 'US', 'united states': 'US', 'united states of america': 'US',
    uk: 'UK', 'united kingdom': 'UK', 'england': 'UK', 'great britain': 'UK',
    scotland: 'UK', wales: 'UK', 'northern ireland': 'UK',
    // Abbreviations
    uae: 'UAE', 'united arab emirates': 'UAE',
    dprk: 'North Korea', drc: 'DR Congo', 'democratic republic of the congo': 'DR Congo',
    // Alternative names
    holland: 'Netherlands', czechia: 'Czech Republic',
    burma: 'Myanmar', swaziland: 'Eswatini',
    'cape verde': 'Cabo Verde', 'east timor': 'Timor-Leste',
    vatican: 'Vatican City', 'holy see': 'Vatican City',
    "côte d'ivoire": 'Ivory Coast', macedonia: 'North Macedonia',
    // Common short forms
    antigua: 'Antigua and Barbuda', 'antigua & barbuda': 'Antigua and Barbuda',
    bosnia: 'Bosnia and Herzegovina',
    'st kitts': 'Saint Kitts and Nevis', 'st kitts and nevis': 'Saint Kitts and Nevis',
    'saint kitts': 'Saint Kitts and Nevis',
    'st lucia': 'Saint Lucia',
    'st vincent': 'Saint Vincent and the Grenadines',
    'st vincent and the grenadines': 'Saint Vincent and the Grenadines',
    trinidad: 'Trinidad and Tobago', 'trinidad & tobago': 'Trinidad and Tobago',
    'sao tome': 'Sao Tome and Principe',
    papua: 'Papua New Guinea', 'the gambia': 'Gambia',
  };
  return aliases[v] || toTitleCase(v);
}

function inferCountry(entry, lines, text) {
  if (entry.country && entry.country !== 'Unknown') return entry.country;

  const countryPatterns = [
    /\b(?:location|region|country|delivery to|shipping to|ship to)\s*[:\-]?\s*([A-Za-z][A-Za-z .-]{1,40})\b/i,
    /\b(?:europe\s*-\s*)?([A-Za-z][A-Za-z .-]{1,40})\b/
  ];
  const countryNames = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
    'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
    'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
    'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
    'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile',
    'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'DR Congo',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
    'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
    'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
    'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
    'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
    'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo',
    'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
    'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
    'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives',
    'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
    'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
    'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
    'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
    'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
    'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
    'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
    'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
    'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
    'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
    'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
    'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
    'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand',
    'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia',
    'Turkey', 'Turkmenistan', 'Tuvalu', 'UAE', 'UK',
    'US', 'Uganda', 'Ukraine', 'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen',
    'Zambia', 'Zimbabwe'
  ];

  for (const line of lines) {
    for (const pattern of countryPatterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const value = match[1].trim().replace(/[.,]+$/, '');
      if (countryNames.some(name => new RegExp(`^${name}$`, 'i').test(value))) {
        return normalizeCountry(value);
      }
    }
    if (countryNames.some(name => new RegExp(`^${name}$`, 'i').test(line))) {
      return normalizeCountry(line);
    }
  }

  for (const name of countryNames) {
    if (new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\b`, 'i').test(text)) {
      return normalizeCountry(name);
    }
  }
  return entry.country || 'Unknown';
}

function inferDevice(entry, text) {
  if (/\b(?:pebble\s+duo\s*2|pebble\s+time\s+duo\s*2|p2d|duo\s*2|core\s+2\s+duo|c2d)\b/i.test(text)) return 'Pebble Duo 2';
  if (/\b(?:pebble\s+time\s+2|pt2|time\s+2)\b/i.test(text)) return 'Pebble Time 2';
  if (/\b(?:pebble\s+round|round\s*2|pr2)\b/i.test(text)) return 'Pebble Round';
  if (/\b(?:pebble\s+index|index\s*0?1|\bindex\b)\b/i.test(text)) return 'Pebble Index';
  if (entry.device && entry.device !== 'Unknown') {
    if (/time\s+2/i.test(entry.device)) return 'Pebble Time 2';
    if (/duo/i.test(entry.device) || /core\s+2/i.test(entry.device)) return 'Pebble Duo 2';
    if (/round/i.test(entry.device)) return 'Pebble Round';
    if (/index/i.test(entry.device)) return 'Pebble Index';
  }
  return 'Unknown';
}

function inferColor(entry, text) {
  const source = `${entry.color && entry.color !== 'Unknown' ? entry.color + ' ' : ''}${text}`;
  const patterns = [
    [/black\s*[\/-]?\s*(?:grey|gray)|(?:grey|gray)\s*[\/-]?\s*black|black\s*[\/-]?\s*black|\bblack\s+watch\b|\bblack\b(?!\s*(?:\/|-)?\s*(?:red|blue))/i, 'Black/Grey'],
    [/black\s*[\/-]?\s*blue|blue\s*[\/-]?\s*black|silver\s*[\/-]?\s*blue|blue\s*[\/-]?\s*silver/i, 'Black/Blue'],
    [/black\s*[\/-]?\s*red|red\s*[\/-]?\s*black|silver\s*[\/-]?\s*red|red\s*[\/-]?\s*silver/i, 'Black/Red'],
    [/silver\s*[\/-]?\s*(?:grey|gray)|(?:grey|gray)\s*[\/-]?\s*silver|gray\s+silver|\bwhite\b|\bsilver\b/i, 'Silver']
  ];
  for (const [pattern, value] of patterns) {
    if (pattern.test(source)) return value;
  }
  return entry.color || 'Unknown';
}

function inferBatch(entry, text) {
  if (entry.batch && entry.batch !== 'Unknown') return entry.batch;
  const match = text.match(/\bbatch\s*([1-5])\b/i);
  return match ? `Batch ${match[1]}` : (entry.batch || 'Unknown');
}

function parseDateString(value) {
  if (!value) return null;
  const cleaned = String(value)
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/[@,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const numeric = cleaned.match(/\b(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (numeric) {
    let a = Number(numeric[1]);
    let b = Number(numeric[2]);
    let c = Number(numeric[3]);
    if (c < 100) c += c >= 70 ? 1900 : 2000;
    let year;
    let month;
    let day;
    if (numeric[1].length === 4) {
      year = a;
      month = b;
      day = c;
    } else if (a > 12) {
      day = a;
      month = b;
      year = c;
    } else if (b > 12) {
      month = a;
      day = b;
      year = c;
    } else {
      return null;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthMap = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };
  const monthFirst = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+(\d{2,4})/i);
  const dayFirst = cleaned.match(/\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?,?\s*(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{2,4})/i);
  const parts = monthFirst
    ? { month: monthMap[monthFirst[1].toLowerCase()], day: Number(monthFirst[2]), year: Number(monthFirst[3]) }
    : dayFirst
      ? { month: monthMap[dayFirst[2].toLowerCase()], day: Number(dayFirst[1]), year: Number(dayFirst[3]) }
      : null;
  if (parts) {
    const year = parts.year < 100 ? parts.year + (parts.year >= 70 ? 1900 : 2000) : parts.year;
    if (parts.month >= 1 && parts.month <= 12 && parts.day >= 1 && parts.day <= 31) {
      return `${year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    }
  }
  return null;
}

function extractDateFromLines(lines, patterns) {
  for (const line of lines) {
    if (!patterns.some(pattern => pattern.test(line))) continue;
    const parsed = parseDateString(line);
    if (parsed) return parsed;
  }
  return null;
}

function inferStatus(entry, lines, text, confirmDate, shippingDate) {
  const waitingPatterns = [
    /\bno shipping email yet\b/i,
    /\bno shipping notification yet\b/i,
    /\bno confirmation email\b/i,
    /\bno email yet\b/i,
    /\bstill no email\b/i,
    /\bnot yet shipped\b/i,
    /\bnot shipped\b/i,
    /\bshipping tbd\b/i,
    /\bno communication yet\b/i,
    /\bwaiting\b/i
  ];
  if (waitingPatterns.some(pattern => pattern.test(text))) return 'Waiting';
  if (shippingDate) return 'Shipped';
  if (/\b(?:shipping label created|shipment notification|tracking number|out for delivery|delivered|in transit|your watch has shipped|shipping email received|shipped on)\b/i.test(text)) {
    return 'Shipped';
  }
  if (confirmDate) return 'Confirmed';
  if (/\b(?:confirmation email|confirm email|confirmation received|order confirmation|address confirmed|color confirmed|colour confirmed|complete your order|finalize order|confirm choices|received.*email)\b/i.test(text)) {
    return 'Confirmed';
  }
  return entry.status || 'Unknown';
}

function normalizeEntry(entry) {
  const lines = cleanLines(entry.body);
  const text = cleanBodyText(entry.body);

  const orderDate = entry.orderDate || extractDateFromLines(lines, [
    /\border(?:ed| date| time| date\/time)?\b/i,
    /\bpre-?order(?:ed)?\b/i
  ]);
  const confirmDate = entry.confirmDate || extractDateFromLines(lines, [
    /\bconfirm/i,
    /\bconfirmation\b/i,
    /\bcomplete your order\b/i,
    /\bfinalize order\b/i
  ]);
  const shippingDate = entry.shippingDate || extractDateFromLines(lines, [
    /\bshipping\b/i,
    /\bshipment\b/i,
    /\bshipped\b/i,
    /\btracking\b/i,
    /\bdelivered\b/i
  ]);

  return {
    ...entry,
    device: inferDevice(entry, text),
    color: inferColor(entry, text),
    country: inferCountry(entry, lines, text),
    batch: inferBatch(entry, text),
    orderDate,
    confirmDate,
    shippingDate,
    status: inferStatus(entry, lines, text, confirmDate, shippingDate)
  };
}

function isLikelyReport(entry) {
  const hasTimelineSignal = Boolean(
    entry.orderDate ||
    entry.confirmDate ||
    entry.shippingDate ||
    entry.status !== 'Unknown' ||
    entry.batch !== 'Unknown'
  );
  const hasDescriptorSignal = Boolean(
    entry.device !== 'Unknown' ||
    entry.color !== 'Unknown' ||
    entry.country !== 'Unknown'
  );
  return hasTimelineSignal && hasDescriptorSignal;
}

const THREAD_URL = 'https://www.reddit.com/r/pebble/comments/1sjk3c7/shipping_mega_thread';
const THREAD_JSON_URL = `${THREAD_URL}.json`;
const REDDIT_PAGE_DELAY_MS = 1000;

let entries = DATA.entries.map(normalizeEntry);
let post = DATA.post;
let dataSource = 'loading';

// ── Color Palette ──────────────────────────────────────────────────────────
const colors = {
  status: { Shipped: '#69DB7C', Confirmed: '#74C0FC', Waiting: '#FFA94D', Unknown: '#8888aa' },
  choropleth: ['#4ECDC4', '#74C0FC', '#B197FC', '#F783AC', '#FFA94D', '#69DB7C', '#FFD43B', '#FF6B6B', '#a0e7e5', '#c4b5fd', '#fbbf24', '#fb7185'],
  batch: { 'Batch 1': '#4ECDC4', 'Batch 2': '#B197FC', 'Batch 3': '#FFA94D', 'Batch 4': '#F783AC', 'Batch 5': '#FF6B6B' },
  device: { 'Pebble Duo 2': '#FFA94D', 'Pebble Time 2': '#4ECDC4', 'Pebble Round': '#74C0FC', 'Pebble Index': '#B197FC', 'Unknown': '#8888aa' },
  colorVar: { 'Black/Grey': '#555', 'Silver': '#c0c0c0', 'Black/Blue': '#4DABF7', 'Black/Red': '#FF6B6B', 'Unknown': '#666' }
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
  filters: { status: 'All', batch: 'All', device: 'All' },
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
// almost always more informative than their earlier one. When the same
// author posts multiple top-level reports, prefer the most advanced status,
// breaking ties by recency, then by score.
const STATUS_RANK = { Shipped: 3, Confirmed: 2, Waiting: 1, Unknown: 0 };

function compareEntries(a, b) {
  const rankDiff = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0);
  if (rankDiff !== 0) return rankDiff;
  const aTime = a.created ? Date.parse(a.created) : 0;
  const bTime = b.created ? Date.parse(b.created) : 0;
  if (aTime !== bTime) return aTime - bTime;
  return (a.score || 0) - (b.score || 0);
}

function dedupeByAuthor(entries) {
  const byAuthor = new Map();
  for (const entry of entries) {
    const existing = byAuthor.get(entry.author);
    if (!existing || compareEntries(entry, existing) > 0) {
      byAuthor.set(entry.author, entry);
    }
  }
  return [...byAuthor.values()];
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
  const dedupedEntries = dedupeByAuthor(parsedEntries);
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
    const payload = await fetchRedditPage(after);
    if (!Array.isArray(payload) || payload.length < 2 || !payload[1]?.data) {
      throw new Error('Unexpected Reddit comments payload');
    }
    if (!firstPayload) firstPayload = payload;
    children.push(...(payload[1].data.children || []));
    after = payload[1].data.after || null;
  } while (after);

  if (firstPayload?.[1]?.data) {
    firstPayload[1].data.children = children;
    firstPayload[1].data.after = null;
  }
  return firstPayload;
}

async function loadLiveData() {
  const payload = await fetchAllTopLevelCommentPages();
  return parseRedditThread(payload);
}

// ── Post info ──────────────────────────────────────────────────────────────
function renderPostInfo() {
  const parts = ['r/pebble'];
  if (post && post.created) parts.push(`posted ${new Date(post.created).toLocaleDateString()}`);
  parts.push(`${entries.length} reports ingested`);
  parts.push(dataSource === 'live' ? 'live from Reddit' : dataSource === 'loading' ? 'loading…' : 'offline');
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
  const colorKeys = ['Black/Grey', 'Silver', 'Black/Blue', 'Black/Red', 'Unknown'];
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
  const groupByDate = field => {
    const days = {};
    data.forEach(e => { if (!e[field]) return; const d = e[field].split('T')[0]; days[d] = (days[d] || 0) + 1; });
    return days;
  };
  const ordersByDay = groupByDate('orderDate');
  const confirmsByDay = groupByDate('confirmDate');
  const shipsByDay = groupByDate('shippingDate');
  const allDates = new Set([...Object.keys(ordersByDay), ...Object.keys(confirmsByDay), ...Object.keys(shipsByDay)]);
  const sortedDates = [...allDates].sort();
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
  const counts = {};
  entries.forEach(e => { counts[e[key]] = (counts[e[key]] || 0) + 1; });
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
  state.filters = { status: 'All', batch: 'All', device: 'All' };
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
  const data = getFiltered();
  renderProgress(data);
  renderStats(data);
  renderCharts(data);
  renderTable(data);
}

async function init() {
  renderFilterChips();
  renderAll();
  try {
    const live = await loadLiveData();
    post = live.post;
    entries = live.entries;
    dataSource = 'live';
    expandedRows.clear();
    renderFilterChips();
    renderAll();
  } catch (error) {
    console.error(error);
    dataSource = 'failed';
    renderAll();
  }
}

init();
