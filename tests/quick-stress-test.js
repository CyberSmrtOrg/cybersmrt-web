import http from 'k6/http';
import { check, _sleep as sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const blockedRequests = new Counter('blocked_requests');
const allowedRequests = new Counter('allowed_requests');

// AGGRESSIVE TEST - Rapid fire requests
export const options = {
  scenarios: {
    spike_test: {
      executor: 'constant-arrival-rate',
      rate: 50,              // 50 requests per second
      timeUnit: '1s',
      duration: '20s',       // Run for 20 seconds
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },
};

const BASE_URL = 'https://qr-proxy.cybersmrt.workers.dev';

export default function () {
  const testUrl = 'https://example.com';

  const payload = JSON.stringify({
    url: testUrl,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${BASE_URL}/analyze`, payload, params);

  const isBlocked = response.status === 429;
  const isAllowed = response.status === 200;

  check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  if (isBlocked) {
    blockedRequests.add(1);
  } else if (isAllowed) {
    allowedRequests.add(1);
  }

  // NO sleep - maximum aggression!
}

export function handleSummary(data) {
  const blocked = data.metrics.blocked_requests?.values?.count || 0;
  const allowed = data.metrics.allowed_requests?.values?.count || 0;
  const total = blocked + allowed;
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;

  console.log('\n🔥 ===== STRESS TEST RESULTS =====');
  console.log(`Total HTTP Requests: ${totalRequests}`);
  console.log(`✅ Allowed (200): ${allowed}`);
  console.log(`❌ Blocked (429): ${blocked}`);
  console.log(`📈 Block Rate: ${((blocked / total) * 100).toFixed(1)}%`);
  console.log(`⚡ Requests/sec: ${(totalRequests / 20).toFixed(1)}`);

  if (allowed <= 20) {
    console.log('✅ PASS: Rate limit working correctly!');
  } else {
    console.log('⚠️  WARNING: More than 20 requests allowed!');
  }

  console.log('===================================\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}