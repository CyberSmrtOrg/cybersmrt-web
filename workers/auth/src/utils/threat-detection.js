/**
 * Advanced Threat Detection Utilities
 * Implements anomaly detection, IP reputation, and threat intelligence
 */

import { getGeolocation, calculateDistance } from './geolocation.js';
import { getDeviceInfo } from './device.js';

/**
 * Check IP reputation using Cloudflare threat intelligence
 */
export function checkIPReputation(request) {
  const cf = request.cf || {};

  // Cloudflare provides threat scores in the cf object
  const threatScore = cf.botManagement?.score || 100; // 0-100, lower is more suspicious
  const isTor = cf.isTorExit || false;
  const isProxy = cf.isProxy || false;
  const threatLevel = cf.threatLevel || 'unknown'; // 'low', 'medium', 'high', 'unknown'

  let riskScore = 0;
  let flags = [];

  // Tor exit node
  if (isTor) {
    riskScore += 40;
    flags.push('tor_exit_node');
  }

  // Proxy detected
  if (isProxy) {
    riskScore += 30;
    flags.push('proxy_detected');
  }

  // Cloudflare threat level
  if (threatLevel === 'high') {
    riskScore += 50;
    flags.push('high_threat_level');
  } else if (threatLevel === 'medium') {
    riskScore += 25;
    flags.push('medium_threat_level');
  }

  // Bot score (inverted - low score = high risk)
  if (threatScore < 30) {
    riskScore += 40;
    flags.push('bot_detected');
  } else if (threatScore < 60) {
    riskScore += 20;
    flags.push('suspicious_bot_score');
  }

  return {
    riskScore: Math.min(riskScore, 100),
    flags,
    threatLevel,
    isTor,
    isProxy,
    botScore: threatScore,
    safe: riskScore < 30
  };
}

/**
 * Check for velocity-based attacks (multiple attempts from same source)
 */
export async function checkVelocityAbuse(identifier, identifierType, env, windowMinutes = 5, threshold = 10) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (windowMinutes * 60);

    let query;
    if (identifierType === 'ip') {
      query = env.DB.prepare(
        'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND created_at >= ?'
      ).bind(identifier, windowStart);
    } else if (identifierType === 'email') {
      query = env.DB.prepare(
        'SELECT COUNT(*) as count FROM login_attempts WHERE email = ? AND created_at >= ?'
      ).bind(identifier, windowStart);
    } else {
      return { abusive: false, count: 0 };
    }

    const result = await query.first();
    const count = result.count;

    return {
      abusive: count >= threshold,
      count,
      threshold,
      windowMinutes
    };
  } catch (error) {
    console.error('Velocity check error:', error);
    return { abusive: false, count: 0, error: error.message };
  }
}

/**
 * Detect geographic anomalies
 */
export async function detectGeographicAnomaly(userId, request, env) {
  try {
    const currentLocation = getGeolocation(request);

    // Get recent successful logins
    const recentLogins = await env.DB.prepare(`
      SELECT details FROM security_events
      WHERE user_id = ? AND event_type = 'login' AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT 5
    `).bind(userId, Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)).all();

    if (recentLogins.results.length === 0) {
      return { anomaly: false, reason: 'first_login' };
    }

    // Calculate distances from recent login locations
    const distances = [];
    for (const login of recentLogins.results) {
      try {
        const details = JSON.parse(login.details);
        const prevGeo = details.geolocation;

        if (prevGeo && prevGeo.latitude && prevGeo.longitude &&
            currentLocation.latitude && currentLocation.longitude) {
          const distance = calculateDistance(
            prevGeo.latitude,
            prevGeo.longitude,
            currentLocation.latitude,
            currentLocation.longitude
          );
          distances.push(distance);
        }
      } catch (e) {
        // Skip invalid records
      }
    }

    if (distances.length === 0) {
      return { anomaly: false, reason: 'no_location_data' };
    }

    // Check for impossible travel
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDistance = Math.max(...distances);

    // Flag if more than 500km from usual locations
    if (maxDistance > 500 && avgDistance < 100) {
      return {
        anomaly: true,
        reason: 'unusual_location',
        distance: maxDistance,
        currentLocation: {
          city: currentLocation.city,
          country: currentLocation.country
        }
      };
    }

    // Check for impossible travel (e.g., 1000km in 1 hour)
    if (recentLogins.results.length > 0) {
      const lastLogin = recentLogins.results[0];
      const lastDetails = JSON.parse(lastLogin.details);
      const lastGeo = lastDetails.geolocation;

      if (lastGeo && lastGeo.latitude && lastGeo.longitude) {
        const distance = calculateDistance(
          lastGeo.latitude,
          lastGeo.longitude,
          currentLocation.latitude,
          currentLocation.longitude
        );

        // If more than 500km in less than 1 hour, flag as impossible travel
        const timeDiff = Math.floor(Date.now() / 1000) - (lastDetails.timestamp || 0);
        if (distance > 500 && timeDiff < 3600) {
          return {
            anomaly: true,
            reason: 'impossible_travel',
            distance,
            timeDiff: Math.floor(timeDiff / 60), // minutes
            currentLocation: {
              city: currentLocation.city,
              country: currentLocation.country
            }
          };
        }
      }
    }

    return { anomaly: false, distance: maxDistance };
  } catch (error) {
    console.error('Geographic anomaly detection error:', error);
    return { anomaly: false, error: error.message };
  }
}

