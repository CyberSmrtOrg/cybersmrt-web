/**
 * Security Logging and Alerting for Admin Dashboard
 * Provides granular logging and real-time alerts for security incidents
 */

// Security event severity levels
export const SEVERITY = {
  INFO: 'info',           // Normal operations
  WARNING: 'warning',     // Suspicious but not critical
  CRITICAL: 'critical',   // Security incident requiring immediate attention
  EMERGENCY: 'emergency', // Active attack or breach
};

// Security event types
export const EVENT_TYPE = {
  // Access events
  LOGIN_SUCCESS: 'admin_login_success',
  LOGIN_FAILED_INVALID_EMAIL: 'admin_login_failed_invalid_email',
  LOGIN_FAILED_INVALID_ROLE: 'admin_login_failed_invalid_role',
  LOGIN_FAILED_TOKEN_INVALID: 'admin_login_failed_token_invalid',
  LOGOUT: 'admin_logout',

  // Access attempts
  UNAUTHORIZED_EMAIL_ATTEMPT: 'unauthorized_email_attempt',
  UNAUTHORIZED_ROLE_ATTEMPT: 'unauthorized_role_attempt',
  REPEATED_FAILED_ACCESS: 'repeated_failed_access',

  // API access
  API_ACCESS_SUCCESS: 'api_access_success',
  API_ACCESS_DENIED: 'api_access_denied',
  API_STATS_VIEWED: 'api_stats_viewed',
  API_USERS_VIEWED: 'api_users_viewed',

  // Suspicious activity
  UNUSUAL_IP_ACCESS: 'unusual_ip_access',
  MULTIPLE_FAILED_ATTEMPTS: 'multiple_failed_attempts',
  TOKEN_TAMPERING_DETECTED: 'token_tampering_detected',

  // System events
  HEALTH_CHECK: 'health_check',
  WORKER_START: 'worker_start',
};

/**
 * Log security event with full context
 */
export async function logSecurityEvent(env, eventType, severity, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    severity,
    service: 'admin-dashboard',
    ...details,
  };

  // Log to console with structured format
  console.log(JSON.stringify({
    level: severity,
    message: `[ADMIN SECURITY] ${eventType}`,
    ...logEntry,
  }));

  // Store in KV for audit trail (if SECURITY_LOGS KV namespace is available)
  if (env.SECURITY_LOGS) {
    try {
      const logKey = `admin:${timestamp}:${crypto.randomUUID()}`;
      await env.SECURITY_LOGS.put(logKey, JSON.stringify(logEntry), {
        expirationTtl: 2592000, // 30 days
      });
    } catch (error) {
      console.error('Failed to store security log:', error);
    }
  }

  // Send alerts for critical and emergency events
  if (severity === SEVERITY.CRITICAL || severity === SEVERITY.EMERGENCY) {
    await sendSecurityAlert(env, eventType, severity, logEntry);
  }

  return logEntry;
}

/**
 * Send security alerts to Slack and Email
 */
async function sendSecurityAlert(env, eventType, severity, logEntry) {
  const alerts = [];

  // Send Slack alert
  if (env.SLACK_SECURITY_WEBHOOK) {
    alerts.push(sendSlackAlert(env.SLACK_SECURITY_WEBHOOK, eventType, severity, logEntry));
  }

  // Send email alert
  if (env.RESEND_API_KEY) {
    alerts.push(sendEmailAlert(env, eventType, severity, logEntry));
  }

  // Wait for all alerts to send
  await Promise.allSettled(alerts);
}

/**
 * Send Slack webhook notification
 */
