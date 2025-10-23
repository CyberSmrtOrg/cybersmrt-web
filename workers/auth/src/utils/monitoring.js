/**
 * Monitoring and Observability Utilities
 * Provides error tracking, performance monitoring, and alerting
 */

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

/**
 * Structured logging
 */
export function log(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  // Use appropriate console method
  switch (level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(JSON.stringify(logEntry));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(logEntry));
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }

  return logEntry;
}

/**
 * Track performance metrics
 */
export class PerformanceTracker {
  constructor(operationName) {
    this.operationName = operationName;
    this.startTime = Date.now();
    this.metrics = {};
  }

  /**
   * Mark a checkpoint
   */
  mark(name) {
    this.metrics[name] = Date.now() - this.startTime;
  }

  /**
   * Complete tracking and log results
   */
  complete(context = {}) {
    const duration = Date.now() - this.startTime;

    log(LogLevel.INFO, `Performance: ${this.operationName}`, {
      operation: this.operationName,
      duration_ms: duration,
      checkpoints: this.metrics,
      ...context
    });

    return {
      operation: this.operationName,
      duration,
      metrics: this.metrics
    };
  }
}

/**
 * Error tracking and reporting
 */
export async function trackError(error, context = {}, env) {
  const errorData = {
    timestamp: Math.floor(Date.now() / 1000),
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  };

  // Log to console
  log(LogLevel.ERROR, 'Error occurred', errorData);

  // Store in database for analysis
  try {
    if (env?.DB) {
      const errorId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO error_logs (
          id, error_type, error_message, stack_trace,
          user_id, ip_address, user_agent, endpoint,
          context, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        errorId,
        error.name || 'Error',
        error.message,
        error.stack || null,
        context.userId || null,
        context.ipAddress || null,
        context.userAgent || null,
        context.endpoint || null,
        JSON.stringify(context),
        errorData.timestamp
      ).run();
    }
  } catch (dbError) {
    // Don't throw if error logging fails
    console.error('Failed to log error to database:', dbError);
  }

  return errorData;
}

/**
 * Monitor request metrics
 */
export async function recordRequestMetrics(request, response, duration, env) {
  try {
    const url = new URL(request.url);
    const metrics = {
      timestamp: Math.floor(Date.now() / 1000),
      method: request.method,
      path: url.pathname,
      status: response.status,
      duration_ms: duration,
      ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
      user_agent: request.headers.get('User-Agent') || 'unknown',
      country: request.cf?.country || 'unknown',
      colo: request.cf?.colo || 'unknown'
    };

    // Log metrics
    log(LogLevel.INFO, 'Request metrics', metrics);

    // Store aggregated metrics in KV for dashboard
    if (env?.RATE_LIMIT_KV) {
      const metricsKey = `metrics:${url.pathname}:${Math.floor(Date.now() / 60000)}`; // 1-minute buckets
      const existing = await env.RATE_LIMIT_KV.get(metricsKey, { type: 'json' }) || { count: 0, totalDuration: 0, errors: 0 };

      existing.count++;
      existing.totalDuration += duration;
      if (response.status >= 400) {
        existing.errors++;
      }

      await env.RATE_LIMIT_KV.put(metricsKey, JSON.stringify(existing), {
        expirationTtl: 3600 // Keep for 1 hour
      });
    }

    return metrics;
  } catch (error) {
    console.error('Failed to record request metrics:', error);
  }
}

/**
 * Check system health
 */
