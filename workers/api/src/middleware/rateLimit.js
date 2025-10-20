/**
 * Rate Limiting Middleware
 * Per-user rate limiting using KV
 */

function getClientId(request, userId = null) {
  if (userId) {
    return `user:${userId}`;
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return `ip:${ip}`;
}

export async function checkRateLimit(request, env, userId = null) {
  const clientId = getClientId(request, userId);
  const key = `ratelimit:api:${clientId}`;
  const now = Date.now();
  const window = env.RATE_LIMIT_WINDOW * 1000;
  const maxRequests = env.RATE_LIMIT_REQUESTS;

  const data = await env.RATE_LIMIT_KV.get(key, 'json');

  if (!data) {
    await env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({ count: 1, resetAt: now + window }),
      { expirationTtl: env.RATE_LIMIT_WINDOW }
    );
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + window,
    };
  }

  if (now > data.resetAt) {
    await env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({ count: 1, resetAt: now + window }),
      { expirationTtl: env.RATE_LIMIT_WINDOW }
    );
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + window,
    };
  }

  if (data.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt,
    };
  }

  await env.RATE_LIMIT_KV.put(
    key,
    JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }),
    { expirationTtl: env.RATE_LIMIT_WINDOW }
  );

  return {
    allowed: true,
    remaining: maxRequests - data.count - 1,
    resetAt: data.resetAt,
  };
}

export async function rateLimit(request, env, userId = null) {
  const result = await checkRateLimit(request, env, userId);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
  }

  return {
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}
