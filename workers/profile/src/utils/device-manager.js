/**
 * Device Management Utilities
 * Handles trusted devices, device verification, and device-based security
 */

import { getDeviceInfo, generateDeviceFingerprint } from './device.js';
import { getGeolocation } from './geolocation.js';

/**
 * Record or update device information
 */
export async function recordDeviceActivity(userId, request, env) {
  try {
    const deviceInfo = await getDeviceInfo(request);
    const geolocation = getGeolocation(request);
    const ipAddress = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      'unknown';
    const now = Math.floor(Date.now() / 1000);

    // Check if device already exists
    const existingDevice = await env.DB.prepare(
      'SELECT * FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ?'
    ).bind(userId, deviceInfo.fingerprint).first();

    if (existingDevice) {
      // Update last used timestamp
      await env.DB.prepare(`
        UPDATE trusted_devices
        SET last_used_at = ?,
            ip_address = ?,
            location_city = ?,
            location_country = ?
        WHERE id = ?
      `).bind(
        now,
        ipAddress,
        geolocation.city,
        geolocation.country,
        existingDevice.id
      ).run();

      return {
        success: true,
        deviceId: existingDevice.id,
        isNewDevice: false,
        isTrusted: existingDevice.is_trusted === 1
      };
    } else {
      // Create new device record
      const deviceId = crypto.randomUUID();
      const deviceName = `${deviceInfo.browser} on ${deviceInfo.os}`;

      await env.DB.prepare(`
        INSERT INTO trusted_devices (
          id, user_id, device_fingerprint, device_name, device_type,
          browser, os, last_used_at, first_seen_at, ip_address,
          location_city, location_country, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        deviceId,
        userId,
        deviceInfo.fingerprint,
        deviceName,
        deviceInfo.device,
        deviceInfo.browser,
        deviceInfo.os,
        now,
        now,
        ipAddress,
        geolocation.city,
        geolocation.country,
        deviceInfo.userAgent,
        now
      ).run();

      return {
        success: true,
        deviceId,
        isNewDevice: true,
        isTrusted: false,
        deviceInfo: {
          name: deviceName,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          location: `${geolocation.city}, ${geolocation.country}`
        }
      };
    }
  } catch (error) {
    console.error('Failed to record device activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if device is trusted
 */
export async function isDeviceTrusted(userId, deviceFingerprint, env) {
  try {
    const device = await env.DB.prepare(
      'SELECT is_trusted FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ?'
    ).bind(userId, deviceFingerprint).first();

    return device ? device.is_trusted === 1 : false;
  } catch (error) {
    console.error('Failed to check device trust:', error);
    return false;
  }
}

/**
 * Trust a device
 */
export async function trustDevice(userId, deviceFingerprint, env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    const result = await env.DB.prepare(`
      UPDATE trusted_devices
      SET is_trusted = 1, trust_granted_at = ?
      WHERE user_id = ? AND device_fingerprint = ?
    `).bind(now, userId, deviceFingerprint).run();

    return { success: result.success, trustedAt: now };
  } catch (error) {
    console.error('Failed to trust device:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Untrust a device
 */
export async function untrustDevice(userId, deviceFingerprint, env) {
  try {
    const result = await env.DB.prepare(`
      UPDATE trusted_devices
      SET is_trusted = 0, trust_granted_at = NULL
      WHERE user_id = ? AND device_fingerprint = ?
    `).bind(userId, deviceFingerprint).run();

    return { success: result.success };
  } catch (error) {
    console.error('Failed to untrust device:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a device
 */
export async function removeDevice(userId, deviceId, env) {
  try {
    const result = await env.DB.prepare(
      'DELETE FROM trusted_devices WHERE user_id = ? AND id = ?'
    ).bind(userId, deviceId).run();

    return { success: result.success };
  } catch (error) {
    console.error('Failed to remove device:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId, env) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id, device_fingerprint, device_name, device_type,
        browser, os, is_trusted, trust_granted_at,
        last_used_at, first_seen_at, ip_address,
        location_city, location_country
      FROM trusted_devices
      WHERE user_id = ?
      ORDER BY last_used_at DESC
    `).bind(userId).all();

    return {
      success: true,
      devices: result.results.map(device => ({
        ...device,
        isTrusted: device.is_trusted === 1,
        isCurrent: false // Will be set by caller if needed
      }))
    };
  } catch (error) {
    console.error('Failed to get user devices:', error);
    return { success: false, error: error.message, devices: [] };
  }
}

/**
 * Create device verification challenge
 */
export async function createDeviceChallenge(userId, request, env, challengeType = 'email') {
  try {
    const deviceInfo = await getDeviceInfo(request);
    const geolocation = getGeolocation(request);
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (15 * 60); // 15 minutes

    const challengeId = crypto.randomUUID();
    const challengeCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

    await env.DB.prepare(`
      INSERT INTO device_verification_challenges (
        id, user_id, device_fingerprint, challenge_type, challenge_code,
        ip_address, location_city, location_country, user_agent,
        expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      challengeId,
      userId,
      deviceInfo.fingerprint,
      challengeType,
      challengeCode,
      ipAddress,
      geolocation.city,
      geolocation.country,
      deviceInfo.userAgent,
      expiresAt,
      now
    ).run();

    return {
      success: true,
      challengeId,
      challengeCode,
      expiresAt,
      deviceInfo: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        location: `${geolocation.city}, ${geolocation.country}`
      }
    };
  } catch (error) {
    console.error('Failed to create device challenge:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify device challenge
 */
export async function verifyDeviceChallenge(userId, challengeCode, env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    // Find matching challenge
    const challenge = await env.DB.prepare(`
      SELECT * FROM device_verification_challenges
      WHERE user_id = ? AND challenge_code = ? AND status = 'pending'
    `).bind(userId, challengeCode).first();

    if (!challenge) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Check if expired
    if (now > challenge.expires_at) {
      // Mark as expired
      await env.DB.prepare(`
        UPDATE device_verification_challenges
        SET status = 'expired'
        WHERE id = ?
      `).bind(challenge.id).run();

      return { success: false, error: 'Verification code has expired' };
    }

    // Mark as approved
    await env.DB.prepare(`
      UPDATE device_verification_challenges
      SET status = 'approved', verified_at = ?
      WHERE id = ?
    `).bind(now, challenge.id).run();

    // Trust the device
    await trustDevice(userId, challenge.device_fingerprint, env);

    return { success: true, deviceFingerprint: challenge.device_fingerprint };
  } catch (error) {
    console.error('Failed to verify device challenge:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deny device challenge
 */
export async function denyDeviceChallenge(userId, challengeId, env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      UPDATE device_verification_challenges
      SET status = 'denied', verified_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(now, challengeId, userId).run();

    return { success: true };
  } catch (error) {
    console.error('Failed to deny device challenge:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Record login attempt
 */
export async function recordLoginAttempt(email, ipAddress, deviceFingerprint, success, failureReason, env) {
  try {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT INTO login_attempts (
        id, email, ip_address, device_fingerprint, success, failure_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, email, ipAddress, deviceFingerprint, success ? 1 : 0, failureReason, now).run();

    return { success: true };
  } catch (error) {
    console.error('Failed to record login attempt:', error);
    return { success: false };
  }
}

/**
 * Check for account lockout
 */
export async function checkAccountLockout(email, env) {
  try {
    const user = await env.DB.prepare(
      'SELECT id, locked_until, failed_login_count FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
      return { locked: false };
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if currently locked
    if (user.locked_until && user.locked_until > now) {
      const remainingSeconds = user.locked_until - now;
      return {
        locked: true,
        lockedUntil: user.locked_until,
        remainingSeconds
      };
    }

    // Check recent failed attempts
    const fifteenMinutesAgo = now - (15 * 60);
    const recentFailures = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE email = ? AND success = 0 AND created_at >= ?
    `).bind(email, fifteenMinutesAgo).first();

    return {
      locked: false,
      recentFailureCount: recentFailures.count
    };
  } catch (error) {
    console.error('Failed to check account lockout:', error);
    return { locked: false, error: error.message };
  }
}

/**
 * Lock account after too many failed attempts
 */
export async function lockAccount(email, durationMinutes, env) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const lockedUntil = now + (durationMinutes * 60);

    await env.DB.prepare(`
      UPDATE users
      SET locked_until = ?, failed_login_count = failed_login_count + 1, last_failed_login_at = ?
      WHERE email = ?
    `).bind(lockedUntil, now, email).run();

    return { success: true, lockedUntil };
  } catch (error) {
    console.error('Failed to lock account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset failed login count
 */
export async function resetFailedLoginCount(email, env) {
  try {
    await env.DB.prepare(`
      UPDATE users
      SET failed_login_count = 0, locked_until = NULL
      WHERE email = ?
    `).bind(email).run();

    return { success: true };
  } catch (error) {
    console.error('Failed to reset failed login count:', error);
    return { success: false };
  }
}

/**
 * Clean up old login attempts (call from scheduled event)
 */
export async function cleanupOldLoginAttempts(env, daysToKeep = 30) {
  try {
    const cutoffTime = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);

    const result = await env.DB.prepare(
      'DELETE FROM login_attempts WHERE created_at < ?'
    ).bind(cutoffTime).run();

    return { success: true, deleted: result.meta.changes };
  } catch (error) {
    console.error('Failed to cleanup old login attempts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clean up expired device challenges
 */
export async function cleanupExpiredChallenges(env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    const result = await env.DB.prepare(`
      UPDATE device_verification_challenges
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < ?
    `).bind(now).run();

    return { success: true, expired: result.meta.changes };
  } catch (error) {
    console.error('Failed to cleanup expired challenges:', error);
    return { success: false, error: error.message };
  }
}