async function sendSlackAlert(webhookUrl, eventType, severity, logEntry) {
  try {
    const emoji = severity === SEVERITY.EMERGENCY ? '🚨' : '⚠️';
    const color = severity === SEVERITY.EMERGENCY ? '#ff0000' : '#ff9900';

    const payload = {
      username: 'Admin Security Alert',
      icon_emoji: ':shield:',
      attachments: [{
        color: color,
        title: `${emoji} ${eventType.toUpperCase().replace(/_/g, ' ')}`,
        fields: [
          {
            title: 'Severity',
            value: severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Timestamp',
            value: logEntry.timestamp,
            short: true,
          },
          {
            title: 'Service',
            value: 'Admin Dashboard',
            short: true,
          },
          ...(logEntry.email ? [{
            title: 'Email',
            value: logEntry.email,
            short: true,
          }] : []),
          ...(logEntry.ipAddress ? [{
            title: 'IP Address',
            value: logEntry.ipAddress,
            short: true,
          }] : []),
          ...(logEntry.userAgent ? [{
            title: 'User Agent',
            value: logEntry.userAgent.substring(0, 100),
            short: false,
          }] : []),
          ...(logEntry.reason ? [{
            title: 'Reason',
            value: logEntry.reason,
            short: false,
          }] : []),
        ],
        footer: 'CyberSmrt Security',
        footer_icon: 'https://cybersmrt.org/favicon.ico',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Slack alert failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

/**
 * Send email alert via Resend
 */
async function sendEmailAlert(env, eventType, severity, logEntry) {
  try {
    const emoji = severity === SEVERITY.EMERGENCY ? '🚨' : '⚠️';
    const severityColor = severity === SEVERITY.EMERGENCY ? '#ff0000' : '#ff9900';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: ${severityColor}; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .field-value { font-size: 14px; color: #333; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} Security Alert: ${eventType.toUpperCase().replace(/_/g, ' ')}</h1>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">Severity</div>
        <div class="field-value">${severity.toUpperCase()}</div>
      </div>
      <div class="field">
        <div class="field-label">Timestamp</div>
        <div class="field-value">${logEntry.timestamp}</div>
      </div>
      <div class="field">
        <div class="field-label">Service</div>
        <div class="field-value">Admin Dashboard (admin.cybersmrt.org)</div>
      </div>
      ${logEntry.email ? `
      <div class="field">
        <div class="field-label">Email</div>
        <div class="field-value">${logEntry.email}</div>
      </div>
      ` : ''}
      ${logEntry.ipAddress ? `
      <div class="field">
        <div class="field-label">IP Address</div>
        <div class="field-value">${logEntry.ipAddress}</div>
      </div>
      ` : ''}
      ${logEntry.userAgent ? `
      <div class="field">
        <div class="field-label">User Agent</div>
        <div class="field-value">${logEntry.userAgent}</div>
      </div>
      ` : ''}
      ${logEntry.reason ? `
      <div class="field">
        <div class="field-label">Reason</div>
        <div class="field-value">${logEntry.reason}</div>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      CyberSmrt Security Monitoring<br>
      This is an automated security alert from admin.cybersmrt.org
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Security Alerts <security@cybersmrt.org>',
        to: ['security-alerts@cybersmrt.org'],
        subject: `${emoji} [${severity.toUpperCase()}] Admin Security Alert: ${eventType.replace(/_/g, ' ')}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      console.error('Email alert failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}

/**
 * Extract request context for logging
 */
export function getRequestContext(request) {
  return {
    ipAddress: request.headers.get('CF-Connecting-IP') ||
                request.headers.get('X-Forwarded-For') ||
                request.headers.get('X-Real-IP') ||
                'unknown',
    userAgent: request.headers.get('User-Agent') || 'unknown',
    country: request.headers.get('CF-IPCountry') || 'unknown',
    referer: request.headers.get('Referer') || 'direct',
  };
}

/**
 * Detect repeated failed access attempts (rate limiting)
 */
export async function detectRepeatedFailures(env, identifier, threshold = 5) {
  if (!env.RATE_LIMIT_KV) return { exceeded: false, count: 0 };

  const key = `admin_failures:${identifier}`;
  const current = await env.RATE_LIMIT_KV.get(key);
  const count = current ? parseInt(current) + 1 : 1;

  await env.RATE_LIMIT_KV.put(key, count.toString(), {
    expirationTtl: 900, // 15 minutes
  });

  return {
    exceeded: count >= threshold,
    count: count,
  };
}
