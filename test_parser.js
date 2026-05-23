import { normalizeEntry, isLikelyReport } from './parser.js';

const testCases = [
  {
    body: `Today I received an order confirmation and a request to pay taxes and delivery to Finland. Hopefully the delivery won't take many more weeks 😊👍🏼`,
    created: '2025-04-15T12:00:00Z',
    expected: { country: 'Finland', status: 'Unknown', isLikelyReport: false }
  },
  {
    body: `Model: Pebble Time 2\nOrdered: 2025-03-24 02:45 PM EDT\nBatch: 2\nDestination: Toronto, Canada\nColor: Silver/Gray\nConfirmation Email: Not Yet!\nShipped: Not Yet!\nArrived: Not Yet!`,
    created: '2025-03-25T12:00:00Z',
    expected: { device: 'Pebble Time 2', color: 'Silver/Grey', country: 'Canada', batch: 'Batch 2', orderDate: '2025-03-24', orderDateTime: '2025-03-24 18:45 UTC', status: 'Waiting', isLikelyReport: true }
  },
  {
    body: `Model: Pebble Time 2\nOrdered: 4/6/2025 06:48 PM GMT+12\nBatch: 2\nDestination: NZ\nColor: Silver/Grey\nConfirmation Email: TBA\nShipped: TBA\nArrived: TBA\nImport fees: TBA\nTax: TBA\nShipping: $25.00 USD`,
    created: '2025-04-07T12:00:00Z',
    expected: { device: 'Pebble Time 2', color: 'Silver/Grey', country: 'New Zealand', batch: 'Batch 2', orderDate: '2025-04-06', orderDateTime: '2025-04-06 06:48 UTC', status: 'Waiting', isLikelyReport: true }
  },
  {
    body: `* Model: Pebble Time 2\n* Ordered: 2025-04-04\n* Batch: 2\n* Destination: Canada\n* Color: Black/Red\n* Confirmation Email: 05/12/2026\n* Shipped: TBA\n* Arrived: TBA\n* Tax & Tariffs: $66.53 CAD\n* Shipping: $25.00 (incl)`,
    created: '2026-05-13T12:00:00Z',
    expected: { device: 'Pebble Time 2', color: 'Black/Red', country: 'Canada', batch: 'Batch 2', orderDate: '2025-04-04', confirmDate: '2026-05-12', taxAmount: 66.53, taxCurrency: 'CAD', taxDisplay: '$66.53 CAD', status: 'Confirmed', isLikelyReport: true }
  },
  {
    body: `* Model: Pebble Time 2\n* Ordered: 2025-08-14 12:10 AM GMT+5:30\n* Batch 2\n* Destination : India\n* Color: Black/Grey\n* Confirmation: 2026-05-18 11:17 AM GMT+5:30\n* Shipped: Not yet\n* Delivered: Not yet\n* Tax: $58.75`,
    created: '2026-04-28T18:18:41.000Z',
    expected: { device: 'Pebble Time 2', color: 'Black/Grey', country: 'India', batch: 'Batch 2', orderDate: '2025-08-14', orderDateTime: '2025-08-13 18:40 UTC', confirmDate: '2026-05-18', confirmDateTime: '2026-05-18 05:47 UTC', taxAmount: 58.75, taxCurrency: 'USD', taxDisplay: '$58.75', status: 'Confirmed', isLikelyReport: true }
  },
  {
    body: `Model: Pebble Time 2\nOrdered: 2025-03-18\nDestination: Belgium\nColor: Black/Red\nImport fees: $11,25\nTax: $59,17\nShipping: $25.00`,
    created: '2026-05-14T12:00:00Z',
    expected: { country: 'Belgium', taxAmount: 11.25, taxCurrency: 'USD', taxDisplay: '$11.25', isLikelyReport: true }
  },
  {
    body: `PT2 Silver/Grey Ordered 3/18/2025 04:03:45 PM UTC, Batch 1, South Korea\nAdditional charges: Tarriffs - $38.14`,
    created: '2026-04-25T12:00:00Z',
    expected: { device: 'Pebble Time 2', color: 'Silver/Grey', country: 'South Korea', batch: 'Batch 1', taxAmount: 38.14, taxDisplay: '$38.14', isLikelyReport: true }
  }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log('Input:', JSON.stringify(testCase.body));
  const result = normalizeEntry(testCase);
  const report = {
    device: result.device,
    color: result.color,
    country: result.country,
    batch: result.batch,
    orderDate: result.orderDate,
    confirmDate: result.confirmDate,
    shippingDate: result.shippingDate,
    orderDateTime: result.orderDateTime,
    confirmDateTime: result.confirmDateTime,
    shippingDateTime: result.shippingDateTime,
    taxAmount: result.taxAmount,
    taxCurrency: result.taxCurrency,
    taxDisplay: result.taxDisplay,
    status: result.status,
    isLikelyReport: isLikelyReport(result)
  };
  
  console.log('Result:', JSON.stringify(report, null, 2));
  
  const errors = [];
  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    if (report[key] !== expectedValue) {
      errors.push(`  ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(report[key])}`);
    }
  }
  
  if (errors.length > 0) {
    console.log('FAILURES:');
    errors.forEach(e => console.log(e));
    failed++;
  } else {
    console.log('PASS');
    passed++;
  }
  console.log('---');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
