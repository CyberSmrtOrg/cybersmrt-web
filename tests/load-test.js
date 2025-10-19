/**
 * CyberSmrt QR Proxy - Load Testing Suite
 * Tests rate limiting, performance, and SSRF protection under load
 *
 * Run with: k6 run load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const ssrfBlocks = new Counter('ssrf_blocks');
const responseTime = new Trend('response_time');
const successRate = new Rate('success_rate');

// Configuration
const BASE_URL = 'https://cybersmrt.org/tools/qr_proxy';
const TEST_URL = 'https://example.com';

// ============================================================
// TEST SCENARIO 1: Normal Load (Baseline)
// Simulates 10 users making requests at normal pace
// Expected: All requests succeed, no rate limiting
// ============================================================
export const normalLoadOptions = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests under 500ms
    'success_rate': ['rate>0.95'],      // 95% success rate
  },
};

// ============================================================
// TEST SCENARIO 2: Burst Traffic
// Simulates sudden spike in traffic
// Expected: Rate limiting kicks in appropriately
// ============================================================
export const burstTrafficOptions = {
  stages: [
    { duration: '10s', target: 50 },   // Quick ramp to 50 users
    { duration: '30s', target: 50 },   // Hold at 50
    { duration: '10s', target: 0 },    // Quick ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Allow slower under load
    'rate_limit_hits': ['count>0'],       // Should see rate limits
  },
};

// ============================================================
// TEST SCENARIO 3: DDoS Simulation
// Simulates aggressive attack
// Expected: Rate limiting protects service
// ============================================================
export const ddosSimulationOptions = {
  stages: [
    { duration: '10s', target: 100 },  // Aggressive ramp
    { duration: '20s', target: 100 },  // Sustained attack
    { duration: '10s', target: 0 },    // Stop
  ],
  thresholds: {
    'rate_limit_hits': ['count>100'],   // Many rate limits expected
    'http_req_duration': ['p(50)<2000'], // Median response still reasonable
  },
};

// ============================================================
// Default export - runs the selected scenario
// Change the options to run different scenarios
// ============================================================
export let options = normalLoadOptions; // Change this to test different scenarios

export default function() {
  // Test 1: Normal proxy request
  testNormalRequest();

  // Test 2: SSRF protection (10% of requests)
  if (Math.random() < 0.1) {
    testSSRFProtection();
  }

  // Test 3: Health check (5% of requests)
  if (Math.random() < 0.05) {
    testHealthEndpoint();
  }

  // Random delay between requests (human-like behavior)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// ============================================================
// Test Functions
// ============================================================

function testNormalRequest() {
  const url = `${BASE_URL}?url=${encodeURIComponent(TEST_URL)}&analysis_only=true`;

  const response = http.get(url, {
    tags: { name: 'NormalRequest' },
  });

  const success = check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Track metrics
  successRate.add(success);
  responseTime.add(response.timings.duration);

  if (response.status === 429) {
    rateLimitHits.add(1);
  }

  // Verify response structure for successful requests
  if (response.status === 200) {
    check(response, {
      'has security field': (r) => JSON.parse(r.body).security !== undefined,
    });
  }
}

function testSSRFProtection() {
  // Test various SSRF vectors
  const ssrfVectors = [
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1',
    'http://192.168.1.1',
    'http://localhost',
  ];

  const vector = ssrfVectors[Math.floor(Math.random() * ssrfVectors.length)];
  const url = `${BASE_URL}?url=${encodeURIComponent(vector)}&analysis_only=true`;

  const response = http.get(url, {
    tags: { name: 'SSRFTest' },
  });

  const blocked = check(response, {
    'SSRF is blocked (403 or 429)': (r) => r.status === 403 || r.status === 429,
    'malicious request prevented': (r) => r.status !== 200,
  });

  if (blocked) {
    ssrfBlocks.add(1);
  }
}

function testHealthEndpoint() {
  const response = http.get(`${BASE_URL}/health`, {
    tags: { name: 'HealthCheck' },
  });

  check(response, {
    'health check is 200': (r) => r.status === 200,
    'returns ok status': (r) => JSON.parse(r.body).status === 'ok',
    'health check fast': (r) => r.timings.duration < 200,
  });
}

// ============================================================
// Tear down - runs once after all iterations
// ============================================================
export function teardown(data) {
  console.log('Load test complete!');
}