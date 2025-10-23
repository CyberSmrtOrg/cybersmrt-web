/**
 * Two-Factor Authentication (2FA) Provider
 * Handles TOTP setup, verification, and backup codes
 */

import {
  generateTOTPSecret,
  generateTOTPUrl,
  verifyTOTP,
  generateBackupCodes,
  storeBackupCodes,
  consumeBackupCode,
  encryptSecret,
  decryptSecret,
} from '../utils/totp.js';
import { verifyPassword } from '../utils/password.js';
import { logSecurityEvent } from '../utils/security.js';

/**
 * Start 2FA setup process
 * Generates TOTP secret and returns QR code URL
 */
export async function setup2FA(userId, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // Check if 2FA is already enabled
  if (user.totp_enabled === 1) {
    throw new Error('2FA is already enabled. Disable it first to set up again.');
  }

  // Generate new TOTP secret
  const secret = generateTOTPSecret();

  // Encrypt secret for storage
  const encryptedSecret = encryptSecret(secret);

  // Store encrypted secret temporarily (not enabled yet)
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare('UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?')
    .bind(encryptedSecret, now, userId)
    .run();

  // Generate QR code URL
  const qrCodeUrl = generateTOTPUrl(secret, user.email);

  // Log setup initiation
  await logSecurityEvent(userId, '2fa_setup_started', request, env);

  return {
    secret, // Return plain secret for display
    qrCodeUrl,
    email: user.email,
  };
}

/**
 * Enable 2FA after verifying TOTP code
 * Also generates and returns backup codes
 */
export async function enable2FA(userId, token, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.totp_secret) {
    throw new Error('2FA setup not started. Call /2fa/setup first.');
  }

  if (user.totp_enabled === 1) {
    throw new Error('2FA is already enabled');
  }

  // Decrypt secret
  const secret = decryptSecret(user.totp_secret);

  // Verify the TOTP token
  const isValid = await verifyTOTP(secret, token);

  if (!isValid) {
    // Log failed attempt
    await logSecurityEvent(userId, '2fa_enable_failed', request, env, {
      reason: 'invalid_token',
    });
    throw new Error('Invalid verification code. Please try again.');
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);

  // Store backup codes
  await storeBackupCodes(userId, backupCodes, env);

  // Enable 2FA
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare('UPDATE users SET totp_enabled = 1, updated_at = ? WHERE id = ?')
    .bind(now, userId)
    .run();

  // Log successful 2FA enablement
  await logSecurityEvent(userId, '2fa_enabled', request, env);

  return {
    enabled: true,
    backupCodes, // IMPORTANT: Show these to user only once
  };
}

/**
 * Disable 2FA
 * Requires current password and TOTP code
 */
export async function disable2FA(userId, password, token, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  if (user.totp_enabled !== 1) {
    throw new Error('2FA is not enabled');
  }

  // Verify password
  if (user.password_hash) {
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await logSecurityEvent(userId, '2fa_disable_failed', request, env, {
        reason: 'invalid_password',
      });
      throw new Error('Invalid password');
    }
  }

  // Verify TOTP token
  const secret = decryptSecret(user.totp_secret);
  const isValidToken = await verifyTOTP(secret, token);

  if (!isValidToken) {
    await logSecurityEvent(userId, '2fa_disable_failed', request, env, {
      reason: 'invalid_token',
    });
    throw new Error('Invalid verification code');
  }

  // Disable 2FA and remove secret
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare(`
      UPDATE users
      SET totp_enabled = 0, totp_secret = NULL, updated_at = ?
      WHERE id = ?
    `)
    .bind(now, userId)
    .run();

  // Delete all backup codes
  await env.DB
    .prepare('DELETE FROM backup_codes WHERE user_id = ?')
    .bind(userId)
    .run();

  // Log 2FA disabled
  await logSecurityEvent(userId, '2fa_disabled', request, env);

  return { disabled: true };
}

/**
 * Verify 2FA code during login
 * Can be TOTP token or backup code
 */
export async function verify2FA(userId, code, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  if (user.totp_enabled !== 1) {
    throw new Error('2FA is not enabled for this account');
  }

  // Check if it's a backup code format (XXXX-XXXX)
  if (code.includes('-')) {
    const isValidBackup = await consumeBackupCode(userId, code, env);

    if (isValidBackup) {
      await logSecurityEvent(userId, '2fa_backup_code_used', request, env);
      return { verified: true, method: 'backup_code' };
    } else {
      await logSecurityEvent(userId, '2fa_verification_failed', request, env, {
        reason: 'invalid_backup_code',
      });
      throw new Error('Invalid or already used backup code');
    }
  }

  // Otherwise, verify TOTP token
  const secret = decryptSecret(user.totp_secret);
  const isValid = await verifyTOTP(secret, code);

  if (!isValid) {
    await logSecurityEvent(userId, '2fa_verification_failed', request, env, {
      reason: 'invalid_totp',
    });
    throw new Error('Invalid verification code');
  }

  await logSecurityEvent(userId, '2fa_verified', request, env);
  return { verified: true, method: 'totp' };
}

/**
 * Get 2FA status for a user
 */
export async function get2FAStatus(userId, env) {
  const user = await env.DB
    .prepare('SELECT totp_enabled FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // Get backup codes count
  const backupCodesResult = await env.DB
    .prepare('SELECT COUNT(*) as count FROM backup_codes WHERE user_id = ? AND used = 0')
    .bind(userId)
    .first();

  return {
    enabled: user.totp_enabled === 1,
    backupCodesRemaining: backupCodesResult?.count || 0,
  };
}

/**
 * Regenerate backup codes
 * Requires TOTP verification
 */
export async function regenerateBackupCodes(userId, token, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  if (user.totp_enabled !== 1) {
    throw new Error('2FA is not enabled');
  }

  // Verify TOTP token
  const secret = decryptSecret(user.totp_secret);
  const isValid = await verifyTOTP(secret, token);

  if (!isValid) {
    await logSecurityEvent(userId, 'backup_codes_regenerate_failed', request, env, {
      reason: 'invalid_token',
    });
    throw new Error('Invalid verification code');
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes(10);

  // Store new backup codes (this deletes old ones)
  await storeBackupCodes(userId, backupCodes, env);

  // Log regeneration
  await logSecurityEvent(userId, 'backup_codes_regenerated', request, env);

  return {
    backupCodes, // IMPORTANT: Show these to user only once
  };
}
