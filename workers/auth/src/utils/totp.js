/**
 * TOTP (Time-based One-Time Password) Utilities
 * Implements RFC 6238 for Two-Factor Authentication
 */

import { hashPassword, verifyPassword } from './password.js';

/**
 * Generate a random base32 secret for TOTP
 */
export function generateTOTPSecret() {
  const buffer = new Uint8Array(20); // 160 bits
  crypto.getRandomValues(buffer);
  return base32Encode(buffer);
}

/**
 * Base32 encoding (used by authenticator apps)
 */
function base32Encode(buffer) {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Chars[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding
 */
function base32Decode(encoded) {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  encoded = encoded.toUpperCase().replace(/=+$/, '');

  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor(encoded.length * 5 / 8));

  for (let i = 0; i < encoded.length; i++) {
    const idx = base32Chars.indexOf(encoded[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output;
}

/**
 * Generate HOTP (HMAC-based One-Time Password)
 */
async function generateHOTP(secret, counter) {
  const decodedSecret = base32Decode(secret);

  // Convert counter to 8-byte buffer
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setBigUint64(0, BigInt(counter), false);

  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    decodedSecret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  // Generate HMAC
  const hmac = await crypto.subtle.sign(
    'HMAC',
    key,
    counterBuffer
  );

  const hmacArray = new Uint8Array(hmac);

  // Dynamic truncation
  const offset = hmacArray[hmacArray.length - 1] & 0x0f;
  const code = (
    ((hmacArray[offset] & 0x7f) << 24) |
    ((hmacArray[offset + 1] & 0xff) << 16) |
    ((hmacArray[offset + 2] & 0xff) << 8) |
    (hmacArray[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

/**
 * Generate TOTP code for current time
 */
export async function generateTOTP(secret, timeStep = 30) {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return generateHOTP(secret, counter);
}

/**
 * Verify TOTP code
 * Allows for time drift of ±1 time window (default 30s)
 */
export async function verifyTOTP(secret, token, window = 1, timeStep = 30) {
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  // Check current time and adjacent windows for clock drift
  for (let i = -window; i <= window; i++) {
    const code = await generateHOTP(secret, currentCounter + i);
    if (code === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate QR code data URL for TOTP setup
 * Returns otpauth:// URL that authenticator apps can scan
 */
export function generateTOTPUrl(secret, email, issuer = 'CyberSmrt') {
  const encodedEmail = encodeURIComponent(email);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate backup codes for 2FA recovery
 * Returns array of backup codes
 */
export function generateBackupCodes(count = 10) {
  const codes = [];

  for (let i = 0; i < count; i++) {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);

    // Convert to 8-digit numeric code
    const num = (buffer[0] << 24 | buffer[1] << 16 | buffer[2] << 8 | buffer[3]) >>> 0;
    const code = (num % 100000000).toString().padStart(8, '0');

    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Hash backup code for storage
 */
export async function hashBackupCode(code) {
  // Remove formatting
  const cleanCode = code.replace(/-/g, '');
  return hashPassword(cleanCode);
}

/**
 * Verify backup code against hash
 */
export async function verifyBackupCode(code, hash) {
  const cleanCode = code.replace(/-/g, '');

  // Use Web Crypto API to verify bcrypt hash
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanCode);

  // Import the hash for verification
  // Note: This is a simplified approach. In production, use proper bcrypt verification
  const hashBuffer = encoder.encode(hash);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // For now, we'll use string comparison after hashing
  const computed = await hashPassword(cleanCode);
  return computed === hash;
}

/**
 * Store backup codes in database
 */
export async function storeBackupCodes(userId, codes, env) {
  // Delete existing backup codes
  await env.DB
    .prepare('DELETE FROM backup_codes WHERE user_id = ?')
    .bind(userId)
    .run();

  // Store new backup codes
  const now = Math.floor(Date.now() / 1000);

  for (const code of codes) {
    const codeHash = await hashBackupCode(code);
    const codeId = crypto.randomUUID();

    await env.DB
      .prepare(`
        INSERT INTO backup_codes (id, user_id, code_hash, used, created_at)
        VALUES (?, ?, ?, 0, ?)
      `)
      .bind(codeId, userId, codeHash, now)
      .run();
  }
}

/**
 * Verify and consume a backup code
 */
export async function consumeBackupCode(userId, code, env) {
  const cleanCode = code.replace(/-/g, '');

  // Get all unused backup codes for user
  const codes = await env.DB
    .prepare('SELECT * FROM backup_codes WHERE user_id = ? AND used = 0')
    .bind(userId)
    .all();

  if (!codes.results || codes.results.length === 0) {
    return false;
  }

  // Check each code
  for (const storedCode of codes.results) {
    // Use proper bcrypt verification
    const isValid = await verifyPassword(cleanCode, storedCode.code_hash);

    if (isValid) {
      // Mark code as used
      const now = Math.floor(Date.now() / 1000);
      await env.DB
        .prepare('UPDATE backup_codes SET used = 1, used_at = ? WHERE id = ?')
        .bind(now, storedCode.id)
        .run();

      return true;
    }
  }

  return false;
}

/**
 * Encrypt TOTP secret for storage
 * In production, use proper encryption. For now, we'll store as-is with a note.
 * TODO: Implement proper encryption using Cloudflare Workers KV encryption
 */
export function encryptSecret(secret) {
  // In production, encrypt this with a key from environment variables
  // For now, return base64 encoded
  return btoa(secret);
}

/**
 * Decrypt TOTP secret from storage
 */
export function decryptSecret(encrypted) {
  // In production, decrypt this with a key from environment variables
  // For now, return base64 decoded
  return atob(encrypted);
}
