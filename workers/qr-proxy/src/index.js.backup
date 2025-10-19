/**
 * CyberSmrt QR Code Proxy - Enhanced Edition
 * Cloudflare Worker with Full Security Suite
 *
 * Features:
 * - VirusTotal threat intelligence
 * - Analytics logging
 * - Blocked domain database (KV)
 * - Heuristic analysis
 * - Comprehensive security analysis
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for API endpoints
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://cybersmrt.org',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/tools/qr_proxy/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'qr-proxy-enhanced',
        edge: request.cf?.colo || 'unknown',
        version: '2.0'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Blocked domains management endpoint (admin only)
    if (url.pathname === '/tools/qr_proxy/block') {
      return handleBlockDomain(request, env, corsHeaders);
    }

    // Main proxy endpoint
    if (url.pathname === '/tools/qr_proxy') {
      return handleProxy(request, env, corsHeaders);
    }

    return new Response('Not Found', { status: 404 });
  }
};

/**
 * Main proxy handler with full security analysis
 */
async function handleProxy(request, env, corsHeaders) {
  const url = new URL(request.url);
  const targetURL = url.searchParams.get('url');

  if (!targetURL) {
    return jsonResponse({ error: 'Missing URL parameter' }, 400, corsHeaders);
  }

  // Validate URL format
  let parsedURL;
  try {
    parsedURL = new URL(targetURL);
  } catch (e) {
    return jsonResponse({ error: 'Invalid URL format' }, 400, corsHeaders);
  }

  // Security checks
  const securityChecks = await performSecurityChecks(parsedURL, env);

  if (securityChecks.blocked) {
    return jsonResponse({
      error: 'URL blocked',
      reason: securityChecks.reason,
      threatIntel: securityChecks.threatIntel
    }, 403, corsHeaders);
  }

  // Log request to analytics
  await logRequest(request, targetURL, securityChecks, env);

  // Check if user wants analysis only (no fetch)
  const analysisOnly = url.searchParams.get('analysis_only') === 'true';
  if (analysisOnly) {
    return jsonResponse({
      url: targetURL,
      security: securityChecks,
      blocked: false
    }, 200, corsHeaders);
  }

  try {
    // Fetch the target URL
    const response = await fetch(targetURL, {
      headers: {
        'User-Agent': 'CyberSmrt-QR-Scanner/2.0 (+https://cybersmrt.org)'
      },
      cf: {
        timeout: 10000,
        cacheTtl: 0,
      }
    });

    const contentType = response.headers.get('Content-Type') || 'text/html';
    let content = await response.text();

    // Inject security measures for HTML
    if (contentType.includes('text/html')) {
      content = injectSecurityMeasures(content, targetURL, securityChecks);
    }

    return new Response(content, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'X-Proxied-By': 'CyberSmrt-Enhanced',
        'X-Target-URL': targetURL,
        'X-Threat-Score': securityChecks.threatScore.toString(),
        'Content-Security-Policy': "default-src 'self'; script-src 'none'; form-action 'none';",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...corsHeaders
      }
    });

  } catch (error) {
    await logError(error, targetURL, request, env);
    return jsonResponse({
      error: 'Proxy error',
      message: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Comprehensive security checks
 */
async function performSecurityChecks(parsedURL, env) {
  const hostname = parsedURL.hostname.toLowerCase();
  const checks = {
    blocked: false,
    reason: null,
    threatScore: 0,
    checks: [],
    threatIntel: null
  };

  // 1. Check blocked domains database
  const blockedCheck = await checkBlockedDomain(hostname, env);
  if (blockedCheck.blocked) {
    checks.blocked = true;
    checks.reason = `Domain in blocklist: ${blockedCheck.reason}`;
    checks.threatScore = 100;
    return checks;
  }

  // 2. Check private/internal IPs
  const privateCheck = checkPrivateIP(hostname);
  if (privateCheck.blocked) {
    checks.blocked = true;
    checks.reason = 'Access to internal/private IPs forbidden';
    checks.threatScore = 100;
    return checks;
  }

  // 3. VirusTotal check (if API key available)
  if (env.VIRUSTOTAL_API_KEY) {
    const vtCheck = await checkVirusTotal(parsedURL.href, env.VIRUSTOTAL_API_KEY);
    checks.threatIntel = vtCheck;

    if (vtCheck.malicious > 5) {
      checks.blocked = true;
      checks.reason = `Detected by ${vtCheck.malicious} security vendors`;
      checks.threatScore = 100;
      return checks;
    }

    checks.threatScore += vtCheck.malicious * 10;
    checks.checks.push({
      name: 'VirusTotal',
      status: vtCheck.malicious > 0 ? 'warning' : 'clean',
      details: `${vtCheck.malicious}/${vtCheck.total} vendors flagged as malicious`
    });
  }

  // 4. Pattern-based heuristics
  const heuristics = analyzeHeuristics(parsedURL);
  checks.threatScore += heuristics.score;
  checks.checks.push(...heuristics.checks);

  return checks;
}

/**
 * Check if domain is in blocked list (Cloudflare KV)
 */
async function checkBlockedDomain(hostname, env) {
  if (!env.BLOCKED_DOMAINS) {
    return { blocked: false };
  }

  try {
    const blocked = await env.BLOCKED_DOMAINS.get(hostname);
    if (blocked) {
      const data = JSON.parse(blocked);
      return {
        blocked: true,
        reason: data.reason || 'Domain blocked',
        addedAt: data.addedAt
      };
    }
  } catch (e) {
    console.error('KV lookup error:', e);
  }

  return { blocked: false };
}

/**
 * Check for private/internal IPs
 */
function checkPrivateIP(hostname) {
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/,
    /^fe80:/
  ];

  if (blockedHosts.includes(hostname) ||
      privateRanges.some(pattern => pattern.test(hostname))) {
    return { blocked: true };
  }

  return { blocked: false };
}

/**
 * VirusTotal API integration
 */
async function checkVirusTotal(url, apiKey) {
  try {
    const urlId = btoa(url).replace(/=/g, '');

    const response = await fetch(
      `https://www.virustotal.com/api/v3/urls/${urlId}`,
      {
        headers: {
          'x-apikey': apiKey
        },
        cf: { cacheTtl: 3600 } // Cache for 1 hour
      }
    );

    if (response.status === 404) {
      // URL not in VT database, submit for analysis
      await submitToVirusTotal(url, apiKey);
      return { malicious: 0, total: 0, status: 'pending' };
    }

    if (!response.ok) {
      return { malicious: 0, total: 0, status: 'error' };
    }

    const data = await response.json();
    const stats = data.data.attributes.last_analysis_stats;

    return {
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      status: 'complete',
      permalink: data.data.attributes.permalink
    };

  } catch (error) {
    console.error('VirusTotal check failed:', error);
    return { malicious: 0, total: 0, status: 'error' };
  }
}

/**
 * Submit URL to VirusTotal for analysis
 */
async function submitToVirusTotal(url, apiKey) {
  try {
    await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    console.error('VirusTotal submission failed:', error);
  }
}

/**
 * Heuristic analysis of URL patterns
 */
function analyzeHeuristics(parsedURL) {
  const checks = [];
  let score = 0;

  const hostname = parsedURL.hostname;
  const path = parsedURL.pathname;

  // Suspicious TLDs
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top'];
  if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
    score += 20;
    checks.push({
      name: 'TLD Check',
      status: 'warning',
      details: 'Uses free/suspicious domain extension'
    });
  }

  // Phishing keywords
  const phishingKeywords = [
    'login', 'verify', 'account', 'update', 'confirm',
    'banking', 'password', 'signin', 'urgent', 'suspend'
  ];
  const urlString = (hostname + path).toLowerCase();
  const keywordMatches = phishingKeywords.filter(kw => urlString.includes(kw));

  if (keywordMatches.length > 0) {
    score += keywordMatches.length * 10;
    checks.push({
      name: 'Keyword Analysis',
      status: keywordMatches.length > 2 ? 'danger' : 'warning',
      details: `Contains phishing keywords: ${keywordMatches.join(', ')}`
    });
  }

  // IP address instead of domain
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    score += 30;
    checks.push({
      name: 'Domain Type',
      status: 'warning',
      details: 'Uses IP address instead of domain name'
    });
  }

  // Excessive hyphens
  if ((hostname.match(/-/g) || []).length > 3) {
    score += 15;
    checks.push({
      name: 'Domain Structure',
      status: 'warning',
      details: 'Unusual number of hyphens in domain'
    });
  }

  // Very long domain
  if (hostname.length > 30) {
    score += 10;
    checks.push({
      name: 'Domain Length',
      status: 'info',
      details: 'Unusually long domain name'
    });
  }

  // URL shortener domains
  const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co', 'is.gd'];
  if (shorteners.some(s => hostname.includes(s))) {
    score += 25;
    checks.push({
      name: 'URL Shortener',
      status: 'warning',
      details: 'URL shortener detected - final destination hidden'
    });
  }

  return { score, checks };
}

