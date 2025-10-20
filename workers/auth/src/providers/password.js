/**
 * Email/Password Authentication Provider
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createResetToken,
  verifyResetToken
} from '../utils/password.js';
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} from '../utils/email.js';
import { logSecurityEvent } from '../utils/security.js';

/**
 * Register new user with email and password
 */
export async function registerWithPassword(email, password, displayName, request, env) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  validatePasswordStrength(password);

  // Check if user already exists
  const existingUser = await env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await env.DB
    .prepare(`
      INSERT INTO users (
        id, email, display_name, password_hash,
        email_verified, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      userId,
      email.toLowerCase(),
      displayName || email.split('@')[0],
      passwordHash,
      0, // Email not verified yet
      now,
      now
    )
    .run();

  // Log registration
  await logSecurityEvent(userId, 'login', request, env, {
    method: 'password',
    action: 'account_created',
  });

  return {
    userId,
    email: email.toLowerCase(),
    displayName: displayName || email.split('@')[0],
  };
}

/**
 * Login with email and password
 */
export async function loginWithPassword(email, password, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user has a password set
  if (!user.password_hash) {
    throw new Error('This account uses OAuth login. Please sign in with Google, GitHub, or Microsoft.');
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    // Log failed attempt
    await logSecurityEvent(user.id, 'failed_login', request, env, {
      reason: 'invalid_password',
    });
    throw new Error('Invalid email or password');
  }

  // Check if account is active
  if (user.is_active === 0) {
    throw new Error('Account is disabled');
  }

  // Log successful login
  await logSecurityEvent(user.id, 'login', request, env, {
    method: 'password',
  });

  return user;
}

/**
 * Change password (requires current password)
 */
export async function changePassword(userId, currentPassword, newPassword, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // If user has a password, verify current password
  if (user.password_hash) {
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      await logSecurityEvent(userId, 'failed_login', request, env, {
        reason: 'invalid_current_password',
        action: 'password_change_attempt',
      });
      throw new Error('Current password is incorrect');
    }
  }

  // Validate new password strength
  validatePasswordStrength(newPassword);

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, userId)
    .run();

  // Log password change
  await logSecurityEvent(userId, 'password_change', request, env);

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, env);

  return true;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  // Always return success to prevent email enumeration
  if (!user) {
    // Still wait to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  // Generate reset token
  const token = await createResetToken(user.id, env);

  // Send reset email
  await sendPasswordResetEmail(user.email, token, env);

  // Log password reset request
  await logSecurityEvent(user.id, 'password_reset_request', request, env);

  return true;
}

/**
 * Reset password with token
 */
export async function resetPassword(token, newPassword, request, env) {
  // Verify token and get user ID
  const userId = await verifyResetToken(token, env);

  // Validate new password
  validatePasswordStrength(newPassword);

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, userId)
    .run();

  // Get user for email
  const user = await env.DB
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first();

  // Log password reset
  await logSecurityEvent(userId, 'password_reset_complete', request, env);

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, env);

  return true;
}