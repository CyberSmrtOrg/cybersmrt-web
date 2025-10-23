/**
 * Security Logging
 * Audit trail for all security-related events
 */

import { getDeviceInfo, generateDeviceFingerprint } from './device.js';
import { getGeolocation, getLocationString } from './geolocation.js';
import { analyzeActivity } from './suspicious.js';
import { shouldSendAlert, sendEventAlert } from './security-alerts.js';

/**
 * Log security event to database with enhanced metadata
 */
export async function logSecurityEvent(userId, eventType, request, env, details = null, options = {}) {
  const logId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const ipAddress = request?.headers.get('CF-Connecting-IP') ||
                    request?.headers.get('X-Forwarded-For') ||
                    'unknown';
  const userAgent = request?.headers.get('User-Agent') || 'unknown';

  // Enhanced logging with device, geolocation, and security analysis
  const enrichedDetails = details || {};

  try {
    // Add device information
    if (request && !options.skipDeviceInfo) {
      const deviceInfo = await getDeviceInfo(request);
      enrichedDetails.device = {
        fingerprint: deviceInfo.fingerprint,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        type: deviceInfo.device,
        isMobile: deviceInfo.isMobile,
      };
    }

    // Add geolocation information
    if (request && !options.skipGeolocation) {
      const geolocation = getGeolocation(request);
      enrichedDetails.geolocation = {
        country: geolocation.country,
        countryName: geolocation.countryName,
        region: geolocation.region,
        city: geolocation.city,
        timezone: geolocation.timezone,
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        location: getLocationString(geolocation),
      };
    }

    // Perform suspicious activity analysis for certain event types
    if (!options.skipSuspiciousCheck && userId && request) {
      const checkEvents = [
        'login_success',
        'password_change',
        '2fa_disabled',
        'session_created'
      ];

      if (checkEvents.includes(eventType)) {
        const deviceFingerprint = enrichedDetails.device?.fingerprint;
        const geolocation = enrichedDetails.geolocation;

        const analysis = await analyzeActivity(
          userId,
          ipAddress,
          deviceFingerprint,
          geolocation,
          env,
          {
            checkFailedLogins: eventType === 'login_success',
            checkEnumeration: false,
          }
        );

        if (analysis.flags.length > 0) {
          enrichedDetails.securityAnalysis = {
            flags: analysis.flags,
            riskScore: analysis.riskScore,
            riskLevel: analysis.riskLevel,
            details: analysis.details,
          };
        }
      }
    }
  } catch (error) {
    // Don't fail logging if enrichment fails
    console.error('Error enriching security log:', error);
    enrichedDetails.enrichmentError = error.message;
  }

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
      JSON.stringify(enrichedDetails),
      now
    )
    .run();

  // Send email alert if needed (async, don't wait)
  if (!options.skipAlerts && userId && shouldSendAlert(eventType, enrichedDetails.securityAnalysis)) {
    sendEventAlert(userId, eventType, enrichedDetails, env).catch(err => {
      console.error('Failed to send security alert:', err);
    });
  }

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