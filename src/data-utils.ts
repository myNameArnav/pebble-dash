import type { Entry, DataPayload } from "./types";

export const INITIAL_DATA: DataPayload = {
  post: { title: "Shipping Mega Thread", created: null, score: 0, numComments: 0 },
  entries: [],
};

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanBodyText(body: string | null | undefined): string {
  return String(body || "")
    .replace(/[*_~`>#()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLines(body: string | null | undefined): string[] {
  return String(body || "")
    .split("\n")
    .map((line) =>
      line.replace(/[*_~`>#()[\]]/g, " ").replace(/\s+/g, " ").trim()
    )
    .filter(Boolean);
}

function normalizeCountry(value: string | null | undefined): string {
  const v = String(value || "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    us: "US",
    usa: "US",
    "united states": "US",
    "united states of america": "US",
    uk: "UK",
    "united kingdom": "UK",
    england: "UK",
    "great britain": "UK",
    scotland: "UK",
    wales: "UK",
    "northern ireland": "UK",
    uae: "UAE",
    "united arab emirates": "UAE",
    dprk: "North Korea",
    drc: "DR Congo",
    "democratic republic of the congo": "DR Congo",
    holland: "Netherlands",
    czechia: "Czech Republic",
    burma: "Myanmar",
    swaziland: "Eswatini",
    "cape verde": "Cabo Verde",
    "east timor": "Timor-Leste",
    vatican: "Vatican City",
    "holy see": "Vatican City",
    "côte d'ivoire": "Ivory Coast",
    macedonia: "North Macedonia",
    antigua: "Antigua and Barbuda",
    "antigua & barbuda": "Antigua and Barbuda",
    bosnia: "Bosnia and Herzegovina",
    "st kitts": "Saint Kitts and Nevis",
    "st kitts and nevis": "Saint Kitts and Nevis",
    "saint kitts": "Saint Kitts and Nevis",
    "st lucia": "Saint Lucia",
    "st vincent": "Saint Vincent and the Grenadines",
    "st vincent and the grenadines": "Saint Vincent and the Grenadines",
    trinidad: "Trinidad and Tobago",
    "trinidad & tobago": "Trinidad and Tobago",
    "sao tome": "Sao Tome and Principe",
    papua: "Papua New Guinea",
    "the gambia": "Gambia",
  };
  return aliases[v] || toTitleCase(v);
}

function inferCountry(entry: Partial<Entry>, lines: string[], text: string): string {
  if (entry.country && entry.country !== "Unknown") return entry.country;

  const countryPatterns = [
    /\b(?:location|region|country|delivery to|shipping to|ship to)\s*[:-]?\s*([A-Za-z][A-Za-z .-]{1,40})\b/i,
    /\b(?:europe\s*-\s*)?([A-Za-z][A-Za-z .-]{1,40})\b/i,
  ];
  const countryNames = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
    "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
    "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
    "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
    "Cameroon", "Canada", "Central African Republic", "Chad", "Chile",
    "China", "Colombia", "Comoros", "Congo", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Czech Republic", "DR Congo",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
    "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
    "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
    "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
    "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
    "India", "Indonesia", "Iran", "Iraq", "Ireland",
    "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
    "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo",
    "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
    "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
    "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives",
    "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
    "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
    "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
    "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
    "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman", "Pakistan", "Palau", "Palestine", "Panama",
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
    "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
    "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
    "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
    "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "UAE", "UK",
    "US", "Uganda", "Ukraine", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
    "Zambia", "Zimbabwe",
  ];

  for (const line of lines) {
    for (const pattern of countryPatterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const value = match[1].trim().replace(/[.,]+$/, "");
      if (countryNames.some((name) => new RegExp(`^${name}$`, "i").test(value))) {
        return normalizeCountry(value);
      }
    }
    if (countryNames.some((name) => new RegExp(`^${name}$`, "i").test(line))) {
      return normalizeCountry(line);
    }
  }

  for (const name of countryNames) {
    if (new RegExp(`\\b${name.replace(/ /g, "\\s+")}\\b`, "i").test(text)) {
      return normalizeCountry(name);
    }
  }
  return entry.country || "Unknown";
}

