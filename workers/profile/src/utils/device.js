/**
 * Device Fingerprinting Utilities
 * Extracts device information from User-Agent and request headers
 */

/**
 * Parse User-Agent string to extract device information
 */
export function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      isMobile: false,
    };
  }

  // Browser detection
  let browser = 'Unknown';
  if (userAgent.includes('Edg/')) browser = 'Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';
  else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera';

  // OS detection
  let os = 'Unknown';
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10';
  else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+_\d+)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (userAgent.includes('Linux')) os = 'Linux';

  // Device detection
  let device = 'Desktop';
  let isMobile = false;

  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    device = 'Mobile';
    isMobile = true;
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    device = 'Tablet';
    isMobile = true;
  }

  return {
    browser,
    os,
    device,
    isMobile,
    raw: userAgent,
  };
}

/**
 * Generate device fingerprint hash
 * Creates a consistent identifier for the same device
 */
export async function generateDeviceFingerprint(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  const acceptLanguage = request.headers.get('Accept-Language') || '';
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';

  // Combine headers to create fingerprint
  const fingerprintString = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;

  // Hash the fingerprint string
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex.substring(0, 16); // Use first 16 chars for brevity
}

/**
 * Extract device information from request
 */
export async function getDeviceInfo(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  const parsed = parseUserAgent(userAgent);
  const fingerprint = await generateDeviceFingerprint(request);

  return {
    fingerprint,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    isMobile: parsed.isMobile,
    userAgent: userAgent.substring(0, 500), // Truncate for storage
  };
}

/**
 * Check if device is recognized
 */
export async function isKnownDevice(userId, fingerprint, env) {
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
      `%"fingerprint":"${fingerprint}"%`,
      Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // Last 90 days
    )
    .first();

  return (result?.count || 0) > 0;
}