/**
 * Detect time-based anomalies
 */
export async function detectTimeAnomaly(userId, env) {
  try {
    const now = new Date();
    const currentHour = now.getUTCHours();

    // Get recent login times
    const recentLogins = await env.DB.prepare(`
      SELECT created_at FROM security_events
      WHERE user_id = ? AND event_type = 'login' AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(userId, Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)).all();

    if (recentLogins.results.length < 5) {
      return { anomaly: false, reason: 'insufficient_data' };
    }

    // Calculate typical login hours
    const loginHours = recentLogins.results.map(login => {
      const date = new Date(login.created_at * 1000);
      return date.getUTCHours();
    });

    const hourCounts = {};
    loginHours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Check if current hour is unusual (never logged in at this hour before)
    if (!hourCounts[currentHour]) {
      return {
        anomaly: true,
        reason: 'unusual_time',
        currentHour,
        typicalHours: Object.keys(hourCounts).map(Number)
      };
    }

    return { anomaly: false, currentHour };
  } catch (error) {
    console.error('Time anomaly detection error:', error);
    return { anomaly: false, error: error.message };
  }
}

/**
 * Comprehensive threat analysis
 */
export async function analyzeThreat(userId, email, request, env) {
  try {
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
    const deviceInfo = await getDeviceInfo(request);

    let totalRisk = 0;
    const threats = [];
    const details = {};

    // 1. IP Reputation Check
    const ipReputation = checkIPReputation(request);
    totalRisk += ipReputation.riskScore * 0.3; // 30% weight
    if (ipReputation.flags.length > 0) {
      threats.push(...ipReputation.flags);
      details.ipReputation = ipReputation;
    }

    // 2. Velocity Abuse Check (IP)
    const ipVelocity = await checkVelocityAbuse(ipAddress, 'ip', env, 5, 10);
    if (ipVelocity.abusive) {
      totalRisk += 40; // High risk
      threats.push('ip_velocity_abuse');
      details.ipVelocity = ipVelocity;
    }

    // 3. Velocity Abuse Check (Email)
    if (email) {
      const emailVelocity = await checkVelocityAbuse(email, 'email', env, 15, 5);
      if (emailVelocity.abusive) {
        totalRisk += 35;
        threats.push('email_velocity_abuse');
        details.emailVelocity = emailVelocity;
      }
    }

    // 4. Geographic Anomaly Check
    if (userId) {
      const geoAnomaly = await detectGeographicAnomaly(userId, request, env);
      if (geoAnomaly.anomaly) {
        totalRisk += 25;
        threats.push(geoAnomaly.reason);
        details.geoAnomaly = geoAnomaly;
      }
    }

    // 5. Time Anomaly Check
    if (userId) {
      const timeAnomaly = await detectTimeAnomaly(userId, env);
      if (timeAnomaly.anomaly) {
        totalRisk += 15;
        threats.push(timeAnomaly.reason);
        details.timeAnomaly = timeAnomaly;
      }
    }

    // Determine threat level
    let threatLevel = 'low';
    if (totalRisk >= 70) {
      threatLevel = 'critical';
    } else if (totalRisk >= 50) {
      threatLevel = 'high';
    } else if (totalRisk >= 30) {
      threatLevel = 'medium';
    }

    return {
      riskScore: Math.min(Math.round(totalRisk), 100),
      threatLevel,
      threats,
      details,
      requiresChallenge: totalRisk >= 50,
      shouldBlock: totalRisk >= 80,
      timestamp: Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    console.error('Threat analysis error:', error);
    return {
      riskScore: 0,
      threatLevel: 'unknown',
      threats: [],
      details: { error: error.message },
      requiresChallenge: false,
      shouldBlock: false
    };
  }
}

/**
 * Check if account is under credential stuffing attack
 */
export async function detectCredentialStuffing(email, env) {
  try {
    // Check for many failed attempts from different IPs in short time
    const fifteenMinutesAgo = Math.floor(Date.now() / 1000) - (15 * 60);

    const result = await env.DB.prepare(`
      SELECT COUNT(DISTINCT ip_address) as unique_ips, COUNT(*) as total_attempts
      FROM login_attempts
      WHERE email = ? AND success = 0 AND created_at >= ?
    `).bind(email, fifteenMinutesAgo).first();

    // If 5+ failed attempts from 3+ different IPs, likely credential stuffing
    if (result.unique_ips >= 3 && result.total_attempts >= 5) {
      return {
        detected: true,
        uniqueIPs: result.unique_ips,
        totalAttempts: result.total_attempts,
        window: '15 minutes'
      };
    }

    return { detected: false };
  } catch (error) {
    console.error('Credential stuffing detection error:', error);
    return { detected: false, error: error.message };
  }
}

/**
 * Check for account enumeration attempts
 */
export async function detectAccountEnumeration(ipAddress, env) {
  try {
    // Check for many attempts to different accounts from same IP
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - (10 * 60);

    const result = await env.DB.prepare(`
      SELECT COUNT(DISTINCT email) as unique_emails, COUNT(*) as total_attempts
      FROM login_attempts
      WHERE ip_address = ? AND created_at >= ?
    `).bind(ipAddress, tenMinutesAgo).first();

    // If 10+ attempts to 5+ different accounts, likely enumeration
    if (result.unique_emails >= 5 && result.total_attempts >= 10) {
      return {
        detected: true,
        uniqueEmails: result.unique_emails,
        totalAttempts: result.total_attempts,
        window: '10 minutes'
      };
    }

    return { detected: false };
  } catch (error) {
    console.error('Account enumeration detection error:', error);
    return { detected: false, error: error.message };
  }
}

/**
 * Get recommended action based on threat analysis
 */
export function getRecommendedAction(threatAnalysis) {
  const { riskScore, threatLevel, threats } = threatAnalysis;

  // Critical threats - block immediately
  if (riskScore >= 80 || threats.includes('bot_detected')) {
    return {
      action: 'block',
      reason: 'Critical threat level detected',
      message: 'Access denied. Please contact support if you believe this is an error.'
    };
  }

  // High threats - require additional verification
  if (riskScore >= 50 || threats.includes('impossible_travel')) {
    return {
      action: 'challenge',
      reason: 'Suspicious activity detected',
      challengeType: 'email', // or 'totp' if 2FA enabled
      message: 'We detected unusual activity. Please verify your identity.'
    };
  }

  // Medium threats - allow but log and monitor
  if (riskScore >= 30) {
    return {
      action: 'allow_with_warning',
      reason: 'Moderate risk detected',
      message: 'If this wasn\'t you, please secure your account immediately.'
    };
  }

  // Low risk - allow
  return {
    action: 'allow',
    reason: 'Low risk',
    message: null
  };
}

/**
 * Create threat report for logging
 */
export function createThreatReport(threatAnalysis, action) {
  return {
    timestamp: threatAnalysis.timestamp,
    riskScore: threatAnalysis.riskScore,
    threatLevel: threatAnalysis.threatLevel,
    threats: threatAnalysis.threats,
    action: action.action,
    actionReason: action.reason,
    details: threatAnalysis.details
  };
}
