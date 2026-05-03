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

function isTipsPost(body) {
  return /^\s*(?:[*_~`>#\-\s]+)?tips(?:\s*[*_~`]+)?\s*:?\b/i.test(String(body || ''));
}

function normalizeCountry(value) {
  const v = String(value || '').trim().toLowerCase();
  const aliases = {
    us: 'US', usa: 'US', 'united states': 'US', 'united states of america': 'US',
    uk: 'UK', 'united kingdom': 'UK', 'england': 'UK', 'great britain': 'UK',
    scotland: 'UK', wales: 'UK', 'northern ireland': 'UK',
    de: 'Germany', deu: 'Germany',
    uae: 'UAE', 'united arab emirates': 'UAE',
    dprk: 'North Korea', drc: 'DR Congo', 'democratic republic of the congo': 'DR Congo',
    holland: 'Netherlands', czechia: 'Czech Republic',
    burma: 'Myanmar', swaziland: 'Eswatini',
    'cape verde': 'Cabo Verde', 'east timor': 'Timor-Leste',
    vatican: 'Vatican City', 'holy see': 'Vatican City',
    "côte d'ivoire": 'Ivory Coast', macedonia: 'North Macedonia',
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
    /\b(?:location|region|country|destination|delivery to|shipping to|ship to)\s*[:\-]?\s*([A-Za-z][A-Za-z .-]{1,40})\b/i,
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
      const normalized = normalizeCountry(value);
      if (normalized !== value || ['US', 'UK', 'UAE'].includes(normalized)) {
        return normalized;
      }
      if (countryNames.some(name => new RegExp(`^${name}$`, 'i').test(value))) {
        return normalized;
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
  if (/\b(?:switched|changed|selected)(?:\s+my)?\s+(?:to\s+)?(?:pebble\s+time\s+2|pt2|time\s+2)\b/i.test(text)) return 'Pebble Time 2';
  if (/\b(?:switched|changed|selected)(?:\s+my)?\s+(?:to\s+)?(?:pebble\s+duo\s*2|pebble\s+time\s+duo\s*2|p2d|duo\s*2|core\s+2\s+duo|c2d)\b/i.test(text)) return 'Pebble Duo 2';
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
    [/black\s*[\/-]?\s*(?:grey|gray)|(?:grey|gray)\s*[\/-]?\s*black|black\s*[\/-]?\s*black|\bblack\b(?!\s*(?:\/|-)?\s*(?:red|blue))/i, 'Black/Grey'],
    [/silver\s*[\/-]?\s*(?:grey|gray)|(?:grey|gray)\s*[\/-]?\s*silver|gray\s+silver|\bwhite\b|\bsilver\b(?!\s*(?:\/|-)?\s*blue)/i, 'Silver/Grey'],
    [/black\s*[\/-]?\s*red|red\s*[\/-]?\s*black/i, 'Black/Red'],
    [/silver\s*[\/-]?\s*blue|blue\s*[\/-]?\s*silver/i, 'Silver/Blue']
  ];
  for (const [pattern, value] of patterns) {
    if (pattern.test(source)) return value;
  }
  return entry.color || 'Unknown';
}

function inferBatch(entry, text) {
  if (entry.batch && entry.batch !== 'Unknown') return entry.batch;
  const match = text.match(/\bbatch\s*[:#-]?\s*([1-5])\b/i);
  return match ? `Batch ${match[1]}` : (entry.batch || 'Unknown');
}

function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateString(value, options = {}) {
  if (!value) return null;
  const { fallbackYear = null, preferDayFirst = false } = options;
  const today = dateKeyFromDate(new Date());
  const cleaned = String(value)
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/[@,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const validDate = (year, month, day) => {
    if (year < 2025 || year > 2027) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateKey <= today ? dateKey : null;
  };

  const numeric = cleaned.match(/\b(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (numeric) {
    let a = Number(numeric[1]);
    let b = Number(numeric[2]);
    let c = Number(numeric[3]);
    let year;
    let month;
    let day;
    if (numeric[1].length === 4) {
      year = a;
      month = b;
      day = c;
    } else if (a > 12) {
      if (c < 100) c += c >= 70 ? 1900 : 2000;
      day = a;
      month = b;
      year = c;
    } else if (b > 12) {
      if (c < 100) c += c >= 70 ? 1900 : 2000;
      month = a;
      day = b;
      year = c;
    } else if (preferDayFirst) {
      if (c < 100) c += c >= 70 ? 1900 : 2000;
      day = a;
      month = b;
      year = c;
    } else {
      return null;
    }
    return validDate(year, month, day);
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
  const monthFirst = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+(\d{2,4})(?!\s*:)/i);
  const dayFirst = cleaned.match(/\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?,?\s*(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{2,4})(?!\s*:)/i);
  const parts = monthFirst
    ? { month: monthMap[monthFirst[1].toLowerCase()], day: Number(monthFirst[2]), year: Number(monthFirst[3]) }
    : dayFirst
      ? { month: monthMap[dayFirst[2].toLowerCase()], day: Number(dayFirst[1]), year: Number(dayFirst[3]) }
      : null;
  if (parts) {
    const year = parts.year < 100 ? parts.year + (parts.year >= 70 ? 1900 : 2000) : parts.year;
    return validDate(year, parts.month, parts.day);
  }

  if (fallbackYear) {
    const monthDay = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b[\s,.-]+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (monthDay) {
      return validDate(fallbackYear, monthMap[monthDay[1].toLowerCase()], Number(monthDay[2]));
    }
  }
  return null;
}

function extractDateFromLines(lines, patterns, options = {}) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const beforeMatch = line.slice(0, match.index);
      const nearbyBefore = beforeMatch.split(/\bedit\s*\d*\s*[-:]|[.;]/i).pop() || '';
      const parsed = parseDateString(line.slice(match.index), options) || parseDateString(nearbyBefore, options);
      if (parsed) return parsed;
    }
  }
  return null;
}

function getFieldValue(line, fieldPattern) {
  const match = line.match(new RegExp(`^[-\\s]*(?:${fieldPattern})\\s*(?:[:=-]|\\b)\\s*(.*)$`, 'i'));
  return match ? match[1] : null;
}

function hasNegativeFieldValue(lines, fieldPattern) {
  const negativeValue = /\b(?:not\s+yet|no|nope|none|n\/a|na|pending|waiting|tbd|false)\b/i;
  return lines.some(line => {
    const value = getFieldValue(line, fieldPattern);
    return value != null && negativeValue.test(value);
  });
}

function hasPositiveFieldValue(lines, fieldPattern) {
  const positiveValue = /\b(?:yes|yep|true|done|received|sent|shipped|delivered)\b/i;
  return lines.some(line => {
    const value = getFieldValue(line, fieldPattern);
    return value != null && positiveValue.test(value);
  });
}

function withoutNegativeFieldLines(lines, fieldPattern) {
  return lines
    .filter(line => !hasNegativeFieldValue([line], fieldPattern))
    .join(' ');
}

function hasNegativeShippingUpdate(text) {
  return /\b(?:still\s+)?no\s+shipping\s+(?:update|email|notification)\b/i.test(text) ||
    /\b(?:still\s+)?no\s+.*\bemail\s+about\s+finali[sz]ing\b/i.test(text);
}

function linesWithoutNegativeShippingUpdates(lines) {
  return lines.filter(line => !hasNegativeShippingUpdate(line));
}

function inferStatus(entry, lines, text, confirmDate, shippingDate) {
  const shippingNegative = hasNegativeFieldValue(lines, 'shipped|shipping');
  const confirmationNegative = hasNegativeFieldValue(lines, 'confirmation|confirmed|confirm');
  const shippingPositive = hasPositiveFieldValue(lines, 'shipped|shipping|delivered');
  const confirmationPositive = hasPositiveFieldValue(lines, 'confirmation|confirmed|confirm');
  const waitingPatterns = [
    /\bno shipping email yet\b/i,
    /\bno shipping notification yet\b/i,
    /\bno shipping confirmation yet\b/i,
    /\bno confirmation email\b/i,
    /\bno email yet\b/i,
    /\bstill no email\b/i,
    /\bnot yet shipped\b/i,
    /\bnot shipped\b/i,
    /\bshipping tbd\b/i,
    /\bno shipping update\b/i,
    /\bno communication yet\b/i,
    /\bwaiting\b/i
  ];
  const negativeShippingUpdate = hasNegativeShippingUpdate(text);
  const hasConfirmationSignal = Boolean(confirmDate || confirmationPositive);
  if (waitingPatterns.some(pattern => pattern.test(text)) || negativeShippingUpdate || (shippingNegative && (confirmationNegative || !hasConfirmationSignal))) {
    return 'Waiting';
  }
  if (shippingPositive && !shippingNegative) return 'Shipped';
  if (shippingDate && !shippingNegative) return 'Shipped';

  const positiveText = withoutNegativeFieldLines(lines, 'shipped|shipping|delivered');
  if (/\b(?:shipping label created|shipment notification|tracking number|out for delivery|delivered|in transit|your watch has shipped|shipping email received|shipped on)\b/i.test(positiveText)) {
    return 'Shipped';
  }
  if (confirmationPositive && !confirmationNegative) return 'Confirmed';
  if (confirmDate && !confirmationNegative) return 'Confirmed';

  const confirmationText = withoutNegativeFieldLines(lines, 'confirmation|confirmed|confirm');
  if (/\b(?:confirmation email|confirm email|confirmation received|order confirmation|address confirmed|color confirmed|colour confirmed|complete your order|finalize order|confirm choices|received.*email)\b/i.test(confirmationText)) {
    return 'Confirmed';
  }
  return entry.status || 'Unknown';
}

function normalizeEntry(entry) {
  const lines = cleanLines(entry.body);
  const text = cleanBodyText(entry.body);
  const createdYear = entry.created ? new Date(entry.created).getUTCFullYear() : null;
  const fallbackYear = createdYear >= 2025 && createdYear <= 2027 ? createdYear : null;
  const country = inferCountry(entry, lines, text);
  const preferDayFirstDates = country !== 'US' && (
    country !== 'Unknown' ||
    /\bcolour\b/i.test(text) ||
    /\bgmt\s*[+-]\s*\d{1,2}\b/i.test(text)
  );

  const orderDate = entry.orderDate || extractDateFromLines(lines, [
    /\border(?:ed| date| time| date\/time)?\b/i,
    /\bpre-?order(?:ed)?\b/i
  ], { fallbackYear, preferDayFirst: preferDayFirstDates });
  const confirmDate = entry.confirmDate || extractDateFromLines(lines, [
    /\bconfirm/i,
    /\bconfirmation\b/i,
    /\bcomplete your order\b/i,
    /\bfinalize order\b/i
  ], { fallbackYear, preferDayFirst: preferDayFirstDates });
  const shippingDate = entry.shippingDate || extractDateFromLines(linesWithoutNegativeShippingUpdates(lines), [
    /\bshipping\b/i,
    /\bshipment\b/i,
    /\bshipped\b/i,
    /\btracking\b/i,
    /\bdelivered\b/i
  ], { fallbackYear, preferDayFirst: preferDayFirstDates });

  return {
    ...entry,
    device: inferDevice(entry, text),
    color: inferColor(entry, text),
    country,
    batch: inferBatch(entry, text),
    orderDate,
    confirmDate,
    shippingDate,
    status: inferStatus(entry, lines, text, confirmDate, shippingDate)
  };
}

function isLikelyReport(entry) {
  if (isTipsPost(entry.body)) return false;

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
