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
