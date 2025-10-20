/**
 * Security Logging
 * Audit trail for all security-related events
 */

/**
 * Log security event to database
 */
export async function logSecurityEvent(userId, eventType, request, env, details = null) {
  const logId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const ipAddress = request?.headers.get('CF-Connecting-IP') ||
                    request?.headers.get('X-Forwarded-For') ||
                    'unknown';
  const userAgent = request?.headers.get('User-Agent') || 'unknown';

  await env.DB
    .prepare(`
      INSERT INTO security_logs (id, user_id, event_type, ip_address, user_agent, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      logId,
      userId,
      eventType,
      ipAddress,
      userAgent,
      details ? JSON.stringify(details) : null,
      now
    )
    .run();

  return logId;
}

/**
 * Log successful login
 */
export async function logLogin(userId, request, env, provider = null) {
  const details = provider ? { provider } : null;
  return await logSecurityEvent(userId, 'login', request, env, details);
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(email, request, env, reason) {
  return await logSecurityEvent(
    null,  // No user ID for failed attempt
    'failed_login',
    request,
    env,
    { email, reason }
  );
}

/**
 * Log logout
 */
export async function logLogout(userId, request, env) {
  return await logSecurityEvent(userId, 'logout', request, env);
}

/**
 * Log password change
 */
export async function logPasswordChange(userId, request, env) {
  return await logSecurityEvent(userId, 'password_change', request, env);
}

/**
 * Log password reset request
 */
export async function logPasswordResetRequest(userId, request, env) {
  return await logSecurityEvent(userId, 'password_reset_request', request, env);
}

/**
 * Log password reset completion
 */
export async function logPasswordResetComplete(userId, request, env) {
  return await logSecurityEvent(userId, 'password_reset_complete', request, env);
}

/**
 * Log email verification sent
 */
export async function logEmailVerificationSent(userId, request, env) {
  return await logSecurityEvent(userId, 'email_verification_sent', request, env);
}

/**
 * Log email verified
 */
export async function logEmailVerified(userId, request, env) {
  return await logSecurityEvent(userId, 'email_verified', request, env);
}

/**
 * Log account locked
 */
export async function logAccountLocked(userId, request, env, reason) {
  return await logSecurityEvent(userId, 'account_locked', request, env, { reason });
}

/**
 * Log account unlocked
 */
export async function logAccountUnlocked(userId, request, env) {
  return await logSecurityEvent(userId, 'account_unlocked', request, env);
}

/**
 * Log OAuth provider linked
 */
export async function logOAuthLink(userId, provider, request, env) {
  return await logSecurityEvent(userId, 'oauth_link', request, env, { provider });
}

/**
 * Log OAuth provider unlinked
 */
export async function logOAuthUnlink(userId, provider, request, env) {
  return await logSecurityEvent(userId, 'oauth_unlink', request, env, { provider });
}

/**
 * Log session created
 */
export async function logSessionCreated(userId, sessionId, request, env) {
  return await logSecurityEvent(userId, 'session_created', request, env, { sessionId });
}

/**
 * Log session expired
 */
export async function logSessionExpired(userId, sessionId, request, env) {
  return await logSecurityEvent(userId, 'session_expired', request, env, { sessionId });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(userId, request, env, reason) {
  return await logSecurityEvent(userId, 'suspicious_activity', request, env, { reason });
}

/**
 * Get recent security events for a user
 */
export async function getUserSecurityLog(userId, env, limit = 50) {
  const logs = await env.DB
    .prepare(`
      SELECT id, event_type, ip_address, user_agent, details, created_at
      FROM security_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .bind(userId, limit)
    .all();

  return logs.results || [];
}

/**
 * Check for suspicious login patterns
 */
export async function detectSuspiciousLogin(userId, request, env) {
  // Get recent logins
  const recentLogins = await env.DB
    .prepare(`
      SELECT ip_address, created_at
      FROM security_logs
      WHERE user_id = ? AND event_type = 'login'
      ORDER BY created_at DESC
      LIMIT 5
    `)
    .bind(userId)
    .all();

  const currentIP = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For');

  // Check if login from new IP
  if (recentLogins.results) {
    const knownIPs = recentLogins.results.map(log => log.ip_address);

    if (!knownIPs.includes(currentIP)) {
      // Login from new location
      await logSuspiciousActivity(userId, request, env, 'login_from_new_ip');
      return { suspicious: true, reason: 'new_ip' };
    }
  }

  return { suspicious: false };
}