function inferDevice(entry: Partial<Entry>, text: string): string {
  if (/\b(?:pebble\s+duo\s*2|pebble\s+time\s+duo\s*2|p2d|duo\s*2|core\s+2\s+duo|c2d)\b/i.test(text)) return "Pebble Duo 2";
  if (/\b(?:pebble\s+time\s*2|pt2|time\s*2)\b/i.test(text)) return "Pebble Time 2";
  if (/\b(?:pebble\s+round|round\s*2|pr2)\b/i.test(text)) return "Pebble Round";
  if (/\b(?:pebble\s+index|index\s*0?1|\bindex\b)\b/i.test(text)) return "Pebble Index";
  if (entry.device && entry.device !== "Unknown") {
    if (/time\s+2/i.test(entry.device)) return "Pebble Time 2";
    if (/duo/i.test(entry.device) || /core\s+2/i.test(entry.device)) return "Pebble Duo 2";
    if (/round/i.test(entry.device)) return "Pebble Round";
    if (/index/i.test(entry.device)) return "Pebble Index";
  }
  return "Unknown";
}

function inferColor(entry: Partial<Entry>, text: string): string {
  const source = `${entry.color && entry.color !== "Unknown" ? entry.color + " " : ""}${text}`;
  const patterns: [RegExp, string][] = [
    [/black\s*[\/\-]?\s*(?:grey|gray)|(?:grey|gray)\s*[\/\-]?\s*black|black\s*[\/\-]?\s*black|\bblack\s+watch\b|\bblack\b(?!\s*(?:\/|-)?\s*(?:red|blue))/i, "Black/Grey"],
    [/black\s*[\/\-]?\s*blue|blue\s*[\/\-]?\s*black|silver\s*[\/\-]?\s*blue|blue\s*[\/\-]?\s*silver/i, "Black/Blue"],
    [/black\s*[\/\-]?\s*red|red\s*[\/\-]?\s*black|silver\s*[\/\-]?\s*red|red\s*[\/\-]?\s*silver/i, "Black/Red"],
    [/silver\s*[\/\-]?\s*(?:grey|gray)|(?:grey|gray)\s*[\/\-]?\s*silver|gray\s+silver|\bwhite\b|\bsilver\b/i, "Silver"],
  ];
  for (const [pattern, value] of patterns) {
    if (pattern.test(source)) return value;
  }
  return entry.color || "Unknown";
}

function inferBatch(entry: Partial<Entry>, text: string): string {
  if (entry.batch && entry.batch !== "Unknown") return entry.batch;
  const match = text.match(/\bbatch\s*([1-5])\b/i);
  return match ? `Batch ${match[1]}` : entry.batch || "Unknown";
}

