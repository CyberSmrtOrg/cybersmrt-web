/**
 * Rate Limiting
 * Prevents brute force attacks and abuse
 */

/**
 * Check if request should be rate limited
 * Returns true if rate limit exceeded, false otherwise
 */
export async function isRateLimited(key, env, maxAttempts = null, window = null) {
  const max = maxAttempts || env.RATE_LIMIT_MAX_ATTEMPTS || 5;
  const windowSeconds = window || env.RATE_LIMIT_WINDOW || 900;  // 15 minutes

  // Get current count from KV
  const count = await env.RATE_LIMIT_KV.get(key);
  const currentCount = count ? parseInt(count) : 0;

  if (currentCount >= max) {
    return true;  // Rate limited
  }

  // Increment counter
  await env.RATE_LIMIT_KV.put(
    key,
    (currentCount + 1).toString(),
    { expirationTtl: windowSeconds }
  );

  return false;  // Not rate limited
}

/**
 * Get rate limit key for IP address
 */
export function getRateLimitKeyForIP(request, action = 'auth') {
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For') ||
             'unknown';
  return `ratelimit:${action}:ip:${ip}`;
}

/**
 * Get rate limit key for email
 */
export function getRateLimitKeyForEmail(email, action = 'auth') {
  return `ratelimit:${action}:email:${email.toLowerCase()}`;
}

/**
 * Get rate limit key for user ID
 */
export function getRateLimitKeyForUser(userId, action = 'auth') {
  return `ratelimit:${action}:user:${userId}`;
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(key, env) {
  await env.RATE_LIMIT_KV.delete(key);
}

/**
 * Get remaining attempts
 */
export async function getRemainingAttempts(key, env, maxAttempts = null) {
  const max = maxAttempts || env.RATE_LIMIT_MAX_ATTEMPTS || 5;
  const count = await env.RATE_LIMIT_KV.get(key);
  const currentCount = count ? parseInt(count) : 0;

  return Math.max(0, max - currentCount);
}

/**
 * Rate limit middleware for authentication endpoints
 */
export async function checkAuthRateLimit(request, env) {
  const ipKey = getRateLimitKeyForIP(request, 'auth');

  if (await isRateLimited(ipKey, env)) {
    const remaining = await getRemainingAttempts(ipKey, env);

    throw new Error(
      `Too many authentication attempts. Please try again later. Attempts remaining: ${remaining}`
    );
  }
}

/**
 * Rate limit for login attempts
 */
export async function checkLoginRateLimit(email, request, env) {
  // Check both IP and email
  const ipKey = getRateLimitKeyForIP(request, 'login');
  const emailKey = getRateLimitKeyForEmail(email, 'login');

  const ipLimited = await isRateLimited(ipKey, env, 10, 900);  // 10 attempts per 15 min
  const emailLimited = await isRateLimited(emailKey, env, 5, 3600);  // 5 attempts per hour

  if (ipLimited || emailLimited) {
    throw new Error('Too many login attempts. Please try again later.');
  }
}

/**
 * Rate limit for OAuth callbacks
 */
export async function checkOAuthRateLimit(request, env) {
  const ipKey = getRateLimitKeyForIP(request, 'oauth');

  if (await isRateLimited(ipKey, env, 20, 300)) {  // 20 attempts per 5 minutes
    throw new Error('Too many OAuth attempts. Please try again later.');
  }
}

/**
 * Clear all rate limits for a user (e.g., after successful login)
 */
export async function clearUserRateLimits(email, userId, request, env) {
  const ipKey = getRateLimitKeyForIP(request, 'login');
  const emailKey = getRateLimitKeyForEmail(email, 'login');
  const userKey = getRateLimitKeyForUser(userId, 'login');

  await Promise.all([
    resetRateLimit(ipKey, env),
    resetRateLimit(emailKey, env),
    resetRateLimit(userKey, env),
  ]);
}