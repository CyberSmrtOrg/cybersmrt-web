/**
 * Geolocation Utilities
 * Uses Cloudflare's built-in geolocation data from the request object
 */

/**
 * Extract geolocation data from Cloudflare request
 * Cloudflare automatically provides geolocation data in request.cf
 */
export function getGeolocation(request) {
  const cf = request.cf || {};

  return {
    country: cf.country || 'Unknown',
    countryName: getCountryName(cf.country),
    region: cf.region || null,
    city: cf.city || null,
    postalCode: cf.postalCode || null,
    timezone: cf.timezone || null,
    latitude: cf.latitude || null,
    longitude: cf.longitude || null,
    continent: cf.continent || null,
    asn: cf.asn || null,
    asOrganization: cf.asOrganization || null,
  };
}

/**
 * Get formatted location string
 */
export function getLocationString(geolocation) {
  const parts = [];

  if (geolocation.city) parts.push(geolocation.city);
  if (geolocation.region) parts.push(geolocation.region);
  if (geolocation.countryName) parts.push(geolocation.countryName);

  return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
}

/**
 * Calculate distance between two coordinates (in kilometers)
 * Uses Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if location is suspicious
 * Returns true if location is significantly different from recent logins
 */
export async function isSuspiciousLocation(userId, currentGeo, env) {
  // Get recent successful logins (last 30 days)
  const recentLogins = await env.DB
    .prepare(`
      SELECT details
      FROM security_logs
      WHERE user_id = ?
        AND event_type IN ('login_success', 'oauth_login_success')
        AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 10
    `)
    .bind(userId, Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60))
    .all();

  if (!recentLogins.results || recentLogins.results.length === 0) {
    return false; // No history, can't determine if suspicious
  }

  const currentLat = currentGeo.latitude;
  const currentLon = currentGeo.longitude;

  if (!currentLat || !currentLon) return false;

  // Check if current location is far from any recent login
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
      // Skip invalid JSON
      continue;
    }
  }

  // Flag as suspicious if > 500km from any recent login
  return minDistance > 500;
}

/**
 * Get country name from ISO code
 */
function getCountryName(code) {
  const countries = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    BE: 'Belgium',
    CH: 'Switzerland',
    AT: 'Austria',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    PL: 'Poland',
    CZ: 'Czech Republic',
    IE: 'Ireland',
    PT: 'Portugal',
    GR: 'Greece',
    JP: 'Japan',
    CN: 'China',
    KR: 'South Korea',
    IN: 'India',
    SG: 'Singapore',
    HK: 'Hong Kong',
    TW: 'Taiwan',
    MY: 'Malaysia',
    TH: 'Thailand',
    ID: 'Indonesia',
    PH: 'Philippines',
    VN: 'Vietnam',
    NZ: 'New Zealand',
    BR: 'Brazil',
    MX: 'Mexico',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
    ZA: 'South Africa',
    EG: 'Egypt',
    IL: 'Israel',
    TR: 'Turkey',
    RU: 'Russia',
    UA: 'Ukraine',
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
  };

  return countries[code] || code || 'Unknown';
}
