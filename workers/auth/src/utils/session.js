/**
 * Session Management
 * Handles user sessions stored in D1 database
 */

/**
 * Create a new session
 */
export async function createSession(userId, request, env) {
  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (env.SESSION_EXPIRY || 604800);  // Default 7 days

  // Extract client information
  const ipAddress = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For') ||
                    'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  // Insert session into database
  await env.DB
    .prepare(`
      INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at, created_at, last_activity_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(sessionId, userId, ipAddress, userAgent, expiresAt, now, now)
    .run();

  return {
    sessionId,
    expiresAt,
  };
}

/**
 * Get session by ID
 */
export async function getSession(sessionId, env) {
  const session = await env.DB
    .prepare(`
      SELECT s.*, u.email, u.display_name, u.role, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `)
    .bind(sessionId)
    .first();

  if (!session) {
    return null;
  }

  // Check if session is expired
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at < now) {
    await deleteSession(sessionId, env);
    return null;
  }

  // Check if user is active
  if (!session.is_active) {
    await deleteSession(sessionId, env);
    return null;
  }

  return session;
}

/**
 * Update session last activity
 */
export async function touchSession(sessionId, env) {
  const now = Math.floor(Date.now() / 1000);

  await env.DB
    .prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?')
    .bind(now, sessionId)
    .run();
}

/**
 * Delete session (logout)
 */
export async function deleteSession(sessionId, env) {
  await env.DB
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(sessionId)
    .run();
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId, env) {
  await env.DB
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .bind(userId)
    .run();
}

/**
 * Clean up expired sessions
 * Call this periodically (e.g., daily cron job)
 */
export async function cleanupExpiredSessions(env) {
  const now = Math.floor(Date.now() / 1000);

  const result = await env.DB
    .prepare('DELETE FROM sessions WHERE expires_at < ?')
    .bind(now)
    .run();

  return result.meta.changes || 0;
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId, env) {
  const sessions = await env.DB
    .prepare(`
      SELECT id, ip_address, user_agent, created_at, last_activity_at, expires_at
      FROM sessions
      WHERE user_id = ?
      ORDER BY last_activity_at DESC
    `)
    .bind(userId)
    .all();

  return sessions.results || [];
}

/**
 * Extend session expiration
 */
export async function extendSession(sessionId, env) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (env.SESSION_EXPIRY || 604800);

  await env.DB
    .prepare('UPDATE sessions SET expires_at = ?, last_activity_at = ? WHERE id = ?')
    .bind(expiresAt, now, sessionId)
    .run();

  return expiresAt;
}