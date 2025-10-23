/**
 * Security Analytics and Monitoring
 * Provides insights into security events, threats, and user activity
 */

/**
 * Get security dashboard statistics
 */
export async function getSecurityStats(env, timeRange = 24) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const timeStart = now - (timeRange * 60 * 60); // hours to seconds

    // Total security events
    const totalEvents = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM security_events
      WHERE created_at >= ?
    `).bind(timeStart).first();

    // Failed login attempts
    const failedLogins = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE success = 0 AND created_at >= ?
    `).bind(timeStart).first();

    // Successful logins
    const successfulLogins = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE success = 1 AND created_at >= ?
    `).bind(timeStart).first();

    // Threat levels distribution
    const threatsByLevel = await env.DB.prepare(`
      SELECT
        json_extract(details, '$.threatLevel') as threat_level,
        COUNT(*) as count
      FROM security_events
      WHERE event_type = 'threat_analysis' AND created_at >= ?
      GROUP BY threat_level
    `).bind(timeStart).all();

    // Blocked logins
    const blockedLogins = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM security_events
      WHERE event_type = 'login_blocked' AND created_at >= ?
    `).bind(timeStart).first();

    // Locked accounts
    const lockedAccounts = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE locked_until > ?
    `).bind(now).first();

    // Active threats (high/critical in last hour)
    const activeThreats = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM security_events
      WHERE event_type = 'threat_analysis'
      AND json_extract(details, '$.threatLevel') IN ('high', 'critical')
      AND created_at >= ?
    `).bind(now - 3600).first();

    // New devices
    const newDevices = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM trusted_devices
      WHERE first_seen_at >= ?
    `).bind(timeStart).first();

    return {
      success: true,
      timeRange: `${timeRange} hours`,
      stats: {
        totalEvents: totalEvents.count,
        failedLogins: failedLogins.count,
        successfulLogins: successfulLogins.count,
        blockedLogins: blockedLogins.count,
        lockedAccounts: lockedAccounts.count,
        activeThreats: activeThreats.count,
        newDevices: newDevices.count,
        threatLevels: threatsByLevel.results.reduce((acc, row) => {
          acc[row.threat_level || 'unknown'] = row.count;
          return acc;
        }, {})
      }
    };
  } catch (error) {
    console.error('Failed to get security stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent security events
 */
export async function getRecentSecurityEvents(env, limit = 50, offset = 0, eventType = null) {
  try {
    let query = `
      SELECT
        se.id,
        se.user_id,
        se.event_type,
        se.details,
        se.ip_address,
        se.user_agent,
        se.created_at,
        u.email,
        u.display_name
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
    `;

    const params = [];

    if (eventType) {
      query += ' WHERE se.event_type = ?';
      params.push(eventType);
    }

    query += ' ORDER BY se.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...params).all();

    return {
      success: true,
      events: result.results.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : null
      })),
      count: result.results.length,
      limit,
      offset
    };
  } catch (error) {
    console.error('Failed to get security events:', error);
    return { success: false, error: error.message, events: [] };
  }
}

/**
 * Get threat analysis for a specific user
 */
export async function getUserThreatHistory(userId, env, limit = 20) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        event_type,
        details,
        ip_address,
        created_at
      FROM security_events
      WHERE user_id = ? AND event_type IN ('threat_analysis', 'login_blocked', 'login_challenge_required')
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return {
      success: true,
      threats: result.results.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : null
      }))
    };
  } catch (error) {
    console.error('Failed to get user threat history:', error);
    return { success: false, error: error.message, threats: [] };
  }
}

/**
 * Get login attempt analytics
 */
export async function getLoginAttemptAnalytics(env, timeRange = 24) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const timeStart = now - (timeRange * 60 * 60);

    // Attempts by hour
    const attemptsByHour = await env.DB.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00', datetime(created_at, 'unixepoch')) as hour,
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
      FROM login_attempts
      WHERE created_at >= ?
      GROUP BY hour
      ORDER BY hour DESC
    `).bind(timeStart).all();

    // Top failure reasons
    const failureReasons = await env.DB.prepare(`
      SELECT
        failure_reason,
        COUNT(*) as count
      FROM login_attempts
      WHERE success = 0 AND created_at >= ? AND failure_reason IS NOT NULL
      GROUP BY failure_reason
      ORDER BY count DESC
      LIMIT 10
    `).bind(timeStart).all();

    // Top attacking IPs
    const topAttackingIPs = await env.DB.prepare(`
      SELECT
        ip_address,
        COUNT(*) as attempts,
        COUNT(DISTINCT email) as unique_emails
      FROM login_attempts
      WHERE success = 0 AND created_at >= ?
      GROUP BY ip_address
      HAVING attempts >= 5
      ORDER BY attempts DESC
      LIMIT 10
    `).bind(timeStart).all();

    // Most targeted emails
    const targetedEmails = await env.DB.prepare(`
      SELECT
        email,
        COUNT(*) as attempts,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM login_attempts
      WHERE success = 0 AND created_at >= ?
      GROUP BY email
      HAVING attempts >= 5
      ORDER BY attempts DESC
      LIMIT 10
    `).bind(timeStart).all();

    return {
      success: true,
      timeRange: `${timeRange} hours`,
      analytics: {
        attemptsByHour: attemptsByHour.results,
        failureReasons: failureReasons.results,
        topAttackingIPs: topAttackingIPs.results,
        targetedEmails: targetedEmails.results
      }
    };
  } catch (error) {
    console.error('Failed to get login analytics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get locked accounts
 */
export async function getLockedAccounts(env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    const result = await env.DB.prepare(`
      SELECT
        id,
        email,
        display_name,
        locked_until,
        failed_login_count,
        last_failed_login_at
      FROM users
      WHERE locked_until > ?
      ORDER BY locked_until DESC
    `).bind(now).all();

    return {
      success: true,
      accounts: result.results.map(account => ({
        ...account,
        remainingSeconds: account.locked_until - now,
        remainingMinutes: Math.ceil((account.locked_until - now) / 60)
      }))
    };
  } catch (error) {
    console.error('Failed to get locked accounts:', error);
    return { success: false, error: error.message, accounts: [] };
  }
}

/**
 * Unlock account (admin action)
 */
export async function unlockAccount(email, env) {
  try {
    const result = await env.DB.prepare(`
      UPDATE users
      SET locked_until = NULL, failed_login_count = 0
      WHERE email = ?
    `).bind(email).run();

    return { success: result.success };
  } catch (error) {
    console.error('Failed to unlock account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get device activity statistics
 */
export async function getDeviceStats(env, timeRange = 24) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const timeStart = now - (timeRange * 60 * 60);

    // Total devices
    const totalDevices = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM trusted_devices
    `).first();

    // Trusted devices
    const trustedDevices = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM trusted_devices
      WHERE is_trusted = 1
    `).first();

    // Active devices (used in timeRange)
    const activeDevices = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM trusted_devices
      WHERE last_used_at >= ?
    `).bind(timeStart).first();

    // New devices in timeRange
    const newDevices = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM trusted_devices
      WHERE first_seen_at >= ?
    `).bind(timeStart).first();

    // Devices by type
    const devicesByType = await env.DB.prepare(`
      SELECT
        device_type,
        COUNT(*) as count
      FROM trusted_devices
      GROUP BY device_type
    `).all();

    // Devices by OS
    const devicesByOS = await env.DB.prepare(`
      SELECT
        os,
        COUNT(*) as count
      FROM trusted_devices
      GROUP BY os
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Devices by browser
    const devicesByBrowser = await env.DB.prepare(`
      SELECT
        browser,
        COUNT(*) as count
      FROM trusted_devices
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 10
    `).all();

    return {
      success: true,
      timeRange: `${timeRange} hours`,
      stats: {
        total: totalDevices.count,
        trusted: trustedDevices.count,
        active: activeDevices.count,
        new: newDevices.count,
        byType: devicesByType.results,
        byOS: devicesByOS.results,
        byBrowser: devicesByBrowser.results
      }
    };
  } catch (error) {
    console.error('Failed to get device stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending device verification challenges
 */
export async function getPendingChallenges(env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.device_fingerprint,
        c.challenge_type,
        c.ip_address,
        c.location_city,
        c.location_country,
        c.expires_at,
        c.created_at,
        u.email,
        u.display_name
      FROM device_verification_challenges c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.status = 'pending' AND c.expires_at > ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).bind(now).all();

    return {
      success: true,
      challenges: result.results.map(challenge => ({
        ...challenge,
        remainingSeconds: challenge.expires_at - now,
        remainingMinutes: Math.ceil((challenge.expires_at - now) / 60)
      }))
    };
  } catch (error) {
    console.error('Failed to get pending challenges:', error);
    return { success: false, error: error.message, challenges: [] };
  }
}

/**
 * Get geographic distribution of logins
 */
export async function getGeographicDistribution(env, timeRange = 24) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const timeStart = now - (timeRange * 60 * 60);

    const result = await env.DB.prepare(`
      SELECT
        json_extract(details, '$.geolocation.country') as country,
        json_extract(details, '$.geolocation.city') as city,
        COUNT(*) as count
      FROM security_events
      WHERE event_type = 'login' AND created_at >= ?
      AND json_extract(details, '$.geolocation.country') IS NOT NULL
      GROUP BY country, city
      ORDER BY count DESC
      LIMIT 50
    `).bind(timeStart).all();

    return {
      success: true,
      timeRange: `${timeRange} hours`,
      locations: result.results
    };
  } catch (error) {
    console.error('Failed to get geographic distribution:', error);
    return { success: false, error: error.message, locations: [] };
  }
}

/**
 * Search security events
 */
export async function searchSecurityEvents(env, filters = {}) {
  try {
    const {
      userId,
      eventType,
      ipAddress,
      email,
      startTime,
      endTime,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT
        se.id,
        se.user_id,
        se.event_type,
        se.details,
        se.ip_address,
        se.user_agent,
        se.created_at,
        u.email,
        u.display_name
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      query += ' AND se.user_id = ?';
      params.push(userId);
    }

    if (eventType) {
      query += ' AND se.event_type = ?';
      params.push(eventType);
    }

    if (ipAddress) {
      query += ' AND se.ip_address = ?';
      params.push(ipAddress);
    }

    if (email) {
      query += ' AND u.email = ?';
      params.push(email);
    }

    if (startTime) {
      query += ' AND se.created_at >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND se.created_at <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY se.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...params).all();

    return {
      success: true,
      events: result.results.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : null
      })),
      count: result.results.length,
      filters
    };
  } catch (error) {
    console.error('Failed to search security events:', error);
    return { success: false, error: error.message, events: [] };
  }
}
