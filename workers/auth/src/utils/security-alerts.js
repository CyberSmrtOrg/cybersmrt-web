/**
 * Security Alert Email System
 * Sends email notifications for critical security events
 * Now using centralized EmailService
 */

import { createEmailService } from '../../../shared/email-service.js';

/**
 * Send alert for login from new device
 */
export async function sendNewDeviceAlert(user, deviceInfo, geolocation, timestamp, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('newDeviceAlert', user.email, {
      displayName: user.display_name,
      time: new Date(timestamp * 1000).toLocaleString(),
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      location: geolocation?.location
    }, { from: 'CyberSmrt Security <security@cybersmrt.org>' });
    return true;
  } catch (error) {
    console.error('Failed to send new device alert:', error);
    return false;
  }
}

/**
 * Send alert for login from new location
 */
export async function sendNewLocationAlert(user, geolocation, distance, timestamp, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('newLocationAlert', user.email, {
      displayName: user.display_name,
      time: new Date(timestamp * 1000).toLocaleString(),
      location: geolocation?.location,
      country: geolocation?.countryName,
      city: geolocation?.city,
      distance
    }, { from: 'CyberSmrt Security <security@cybersmrt.org>' });
    return true;
  } catch (error) {
    console.error('Failed to send new location alert:', error);
    return false;
  }
}

/**
 * Send alert for multiple failed login attempts
 */
export async function sendFailedLoginAlert(email, attempts, timestamp, ipAddress, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('failedLoginAlert', email, {
      time: new Date(timestamp * 1000).toLocaleString(),
      attempts,
      ipAddress
    }, { from: 'CyberSmrt Security <security@cybersmrt.org>' });
    return true;
  } catch (error) {
    console.error('Failed to send failed login alert:', error);
    return false;
  }
}

/**
 * Send alert for 2FA disabled
 */
export async function send2FADisabledAlert(user, deviceInfo, geolocation, timestamp, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('twoFADisabledAlert', user.email, {
      displayName: user.display_name,
      time: new Date(timestamp * 1000).toLocaleString(),
      browser: deviceInfo?.browser,
      location: geolocation?.location
    }, { from: 'CyberSmrt Security <security@cybersmrt.org>' });
    return true;
  } catch (error) {
    console.error('Failed to send 2FA disabled alert:', error);
    return false;
  }
}

/**
 * Send alert for suspicious activity
 */
export async function sendSuspiciousActivityAlert(user, analysis, timestamp, env) {
  const emailService = createEmailService(env);

  const flagDescriptions = {
    multiple_failed_logins: 'Multiple failed login attempts',
    new_device: 'Login from a new device',
    unusual_location: 'Login from an unusual location',
    rapid_requests: 'Rapid succession of requests',
    account_enumeration: 'Potential account enumeration attempt',
  };

  const flags = analysis.flags.map(flag => flagDescriptions[flag] || flag);

  try {
    await emailService.send('suspiciousActivityAlert', user.email, {
      displayName: user.display_name,
      riskLevel: analysis.riskLevel,
      riskScore: analysis.riskScore,
      flags,
      time: new Date(timestamp * 1000).toLocaleString()
    }, { from: 'CyberSmrt Security <security@cybersmrt.org>' });
    return true;
  } catch (error) {
    console.error('Failed to send suspicious activity alert:', error);
    return false;
  }
}

/**
 * Determine if event should trigger an email alert
 */
export function shouldSendAlert(eventType, securityAnalysis) {
  // Always send for these critical events
  const criticalEvents = [
    '2fa_disabled',
    'password_change',
    'account_locked',
  ];

  if (criticalEvents.includes(eventType)) {
    return true;
  }

  // Send for logins with security flags
  if (eventType === 'login_success' && securityAnalysis) {
    return securityAnalysis.flags.length > 0;
  }

  return false;
}

/**
 * Send appropriate alert based on event type and analysis
 */
export async function sendEventAlert(userId, eventType, enrichedDetails, env) {
  try {
    // Get user info
    const user = await env.DB
      .prepare('SELECT id, email, display_name FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user || !user.email) {
      return false;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const device = enrichedDetails.device || {};
    const geolocation = enrichedDetails.geolocation || {};
    const securityAnalysis = enrichedDetails.securityAnalysis || {};

    // Determine which alert to send
    switch (eventType) {
      case '2fa_disabled':
        return await send2FADisabledAlert(user, device, geolocation, timestamp, env);

      case 'login_success':
        if (!securityAnalysis.flags) break;

        // Check for specific flags
        if (securityAnalysis.flags.includes('new_device')) {
          await sendNewDeviceAlert(user, device, geolocation, timestamp, env);
        }

        if (securityAnalysis.flags.includes('unusual_location')) {
          const distance = securityAnalysis.details?.location?.distance;
          await sendNewLocationAlert(user, geolocation, distance, timestamp, env);
        }

        // Send general suspicious activity alert for high risk
        if (securityAnalysis.riskLevel === 'high' || securityAnalysis.riskLevel === 'critical') {
          await sendSuspiciousActivityAlert(user, securityAnalysis, timestamp, env);
        }
        return true;

      case 'password_change':
        // Use existing password changed email from email.js
        return true;

      default:
        return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending security alert:', error);
    return false;
  }
}
