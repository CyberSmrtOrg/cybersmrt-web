/**
 * Advanced Rate Limiting System
 * Per-endpoint limits with progressive throttling and KV-based tracking
 */

/**
 * Rate limit configurations per endpoint
 */
const RATE_LIMITS = {
  // Authentication endpoints (strictest)
  'login': {
    windowSeconds: 300, // 5 minutes
    maxRequests: 5,
    type: 'ip', // Track by IP address
    progressive: true,
  },
  'register': {
    windowSeconds: 3600, // 1 hour
    maxRequests: 3,
    type: 'ip',
    progressive: false,
  },
  'password-reset-request': {
    windowSeconds: 3600, // 1 hour
    maxRequests: 3,
    type: 'email', // Track by email
    progressive: false,
  },
  'password-reset-complete': {
    windowSeconds: 300, // 5 minutes
    maxRequests: 3,
    type: 'token', // Track by reset token
    progressive: false,
  },
  'email-verification': {
    windowSeconds: 3600, // 1 hour
    maxRequests: 5,
    type: 'user',
    progressive: false,
  },
  '2fa-verify': {
    windowSeconds: 300, // 5 minutes
    maxRequests: 5,
    type: 'ip',
    progressive: true,
  },
  '2fa-setup': {
    windowSeconds: 3600, // 1 hour
    maxRequests: 10,
    type: 'user',
    progressive: false,
  },

  // Profile endpoints (moderate)
  'profile-update': {
    windowSeconds: 60, // 1 minute
    maxRequests: 10,
    type: 'user',
    progressive: false,
  },
  'avatar-upload': {
    windowSeconds: 300, // 5 minutes
    maxRequests: 5,
    type: 'user',
    progressive: false,
  },

  // Default for unconfigured endpoints
  'default': {
    windowSeconds: 60,
    maxRequests: 30,
    type: 'ip',
    progressive: false,
  },
};

/**
 * Get rate limit configuration for an endpoint
 */
function getRateLimitConfig(endpoint) {
  return RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
}

/**
 * Generate rate limit key for KV storage
 */
function generateRateLimitKey(endpoint, identifier, type) {
  return `ratelimit:${endpoint}:${type}:${identifier}`;
}

/**
 * Check and update rate limit
 * Returns { allowed: boolean, remaining: number, resetAt: number, retryAfter: number }
 */
export async function checkRateLimit(endpoint, identifier, env, options = {}) {
  const config = getRateLimitConfig(endpoint);
  const { bypassAdmin = false } = options;

  // Admin bypass (if user has admin role)
  if (bypassAdmin && options.userRole === 'admin') {
    return {
      allowed: true,
      remaining: 999,
      resetAt: Math.floor(Date.now() / 1000) + config.windowSeconds,
      retryAfter: 0,
    };
  }

  const key = generateRateLimitKey(endpoint, identifier, config.type);
  const now = Math.floor(Date.now() / 1000);

  // Get current rate limit data from KV
  const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' });

  let requestCount = 0;
  let windowStart = now;
  let resetAt = now + config.windowSeconds;

  if (data) {
    // Check if window has expired
    if (now >= data.resetAt) {
      // Window expired, reset counter
      requestCount = 1;
      windowStart = now;
      resetAt = now + config.windowSeconds;
    } else {
      // Within window, increment counter
      requestCount = data.count + 1;
      windowStart = data.windowStart;
      resetAt = data.resetAt;
    }
  } else {
    // First request in this window
    requestCount = 1;
  }

  // Progressive rate limiting (slow down as limit approaches)
  let effectiveLimit = config.maxRequests;
  if (config.progressive && requestCount > config.maxRequests * 0.75) {
    // Add artificial delay when approaching limit
    const delayMs = Math.min((requestCount / config.maxRequests) * 1000, 2000);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  const allowed = requestCount <= effectiveLimit;
  const remaining = Math.max(0, effectiveLimit - requestCount);
  const retryAfter = allowed ? 0 : resetAt - now;

  // Store updated count in KV
  await env.RATE_LIMIT_KV.put(
    key,
    JSON.stringify({
      count: requestCount,
      windowStart,
      resetAt,
      lastRequest: now,
    }),
    { expirationTtl: config.windowSeconds + 60 } // TTL slightly longer than window
  );

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter,
    limit: effectiveLimit,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
    ...(rateLimitResult.retryAfter > 0 && {
      'Retry-After': rateLimitResult.retryAfter.toString(),
    }),
  };
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(rateLimitResult, message = 'Too many requests') {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      rateLimit: {
        limit: rateLimitResult.limit,
        remaining: 0,
        resetAt: rateLimitResult.resetAt,
        retryAfter: rateLimitResult.retryAfter,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(rateLimitResult),
      },
    }
  );
}

/**
 * Rate limit middleware wrapper
 * Wraps an endpoint handler with rate limiting
 */
export async function withRateLimit(endpoint, identifierFn, handler, request, env, ctx) {
  let rateLimitResult;

  try {
    // Get identifier (IP, email, user ID, etc.)
    const identifier = await identifierFn(request, env);

    if (!identifier) {
      // If no identifier, skip rate limiting (shouldn't happen)
      return await handler(request, env, ctx);
    }

    // Check rate limit
    rateLimitResult = await checkRateLimit(endpoint, identifier, env);

    // If rate limit exceeded, return error
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(
        rateLimitResult,
        `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`
      );
    }
  } catch (error) {
    // If rate limiting itself fails, allow request (fail open)
    console.error('Rate limiting check error:', error);
    // Continue to execute handler without rate limiting
  }

  // Execute handler (outside try-catch to let handler errors propagate)
  const response = await handler(request, env, ctx);

  // Add rate limit headers to successful response if we have results
  if (rateLimitResult) {
    const headers = new Headers(response.headers);
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}

/**
 * Common identifier functions
 */
export const identifiers = {
  // Get IP address from request
  ip: (request) => {
    return request.headers.get('CF-Connecting-IP') ||
           request.headers.get('X-Forwarded-For') ||
           'unknown';
  },

  // Get email from request body
  email: async (request) => {
    try {
      const body = await request.clone().json();
      return body.email || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  // Get user ID from Authorization header (for authenticated endpoints)
  user: async (request, env) => {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) return 'unknown';

      const token = authHeader.replace(/^Bearer\s+/, '');
      const parts = token.split('.');
      if (parts.length !== 3) return 'unknown';

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.sub || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  // Get token from query params or body
  token: async (request) => {
    try {
      const url = new URL(request.url);
      const queryToken = url.searchParams.get('token');
      if (queryToken) return queryToken;

      const body = await request.clone().json();
      return body.token || 'unknown';
    } catch {
      return 'unknown';
    }
  },
};

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or admin actions
 */
export async function resetRateLimit(endpoint, identifier, type, env) {
  const key = generateRateLimitKey(endpoint, identifier, type);
  await env.RATE_LIMIT_KV.delete(key);
  return { reset: true, key };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(endpoint, identifier, env) {
  const config = getRateLimitConfig(endpoint);
  const key = generateRateLimitKey(endpoint, identifier, config.type);
  const now = Math.floor(Date.now() / 1000);

  const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' });

  if (!data || now >= data.resetAt) {
    return {
      count: 0,
      remaining: config.maxRequests,
      resetAt: now + config.windowSeconds,
      limit: config.maxRequests,
    };
  }

  return {
    count: data.count,
    remaining: Math.max(0, config.maxRequests - data.count),
    resetAt: data.resetAt,
    limit: config.maxRequests,
    lastRequest: data.lastRequest,
  };
}
