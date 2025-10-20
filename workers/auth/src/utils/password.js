/**
 * Password Utilities
 * Hashing, validation, and strength checking
 */

import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (errors.length > 0) {
    throw new Error(`Password validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Generate a secure random token
 */
export function generateResetToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create password reset token
 */
export async function createResetToken(userId, env) {
  const token = generateResetToken();
  const tokenId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour expiry

  await env.DB
    .prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(tokenId, userId, token, expiresAt, now)
    .run();

  return token;
}

/**
 * Verify and consume reset token
 */
export async function verifyResetToken(token, env) {
  const now = Math.floor(Date.now() / 1000);

  // Get token from database
  const resetToken = await env.DB
    .prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND used = 0 AND expires_at > ?
    `)
    .bind(token, now)
    .first();

  if (!resetToken) {
    throw new Error('Invalid or expired reset token');
  }

  // Mark token as used
  await env.DB
    .prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
    .bind(resetToken.id)
    .run();

  return resetToken.user_id;
}

/**
 * Clean up expired tokens (call periodically)
 */
export async function cleanupExpiredTokens(env) {
  const now = Math.floor(Date.now() / 1000);

  const result = await env.DB
    .prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?')
    .bind(now)
    .run();

  return result.changes || 0;
}