/**
 * Inject security measures into HTML
 */
function injectSecurityMeasures(content, targetURL, securityChecks) {
  // CSP meta tag
  const cspMeta = `
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'self';
                   script-src 'none';
                   style-src 'unsafe-inline';
                   img-src *;
                   frame-src 'none';
                   form-action 'none';">
  `;

  content = content.replace(/<head>/i, `<head>${cspMeta}`);

  // Enhanced watermark with threat score
  const threatLevel = securityChecks.threatScore > 50 ? 'HIGH' :
                      securityChecks.threatScore > 20 ? 'MEDIUM' : 'LOW';
  const threatColor = securityChecks.threatScore > 50 ? '#ef4444' :
                       securityChecks.threatScore > 20 ? '#f59e0b' : '#10b981';

  const watermark = `
    <div style="position: fixed; top: 0; left: 0; right: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 0.75rem 1rem; z-index: 999999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <span style="font-weight: bold; font-size: 0.9rem;">
          🛡️ CyberSmrt Secure Proxy - For Inspection Only
        </span>
        <span style="background: ${threatColor}; padding: 0.25rem 0.75rem;
                     border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
          Threat: ${threatLevel}
        </span>
      </div>
    </div>
    <div style="height: 50px;"></div>
  `;

  content = content.replace(/<body[^>]*>/i, (match) => `${match}${watermark}`);

  return content;
}

