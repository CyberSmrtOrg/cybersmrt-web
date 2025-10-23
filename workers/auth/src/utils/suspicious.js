/**
 * Suspicious Activity Detection
 * Analyzes patterns to detect potential security threats
 */

import { calculateDistance } from './geolocation.js';

/**
 * Check for multiple failed login attempts
 */
export async function checkFailedLoginAttempts(identifier, env, timeWindowMinutes = 15) {
  const cutoff = Math.floor(Date.now() / 1000) - (timeWindowMinutes * 60);

  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count
      FROM security_logs
      WHERE (details LIKE ? OR ip_address = ?)
        AND event_type IN ('login_failed', 'invalid_credentials', '2fa_verification_failed')
        AND created_at > ?
    `)
    .bind(`%"email":"${identifier}"%`, identifier, cutoff)
    .first();

  const failedAttempts = result?.count || 0;

  return {
    isSuspicious: failedAttempts >= 5,
    failedAttempts,
    timeWindow: timeWindowMinutes,
  };
}

/**
 * Check if this is a new device for the user
 */
export async function checkNewDevice(userId, deviceFingerprint, env) {
  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count
      FROM security_logs
      WHERE user_id = ?
        AND details LIKE ?
        AND created_at > ?
    `)
    .bind(
      userId,
      `%"fingerprint":"${deviceFingerprint}"%`,
      Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // Last 90 days
    )
    .first();

  return (result?.count || 0) === 0;
}

/**
 * Check if login is from unusual location
 */
export async function checkUnusualLocation(userId, currentGeo, env) {
  const recentLogins = await env.DB
    .prepare(`
      SELECT details, created_at
      FROM security_logs
      WHERE user_id = ?
        AND event_type IN ('login_success', 'oauth_login_success')
        AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 20
    `)
    .bind(userId, Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60))
    .all();

  if (!recentLogins.results || recentLogins.results.length === 0) {
    return { isUnusual: false, reason: 'no_history' };
  }

  const currentLat = currentGeo.latitude;
  const currentLon = currentGeo.longitude;

  if (!currentLat || !currentLon) {
    return { isUnusual: false, reason: 'no_coordinates' };
  }

  // Check country changes
  const countries = new Set();
  for (const login of recentLogins.results) {
    try {
      const details = JSON.parse(login.details || '{}');
      if (details.geolocation?.country) {
        countries.add(details.geolocation.country);
      }
    } catch (e) {
      continue;
    }
  }

  const isNewCountry = !countries.has(currentGeo.country);

  // Calculate minimum distance from recent logins
  let minDistance = Infinity;
  for (const login of recentLogins.results) {
    try {
      const details = JSON.parse(login.details || '{}');
      const geo = details.geolocation || {};

      if (geo.latitude && geo.longitude) {
        const distance = calculateDistance(
          currentLat,
          currentLon,
          geo.latitude,
          geo.longitude
        );

        if (distance !== null && distance < minDistance) {
          minDistance = distance;
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Flag as unusual if:
  // 1. New country AND > 1000km away, OR
  // 2. > 2000km from any recent login
  const isUnusual = (isNewCountry && minDistance > 1000) || minDistance > 2000;

  return {
    isUnusual,
    reason: isUnusual ? (isNewCountry ? 'new_country' : 'far_distance') : null,
    distance: minDistance === Infinity ? null : minDistance,
    newCountry: isNewCountry,
  };
}

/**
 * Check for rapid requests (potential bot/automated attack)
 */
export async function checkRapidRequests(ipAddress, env, timeWindowSeconds = 60) {
  const cutoff = Math.floor(Date.now() / 1000) - timeWindowSeconds;

  const result = await env.DB
    .prepare(`
      SELECT COUNT(*) as count
      FROM security_logs
      WHERE ip_address = ?
        AND created_at > ?
    `)
    .bind(ipAddress, cutoff)
    .first();

  const requestCount = result?.count || 0;

  return {
    isSuspicious: requestCount > 20, // More than 20 requests in 60 seconds
    requestCount,
    timeWindow: timeWindowSeconds,
  };
}

/**
 * Check for account enumeration attempts
 * Detects when someone is trying multiple email addresses
 */
export async function checkAccountEnumeration(ipAddress, env, timeWindowMinutes = 30) {
  const cutoff = Math.floor(Date.now() / 1000) - (timeWindowMinutes * 60);

  const result = await env.DB
    .prepare(`
      SELECT details
      FROM security_logs
      WHERE ip_address = ?
        AND event_type IN ('login_failed', 'invalid_credentials')
        AND created_at > ?
    `)
    .bind(ipAddress, cutoff)
    .all();

  if (!result.results || result.results.length < 5) {
    return { isSuspicious: false, uniqueEmails: 0 };
  }

  // Count unique emails attempted
  const emails = new Set();
  for (const log of result.results) {
    try {
      const details = JSON.parse(log.details || '{}');
      if (details.email) {
        emails.add(details.email);
      }
    } catch (e) {
      continue;
    }
  }

  return {
    isSuspicious: emails.size >= 5, // 5+ different emails from same IP
    uniqueEmails: emails.size,
    attempts: result.results.length,
  };
}

/**
 * Comprehensive suspicious activity check
 * Runs all checks and returns combined analysis
 */
export async function analyzeActivity(userId, ipAddress, deviceFingerprint, geolocation, env, context = {}) {
  const checks = {
    timestamp: new Date().toISOString(),
    userId,
    ipAddress,
    flags: [],
    riskScore: 0, // 0-100
    details: {},
  };

  // Check failed login attempts (for IP)
  if (context.checkFailedLogins) {
    const failedLogins = await checkFailedLoginAttempts(ipAddress, env);
    if (failedLogins.isSuspicious) {
      checks.flags.push('multiple_failed_logins');
      checks.riskScore += 30;
      checks.details.failedLogins = failedLogins;
    }
  }

  // Check for new device
  if (userId && deviceFingerprint) {
    const isNewDevice = await checkNewDevice(userId, deviceFingerprint, env);
    if (isNewDevice) {
      checks.flags.push('new_device');
      checks.riskScore += 15;
      checks.details.newDevice = true;
    }
  }

  // Check for unusual location
  if (userId && geolocation) {
    const locationCheck = await checkUnusualLocation(userId, geolocation, env);
    if (locationCheck.isUnusual) {
      checks.flags.push('unusual_location');
      checks.riskScore += 25;
      checks.details.location = locationCheck;
    }
  }

  // Check for rapid requests
  const rapidRequests = await checkRapidRequests(ipAddress, env);
  if (rapidRequests.isSuspicious) {
    checks.flags.push('rapid_requests');
    checks.riskScore += 20;
    checks.details.rapidRequests = rapidRequests;
  }

  // Check for account enumeration
  if (context.checkEnumeration) {
    const enumeration = await checkAccountEnumeration(ipAddress, env);
    if (enumeration.isSuspicious) {
      checks.flags.push('account_enumeration');
      checks.riskScore += 40;
      checks.details.enumeration = enumeration;
    }
  }

  checks.riskLevel = getRiskLevel(checks.riskScore);

  return checks;
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}