function parseDateString(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = String(value)
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/[@,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const numeric = cleaned.match(/\b(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (numeric) {
    let a = Number(numeric[1]);
    let b = Number(numeric[2]);
    let c = Number(numeric[3]);
    if (c < 100) c += c >= 70 ? 1900 : 2000;
    let year: number;
    let month: number;
    let day: number;
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
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const monthMap: Record<string, number> = {
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
    dec: 12, december: 12,
  };
  const monthFirst = cleaned.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+(\d{2,4})/i
  );
  const dayFirst = cleaned.match(
    /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?),?\s*(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{2,4})/i
  );
  const parts = monthFirst
    ? { month: monthMap[monthFirst[1].toLowerCase()], day: Number(monthFirst[2]), year: Number(monthFirst[3]) }
    : dayFirst
      ? { month: monthMap[dayFirst[2].toLowerCase()], day: Number(dayFirst[1]), year: Number(dayFirst[3]) }
      : null;
  if (parts) {
    const year = parts.year < 100 ? parts.year + (parts.year >= 70 ? 1900 : 2000) : parts.year;
    if (parts.month >= 1 && parts.month <= 12 && parts.day >= 1 && parts.day <= 31) {
      return `${year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    }
  }
  return null;
}

function extractDateFromLines(lines: string[], patterns: RegExp[]): string | null {
  for (const line of lines) {
    if (!patterns.some((pattern) => pattern.test(line))) continue;
    const parsed = parseDateString(line);
    if (parsed) return parsed;
  }
  return null;
}

function inferStatus(
  entry: Partial<Entry>,
  lines: string[],
  text: string,
  confirmDate: string | null,
  shippingDate: string | null
): string {
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
    /\bwaiting\b/i,
  ];
  if (waitingPatterns.some((pattern) => pattern.test(text))) return "Waiting";
  if (shippingDate) return "Shipped";
  if (/\b(?:shipping label created|shipment notification|tracking number|out for delivery|delivered|in transit|your watch has shipped|shipping email received|shipped on)\b/i.test(text)) {
    return "Shipped";
  }
  if (confirmDate) return "Confirmed";
  if (/\b(?:confirmation email|confirm email|confirmation received|order confirmation|address confirmed|color confirmed|colour confirmed|complete your order|finalize order|confirm choices|received.*email)\b/i.test(text)) {
    return "Confirmed";
  }
  return entry.status || "Unknown";
}

export function normalizeEntry(entry: Partial<Entry>): Entry {
  const lines = cleanLines(entry.body);
  const text = cleanBodyText(entry.body);

  const orderDate = entry.orderDate || extractDateFromLines(lines, [
    /\border(?:ed| date| time| date\/time)?\b/i,
    /\bpre-?order(?:ed)?\b/i,
  ]);
  const confirmDate = entry.confirmDate || extractDateFromLines(lines, [
    /\bconfirm/i,
    /\bconfirmation\b/i,
    /\bcomplete your order\b/i,
    /\bfinalize order\b/i,
  ]);
  const shippingDate = entry.shippingDate || extractDateFromLines(lines, [
    /\bshipping\b/i,
    /\bshipment\b/i,
    /\bshipped\b/i,
    /\btracking\b/i,
    /\bdelivered\b/i,
  ]);

  return {
    author: entry.author || "Unknown",
    created: entry.created || new Date().toISOString(),
    score: entry.score || 0,
    device: inferDevice(entry, text),
    color: inferColor(entry, text),
    country: inferCountry(entry, lines, text),
    batch: inferBatch(entry, text),
    orderDate,
    confirmDate,
    shippingDate,
    status: inferStatus(entry, lines, text, confirmDate, shippingDate),
    body: entry.body || "",
  };
}

export function isLikelyReport(entry: Entry): boolean {
  const hasTimelineSignal = Boolean(
    entry.orderDate ||
    entry.confirmDate ||
    entry.shippingDate ||
    entry.status !== "Unknown" ||
    entry.batch !== "Unknown"
  );
  const hasDescriptorSignal = Boolean(
    entry.device !== "Unknown" ||
    entry.color !== "Unknown" ||
    entry.country !== "Unknown"
  );
  return hasTimelineSignal && hasDescriptorSignal;
}

const THREAD_URL = "https://www.reddit.com/r/pebble/comments/1sjk3c7/shipping_mega_thread";
const THREAD_JSON_URL = `${THREAD_URL}.json?raw_json=1`;

function parseCommentNode(node: unknown, acc: Entry[]) {
  const n = node as { kind?: string; data?: Record<string, unknown> } | null;
  if (!n || n.kind !== "t1" || !n.data) return;
  const c = n.data;
  const author = String(c.author || "");
  const body = String(c.body || "");
  if (author && body && body !== "[deleted]" && body !== "[removed]") {
    const normalized = normalizeEntry({
      author,
      created: new Date(((c.created_utc as number) || 0) * 1000).toISOString(),
      score: (c.score as number) || 0,
      device: "Unknown",
      color: "Unknown",
      country: "Unknown",
      batch: "Unknown",
      status: "Unknown",
      orderDate: null,
      confirmDate: null,
      shippingDate: null,
      body,
    });
    if (isLikelyReport(normalized)) {
      acc.push(normalized);
    }
  }
  const replies =
    c.replies && (c.replies as Record<string, unknown>).data && Array.isArray(((c.replies as Record<string, unknown>).data as Record<string, unknown>).children)
      ? (((c.replies as Record<string, unknown>).data as Record<string, unknown>).children as unknown[])
      : [];
  replies.forEach((reply) => parseCommentNode(reply, acc));
}

export function parseRedditThread(payload: unknown): DataPayload {
  const arr = payload as unknown[];
  if (!Array.isArray(arr) || arr.length < 2) {
    throw new Error("Unexpected Reddit thread payload");
  }
  const postData = ((arr[0] as Record<string, unknown>)?.data as Record<string, unknown>)?.children as { data?: Record<string, unknown> }[] | undefined;
  if (!postData || !postData[0]?.data) {
    throw new Error("Post payload missing");
  }
  const p = postData[0].data;
  const parsedEntries: Entry[] = [];
  const commentNodes = ((((arr[1] as Record<string, unknown>)?.data as Record<string, unknown>)?.children as unknown[]) || []);
  commentNodes.forEach((node) => parseCommentNode(node, parsedEntries));
  return {
    post: {
      title: String(p.title || ""),
      created: new Date(((p.created_utc as number) || 0) * 1000).toISOString(),
      score: (p.score as number) || 0,
      numComments: (p.num_comments as number) || parsedEntries.length,
    },
    entries: parsedEntries,
  };
}

export async function loadLiveData(): Promise<DataPayload> {
  const response = await fetch(THREAD_JSON_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Reddit fetch failed: ${response.status}`);
  }
  const payload = await response.json();
  return parseRedditThread(payload);
}

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c] || c));
}