/**
 * Block domain handler (admin only)
 */
async function handleBlockDomain(request, env, corsHeaders) {
  // Verify admin token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const data = await request.json();
  const { domain, reason } = data;

  if (!domain) {
    return jsonResponse({ error: 'Missing domain' }, 400, corsHeaders);
  }

  await env.BLOCKED_DOMAINS.put(domain, JSON.stringify({
    reason: reason || 'Manually blocked',
    addedAt: new Date().toISOString(),
    addedBy: 'admin'
  }));

  return jsonResponse({
    success: true,
    domain,
    message: 'Domain blocked successfully'
  }, 200, corsHeaders);
}

/**
 * Log request to Cloudflare Analytics
 */
async function logRequest(request, targetURL, securityChecks, env) {
  if (!env.ANALYTICS) return;

  try {
    await env.ANALYTICS.writeDataPoint({
      indexes: [targetURL],
      blobs: [
        request.headers.get('CF-Connecting-IP') || 'unknown',
        request.cf?.country || 'unknown',
        securityChecks.threatScore.toString()
      ],
      doubles: [Date.now()]
    });
  } catch (error) {
    console.error('Analytics logging failed:', error);
  }
}

/**
 * Log errors
 */
async function logError(error, targetURL, request, env) {
  console.error('Proxy error:', {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    targetURL,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent')
  });
}

/**
 * Helper to return JSON responses
 */
function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}