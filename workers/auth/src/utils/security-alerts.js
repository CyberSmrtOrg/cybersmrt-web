/**
 * Security Alert Email System
 * Sends email notifications for critical security events
 */

/**
 * Send security alert email via Resend
 */
async function sendSecurityAlert(email, subject, content, env) {
  const emailContent = {
    from: 'CyberSmrt Security <security@cybersmrt.org>',
    to: [email],
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .header.info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .info-box { background: #e0e7ff; border: 1px solid #6366f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .detail-value { color: #111827; }
    .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send security alert:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending security alert:', error);
    return false;
  }
}

/**
 * Send alert for login from new device
 */
export async function sendNewDeviceAlert(user, deviceInfo, geolocation, timestamp, env) {
  const subject = '🔒 New Device Login Detected';
  const content = `
<div class="container">
  <div class="header warning">
    <h1>🔒 New Device Login</h1>
  </div>
  <div class="content">
    <p>Hi ${user.display_name || 'there'},</p>
    <p>We detected a login to your CyberSmrt account from a new device.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Login Details</h3>
      <div class="detail-row">
        <span class="detail-label">Time:</span>
        <span class="detail-value">${new Date(timestamp * 1000).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Device:</span>
        <span class="detail-value">${deviceInfo.device || 'Unknown'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Browser:</span>
        <span class="detail-value">${deviceInfo.browser || 'Unknown'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Operating System:</span>
        <span class="detail-value">${deviceInfo.os || 'Unknown'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${geolocation?.location || 'Unknown'}</span>
      </div>
    </div>

    <div class="alert">
      <p><strong>⚠️ If this wasn't you:</strong></p>
      <ul>
        <li>Change your password immediately</li>
        <li>Enable two-factor authentication</li>
        <li>Review your security activity log</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
    </p>

    <div class="footer">
      <p>Best regards,<br>The CyberSmrt Security Team</p>
      <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
    </div>
  </div>
</div>`;

  return await sendSecurityAlert(user.email, subject, content, env);
}

/**
 * Send alert for login from new location
 */
export async function sendNewLocationAlert(user, geolocation, distance, timestamp, env) {
  const subject = '🌍 Login From New Location Detected';
  const content = `
<div class="container">
  <div class="header warning">
    <h1>🌍 New Location Login</h1>
  </div>
  <div class="content">
    <p>Hi ${user.display_name || 'there'},</p>
    <p>We detected a login to your CyberSmrt account from a new location${distance ? ` (${distance}km from your usual location)` : ''}.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Login Details</h3>
      <div class="detail-row">
        <span class="detail-label">Time:</span>
        <span class="detail-value">${new Date(timestamp * 1000).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${geolocation?.location || 'Unknown'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Country:</span>
        <span class="detail-value">${geolocation?.countryName || 'Unknown'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">City:</span>
        <span class="detail-value">${geolocation?.city || 'Unknown'}</span>
      </div>
    </div>

    <div class="alert">
      <p><strong>⚠️ If this wasn't you:</strong></p>
      <ul>
        <li>Change your password immediately</li>
        <li>Review your active sessions</li>
        <li>Enable two-factor authentication if you haven't already</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
    </p>

    <div class="footer">
      <p>Best regards,<br>The CyberSmrt Security Team</p>
      <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
    </div>
  </div>
</div>`;

  return await sendSecurityAlert(user.email, subject, content, env);
}

/**
 * Send alert for multiple failed login attempts
 */
export async function sendFailedLoginAlert(email, attempts, timestamp, ipAddress, env) {
  const subject = '⚠️ Multiple Failed Login Attempts Detected';
  const content = `
<div class="container">
  <div class="header">
    <h1>⚠️ Failed Login Attempts</h1>
  </div>
  <div class="content">
    <p>Hi there,</p>
    <p>We detected ${attempts} failed login attempts on your CyberSmrt account in the last 15 minutes.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Attempt Details</h3>
      <div class="detail-row">
        <span class="detail-label">Time:</span>
        <span class="detail-value">${new Date(timestamp * 1000).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Failed Attempts:</span>
        <span class="detail-value">${attempts}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">IP Address:</span>
        <span class="detail-value">${ipAddress}</span>
      </div>
    </div>

    <div class="alert">
      <p><strong>🛡️ Recommended Actions:</strong></p>
      <ul>
        <li>Change your password if you suspect unauthorized access</li>
        <li>Enable two-factor authentication for extra security</li>
        <li>Review your security activity log</li>
        <li>Make sure your password is strong and unique</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
    </p>

    <div class="footer">
      <p>Best regards,<br>The CyberSmrt Security Team</p>
      <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
    </div>
  </div>
</div>`;

  return await sendSecurityAlert(email, subject, content, env);
}

/**
 * Send alert for 2FA disabled
 */
export async function send2FADisabledAlert(user, deviceInfo, geolocation, timestamp, env) {
  const subject = '🔐 Two-Factor Authentication Disabled';
  const content = `
<div class="container">
  <div class="header">
    <h1>🔐 2FA Disabled</h1>
  </div>
  <div class="content">
    <p>Hi ${user.display_name || 'there'},</p>
    <p>Two-factor authentication was disabled on your CyberSmrt account.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Action Details</h3>
      <div class="detail-row">
        <span class="detail-label">Time:</span>
        <span class="detail-value">${new Date(timestamp * 1000).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Browser:</span>
        <span class="detail-value">${deviceInfo?.browser || 'Unknown'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${geolocation?.location || 'Unknown'}</span>
      </div>
    </div>

    <div class="alert">
      <p><strong>⚠️ If this wasn't you:</strong></p>
      <ul>
        <li>Change your password immediately</li>
        <li>Re-enable two-factor authentication</li>
        <li>Review your security activity log</li>
        <li>End all active sessions except your current one</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="https://cybersmrt.org/2fa-settings.html" class="button">Re-Enable 2FA</a>
    </p>

    <div class="footer">
      <p>Best regards,<br>The CyberSmrt Security Team</p>
      <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
    </div>
  </div>
</div>`;

  return await sendSecurityAlert(user.email, subject, content, env);
}

/**
 * Send alert for suspicious activity
 */
export async function sendSuspiciousActivityAlert(user, analysis, timestamp, env) {
  const riskLevelColors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#3b82f6',
  };

  const color = riskLevelColors[analysis.riskLevel] || '#3b82f6';
  const subject = `⚠️ Suspicious Activity Detected (${analysis.riskLevel.toUpperCase()} Risk)`;

  const flagDescriptions = {
    multiple_failed_logins: 'Multiple failed login attempts',
    new_device: 'Login from a new device',
    unusual_location: 'Login from an unusual location',
    rapid_requests: 'Rapid succession of requests',
    account_enumeration: 'Potential account enumeration attempt',
  };

  const flagsList = analysis.flags.map(flag =>
    `<li>${flagDescriptions[flag] || flag}</li>`
  ).join('');

  const content = `
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);">
    <h1>⚠️ Suspicious Activity</h1>
  </div>
  <div class="content">
    <p>Hi ${user.display_name || 'there'},</p>
    <p>We detected suspicious activity on your CyberSmrt account with a <strong>${analysis.riskLevel}</strong> risk level (score: ${analysis.riskScore}/100).</p>

    <div class="alert">
      <h3 style="margin-top: 0;">Suspicious Patterns Detected:</h3>
      <ul>${flagsList}</ul>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0;">Event Time</h3>
      <p>${new Date(timestamp * 1000).toLocaleString()}</p>
    </div>

    <div class="alert">
      <p><strong>🛡️ Recommended Actions:</strong></p>
      <ul>
        <li>Review your recent security activity</li>
        <li>Change your password if you notice anything unusual</li>
        <li>Enable two-factor authentication if not already enabled</li>
        <li>Review and end any suspicious active sessions</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
    </p>

    <div class="footer">
      <p>Best regards,<br>The CyberSmrt Security Team</p>
      <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
    </div>
  </div>
</div>`;

  return await sendSecurityAlert(user.email, subject, content, env);
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