export async function checkSystemHealth(env) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check database connectivity
    const dbStart = Date.now();
    await env.DB.prepare('SELECT 1 as test').first();
    health.checks.database = {
      status: 'healthy',
      latency_ms: Date.now() - dbStart
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  try {
    // Check KV namespaces
    const kvStart = Date.now();
    await env.RATE_LIMIT_KV.put('health_check', 'ok', { expirationTtl: 60 });
    const value = await env.RATE_LIMIT_KV.get('health_check');
    health.checks.kv = {
      status: value === 'ok' ? 'healthy' : 'degraded',
      latency_ms: Date.now() - kvStart
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.kv = {
      status: 'unhealthy',
      error: error.message
    };
  }

  try {
    // Check for high error rates
    const recentErrors = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM error_logs
      WHERE created_at >= ?
    `).bind(Math.floor(Date.now() / 1000) - 300).first(); // Last 5 minutes

    health.checks.errorRate = {
      status: recentErrors.count < 50 ? 'healthy' : 'degraded',
      recent_errors: recentErrors.count,
      threshold: 50
    };

    if (recentErrors.count >= 100) {
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.checks.errorRate = {
      status: 'unknown',
      error: error.message
    };
  }

  try {
    // Check for locked accounts
    const lockedAccounts = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE locked_until > ?
    `).bind(Math.floor(Date.now() / 1000)).first();

    health.checks.lockedAccounts = {
      status: 'healthy',
      count: lockedAccounts.count
    };
  } catch (error) {
    health.checks.lockedAccounts = {
      status: 'unknown',
      error: error.message
    };
  }

  return health;
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(env, minutes = 60) {
  try {
    const now = Math.floor(Date.now() / 60000); // Current minute
    const metricsData = [];

    // Fetch metrics from KV for the last N minutes
    const keys = [];
    for (let i = 0; i < minutes; i++) {
      keys.push(`metrics:*:${now - i}`);
    }

    // Note: In production, you'd use KV list with prefix
    // For now, we'll return aggregated data from error logs as a proxy

    const errorMetrics = await env.DB.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:%M', datetime(created_at, 'unixepoch')) as minute,
        COUNT(*) as errors,
        endpoint
      FROM error_logs
      WHERE created_at >= ?
      GROUP BY minute, endpoint
      ORDER BY minute DESC
      LIMIT 100
    `).bind(Math.floor(Date.now() / 1000) - (minutes * 60)).all();

    return {
      success: true,
      timeRange: `${minutes} minutes`,
      errorMetrics: errorMetrics.results
    };
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Alert conditions
 */
export const AlertConditions = {
  HIGH_ERROR_RATE: 'high_error_rate',
  DATABASE_SLOW: 'database_slow',
  MANY_LOCKED_ACCOUNTS: 'many_locked_accounts',
  CREDENTIAL_STUFFING: 'credential_stuffing',
  SYSTEM_UNHEALTHY: 'system_unhealthy'
};

/**
 * Check alert conditions
 */
export async function checkAlertConditions(env) {
  const alerts = [];
  const now = Math.floor(Date.now() / 1000);

  try {
    // Check for high error rate (>50 errors in 5 minutes)
    const recentErrors = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM error_logs
      WHERE created_at >= ?
    `).bind(now - 300).first();

    if (recentErrors.count >= 50) {
      alerts.push({
        condition: AlertConditions.HIGH_ERROR_RATE,
        severity: recentErrors.count >= 100 ? 'critical' : 'warning',
        message: `High error rate detected: ${recentErrors.count} errors in 5 minutes`,
        count: recentErrors.count
      });
    }

    // Check for many locked accounts (>10 in last hour)
    const recentLockouts = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE locked_until > ? AND locked_until <= ?
    `).bind(now, now + 3600).first();

    if (recentLockouts.count >= 10) {
      alerts.push({
        condition: AlertConditions.MANY_LOCKED_ACCOUNTS,
        severity: 'warning',
        message: `Many accounts locked: ${recentLockouts.count} accounts`,
        count: recentLockouts.count
      });
    }

    // Check for credential stuffing attack
    const credentialStuffing = await env.DB.prepare(`
      SELECT
        email,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(*) as attempts
      FROM login_attempts
      WHERE success = 0 AND created_at >= ?
      GROUP BY email
      HAVING unique_ips >= 5 AND attempts >= 10
    `).bind(now - 900).all(); // Last 15 minutes

    if (credentialStuffing.results.length > 0) {
      alerts.push({
        condition: AlertConditions.CREDENTIAL_STUFFING,
        severity: 'critical',
        message: `Credential stuffing attack detected on ${credentialStuffing.results.length} accounts`,
        affected_accounts: credentialStuffing.results.length,
        details: credentialStuffing.results.slice(0, 5) // First 5 affected
      });
    }

    // Check system health
    const health = await checkSystemHealth(env);
    if (health.status === 'unhealthy') {
      alerts.push({
        condition: AlertConditions.SYSTEM_UNHEALTHY,
        severity: 'critical',
        message: 'System health check failed',
        checks: health.checks
      });
    }

  } catch (error) {
    console.error('Failed to check alert conditions:', error);
    alerts.push({
      condition: 'alert_check_failed',
      severity: 'warning',
      message: 'Failed to check alert conditions',
      error: error.message
    });
  }

  return alerts;
}

/**
 * Log alert
 */
export async function logAlert(alert, env) {
  try {
    const alertId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT INTO alerts (
        id, condition_type, severity, message, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      alertId,
      alert.condition,
      alert.severity,
      alert.message,
      JSON.stringify(alert),
      now
    ).run();

    log(LogLevel.WARN, `Alert: ${alert.message}`, alert);

    return { success: true, alertId };
  } catch (error) {
    console.error('Failed to log alert:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent alerts
 */
export async function getRecentAlerts(env, limit = 50) {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM alerts
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return {
      success: true,
      alerts: result.results.map(alert => ({
        ...alert,
        details: alert.details ? JSON.parse(alert.details) : null
      }))
    };
  } catch (error) {
    console.error('Failed to get recent alerts:', error);
    return { success: false, error: error.message, alerts: [] };
  }
}
