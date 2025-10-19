import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const blockedRequests = new Counter('blocked_requests');
const allowedRequests = new Counter('allowed_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 1 },  // Ramp up to 1 user
    { duration: '30s', target: 1 },  // Stay at 1 user for 30s
    { duration: '10s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be under 2s
  },
};

// Your QR proxy worker URL
const BASE_URL = 'https://qr-proxy.cybersmrt.workers.dev';

export default function () {
  // Test URL to scan (safe test URL)
  const testUrl = 'https://example.com';

  const payload = JSON.stringify({
    url: testUrl,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Make request to analyze endpoint
  const response = http.post(`${BASE_URL}/analyze`, payload, params);

  // Check response
  const isBlocked = response.status === 429;
  const isAllowed = response.status === 200;

  check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  // Track metrics
  if (isBlocked) {
    blockedRequests.add(1);
    console.log(`❌ Request BLOCKED (429) - Rate limit triggered! Total blocked: ${blockedRequests}`);
  } else if (isAllowed) {
    allowedRequests.add(1);
    console.log(`✅ Request ALLOWED (200) - Total allowed: ${allowedRequests}`);
  } else {
    console.log(`⚠️  Unexpected status: ${response.status}`);
  }

  // Small delay between requests (100ms)
  sleep(0.1);
}

export function handleSummary(data) {
  const blocked = data.metrics.blocked_requests?.values?.count || 0;
  const allowed = data.metrics.allowed_requests?.values?.count || 0;
  const total = blocked + allowed;

  console.log('\n📊 ===== RATE LIMIT TEST RESULTS =====');
  console.log(`Total Requests: ${total}`);
  console.log(`✅ Allowed: ${allowed}`);
  console.log(`❌ Blocked: ${blocked}`);
  console.log(`📈 Block Rate: ${((blocked / total) * 100).toFixed(1)}%`);
  console.log('=====================================\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}