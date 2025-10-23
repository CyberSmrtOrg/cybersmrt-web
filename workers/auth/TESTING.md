# CyberSmrt Auth Worker - Testing Guide

## Overview

This document provides comprehensive testing guidelines for the CyberSmrt authentication system.

## Test Setup

### Prerequisites

```bash
npm install --save-dev vitest @cloudflare/vitest-pool-workers
```

### Configuration

Create `vitest.config.js`:

```javascript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Test specific file
npx vitest run src/utils/password.test.js
```

## Test Structure

### Unit Tests

Located in `src/utils/*.test.js` - Test individual utility functions in isolation.

**Example: Password Utilities**
```javascript
// src/utils/password.test.js
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, hashPassword, verifyPassword } from './password.js';

describe('Password Utilities', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(() => validatePasswordStrength('short')).toThrow();
    });

    it('should accept strong passwords', () => {
      expect(() => validatePasswordStrength('StrongP@ss123')).not.toThrow();
    });

    it('should reject passwords without numbers', () => {
      expect(() => validatePasswordStrength('NoNumbers!')).toThrow();
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
```

**Example: Threat Detection**
```javascript
// src/utils/threat-detection.test.js
import { describe, it, expect } from 'vitest';
import { checkIPReputation, analyzeThreat } from './threat-detection.js';

describe('Threat Detection', () => {
  describe('checkIPReputation', () => {
    it('should detect Tor exit nodes', () => {
      const request = {
        cf: {
          isTorExit: true,
          isProxy: false,
          threatLevel: 'unknown',
          botManagement: { score: 100 }
        }
      };

      const result = checkIPReputation(request);

      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.flags).toContain('tor_exit_node');
      expect(result.safe).toBe(false);
    });

    it('should detect proxies', () => {
      const request = {
        cf: {
          isTorExit: false,
          isProxy: true,
          threatLevel: 'unknown',
          botManagement: { score: 100 }
        }
      };

      const result = checkIPReputation(request);

      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.flags).toContain('proxy_detected');
    });

    it('should detect bots with low scores', () => {
      const request = {
        cf: {
          isTorExit: false,
          isProxy: false,
          threatLevel: 'unknown',
          botManagement: { score: 20 }
        }
      };

      const result = checkIPReputation(request);

      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.flags).toContain('bot_detected');
    });
  });
});
```

### Integration Tests

Located in `tests/integration/*.test.js` - Test API endpoints with database interactions.

**Example: Authentication Flow**
```javascript
// tests/integration/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';

describe('Authentication Integration Tests', () => {
  let testUser;

  beforeAll(async () => {
    // Setup test data
    testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      displayName: 'Test User'
    };
  });

  afterAll(async () => {
    // Cleanup test data
    await env.DB.prepare('DELETE FROM users WHERE email = ?')
      .bind(testUser.email)
      .run();
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const request = new Request('https://auth.cybersmrt.org/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testUser.email);
      expect(data.tokens.accessToken).toBeTruthy();
    });

    it('should reject duplicate email registration', async () => {
      const request = new Request('https://auth.cybersmrt.org/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already registered');
    });

    it('should reject weak passwords', async () => {
      const request = new Request('https://auth.cybersmrt.org/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'weak@example.com',
          password: 'weak',
          displayName: 'Weak User'
        })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /login', () => {
    it('should login with correct credentials', async () => {
      const request = new Request('https://auth.cybersmrt.org/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tokens.accessToken).toBeTruthy();
    });

    it('should reject incorrect password', async () => {
      const request = new Request('https://auth.cybersmrt.org/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should lock account after multiple failed attempts', async () => {
      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const request = new Request('https://auth.cybersmrt.org/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: 'WrongPassword'
          })
        });
        await worker.fetch(request, env);
      }

      // 6th attempt should be locked
      const request = new Request('https://auth.cybersmrt.org/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      const response = await worker.fetch(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('locked');
    });
  });
});
```

### Security Tests

**Example: CSRF Protection**
```javascript
// tests/security/csrf.test.js
import { describe, it, expect } from 'vitest';

describe('CSRF Protection', () => {
  it('should validate OAuth state parameter', async () => {
    // Test that OAuth state validation prevents CSRF attacks
    const request = new Request('https://auth.cybersmrt.org/callback/google?code=abc&state=invalid', {
      method: 'GET'
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(400);
  });
});
```

**Example: SQL Injection Prevention**
```javascript
// tests/security/sql-injection.test.js
import { describe, it, expect } from 'vitest';

describe('SQL Injection Prevention', () => {
  it('should prevent SQL injection in login', async () => {
    const request = new Request('https://auth.cybersmrt.org/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin' OR '1'='1",
        password: "anything"
      })
    });

    const response = await worker.fetch(request, env);
    const data = await response.json();

    expect(data.success).toBe(false);
  });
});
```

### Load Testing

**Example: Using Artillery**
```yaml
# artillery.yml
config:
  target: 'https://auth.cybersmrt.org'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"

scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/health"

  - name: "Login flow"
    flow:
      - post:
          url: "/login"
          json:
            email: "load-test@example.com"
            password: "LoadTest123!"
```

Run with:
```bash
artillery run artillery.yml
```

## Manual Testing Checklist

### Authentication Flow
- [ ] User registration with email/password
- [ ] Email verification
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Password reset flow
- [ ] OAuth login (Google, GitHub, Microsoft)
- [ ] 2FA setup and verification
- [ ] Session management

### Security Features
- [ ] Account lockout after failed attempts
- [ ] Credential stuffing detection
- [ ] Account enumeration protection
- [ ] Geographic anomaly detection
- [ ] Impossible travel detection
- [ ] Device verification challenge
- [ ] Threat analysis and blocking

### Admin Features
- [ ] User management
- [ ] Security dashboard
- [ ] Alert management
- [ ] Error log viewing
- [ ] Performance monitoring
- [ ] System health checks

### Edge Cases
- [ ] Expired tokens
- [ ] Concurrent sessions
- [ ] Database connection failures
- [ ] KV namespace failures
- [ ] Rate limit enforcement
- [ ] Invalid input handling
- [ ] XSS prevention
- [ ] CSRF protection

## Performance Benchmarks

### Target Metrics
- **Response Time**: <200ms (p95)
- **Availability**: >99.9%
- **Error Rate**: <0.1%
- **Concurrent Users**: 10,000+

### Monitoring
- Use `/admin/monitoring/performance` for metrics
- Check error logs at `/admin/monitoring/errors`
- Monitor alerts at `/admin/monitoring/alerts`

## Continuous Integration

### GitHub Actions Example
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Security Scanning

### Recommended Tools
- **OWASP ZAP**: Web application security scanner
- **Snyk**: Dependency vulnerability scanning
- **npm audit**: Built-in security auditing

```bash
npm audit
npm audit fix
```

## Documentation

All test files should include:
- Clear test descriptions
- Setup and teardown procedures
- Expected vs actual behavior
- Edge cases and error scenarios

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain >80% code coverage
4. Document new test scenarios
5. Update this guide as needed
