/**
 * Settings Business Logic Handlers
 *
 * File path: workers/api/src/settings/handlers.js
 */

import * as OTPAuth from 'otpauth';
import { encode } from 'hi-base32';

function validateSettings(data) {
  const errors = [];
  const allowed = ['theme', 'notifications', 'emailNotifications', 'language'];

  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) {
      errors.push(`Invalid setting: ${key}`);
    }
  }

  if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
    errors.push('theme must be light, dark, or auto');
  }

  if (data.notifications !== undefined && typeof data.notifications !== 'boolean') {
    errors.push('notifications must be a boolean');
  }

  if (data.emailNotifications !== undefined && typeof data.emailNotifications !== 'boolean') {
    errors.push('emailNotifications must be a boolean');
  }

  if (data.language && typeof data.language !== 'string') {
    errors.push('language must be a string');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return data;
}

export async function getSettings(userId, env) {
  const result = await env.DB
    .prepare('SELECT settings FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first();

  if (!result) {
    // Return defaults if no settings exist
    return {
      theme: 'light',
      notifications: true,
      emailNotifications: true,
      language: 'en',
    };
  }

  return JSON.parse(result.settings);
}

export async function updateSettings(userId, data, env) {
  const validated = validateSettings(data);
  const currentSettings = await getSettings(userId, env);
  const newSettings = { ...currentSettings, ...validated };
  const settingsJson = JSON.stringify(newSettings);
  const now = Math.floor(Date.now() / 1000);

  // Upsert settings
  await env.DB
    .prepare(`
      INSERT INTO user_settings (user_id, settings, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        settings = excluded.settings,
        updated_at = excluded.updated_at
    `)
    .bind(userId, settingsJson, now)
    .run();

  return newSettings;
}

// Generate a random base32 secret
function generateSecret() {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return encode(buffer).replace(/=/g, '');
}

// Generate backup codes
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const code = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .match(/.{1,4}/g)
      .join('-');
    codes.push(code);
  }
  return codes;
}

export async function setup2FA(userId, email, env) {
  // Generate secret
  const secret = generateSecret();

  // Create TOTP instance
  const totp = new OTPAuth.TOTP({
    issuer: 'CyberSmrt',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  // Store temporary secret (not enabled yet)
  await env.DB
    .prepare(`
      UPDATE users
      SET totp_secret = ?
      WHERE id = ?
    `)
    .bind(secret, userId)
    .run();

  // Generate QR code URL
  const otpauthUrl = totp.toString();

  // For the QR code, we'll return the URL that the frontend can use
  // with a QR code generator library
  return {
    secret: secret,
    qrCode: otpauthUrl,
    message: 'Scan this QR code with your authenticator app',
  };
}

export async function enable2FA(userId, token, env) {
  if (!token || token.length !== 6) {
    throw new Error('Invalid verification code');
  }

  // Get user's temporary secret
  const user = await env.DB
    .prepare('SELECT totp_secret FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user || !user.totp_secret) {
    throw new Error('2FA setup not initiated. Please call setup first.');
  }

  // Verify the token
  const totp = new OTPAuth.TOTP({
    issuer: 'CyberSmrt',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.totp_secret,
  });

  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    throw new Error('Invalid verification code');
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes();
  const backupCodesJson = JSON.stringify(backupCodes);

  // Enable 2FA
  await env.DB
    .prepare(`
      UPDATE users
      SET totp_enabled = 1,
          totp_backup_codes = ?,
          updated_at = ?
      WHERE id = ?
    `)
    .bind(backupCodesJson, Math.floor(Date.now() / 1000), userId)
    .run();

  return {
    message: '2FA enabled successfully',
    backupCodes: backupCodes,
    warning: 'Save these backup codes in a safe place. You will not be able to see them again.',
  };
}

export async function disable2FA(userId, token, env) {
  if (!token || token.length !== 6) {
    throw new Error('Invalid verification code');
  }

  // Get user's 2FA info
  const user = await env.DB
    .prepare('SELECT totp_enabled, totp_secret FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user || !user.totp_enabled) {
    throw new Error('2FA is not enabled');
  }

  // Verify the token
  const totp = new OTPAuth.TOTP({
    issuer: 'CyberSmrt',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.totp_secret,
  });

  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    throw new Error('Invalid verification code');
  }

  // Disable 2FA
  await env.DB
    .prepare(`
      UPDATE users
      SET totp_enabled = 0,
          totp_secret = NULL,
          totp_backup_codes = NULL,
          updated_at = ?
      WHERE id = ?
    `)
    .bind(Math.floor(Date.now() / 1000), userId)
    .run();

  return {
    message: '2FA disabled successfully',
  };
}

export async function verify2FA(userId, token, env) {
  if (!token || token.length !== 6) {
    throw new Error('Invalid verification code');
  }

  // Get user's 2FA info
  const user = await env.DB
    .prepare('SELECT totp_enabled, totp_secret FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user || !user.totp_enabled) {
    throw new Error('2FA is not enabled');
  }

  // Verify the token
  const totp = new OTPAuth.TOTP({
    issuer: 'CyberSmrt',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.totp_secret,
  });

  const delta = totp.validate({ token, window: 1 });

  return {
    valid: delta !== null,
  };
}

export async function get2FAStatus(userId, env) {
  const user = await env.DB
    .prepare('SELECT totp_enabled, totp_backup_codes FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // Count remaining backup codes
  let backupCodesRemaining = 0;
  if (user.totp_backup_codes) {
    try {
      const codes = JSON.parse(user.totp_backup_codes);
      backupCodesRemaining = codes.length;
    } catch (e) {
      console.error('Error parsing backup codes:', e);
    }
  }

  return {
    enabled: user.totp_enabled === 1,
    backupCodesRemaining,
  };
}