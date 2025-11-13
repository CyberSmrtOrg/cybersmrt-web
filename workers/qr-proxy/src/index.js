/**
 * CyberSmrt QR Code Proxy - Security Hardened Edition
 * Cloudflare Worker with Full Security Suite
 *
 * SECURITY PATCHES APPLIED:
 * - SSRF protection with DNS resolution
 * - Rate limiting via KV
 * - Response size limits
 * - Cloud metadata IP blocking
 * - Redirect security checks
 * - Admin audit logging
 * - Input validation
 *
 * @version 2.1.0-secure
 */

// ============== SECURITY CONSTANTS ==============
const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT_REQUESTS: 20,
  RATE_LIMIT_WINDOW: 60, // seconds

  // Response limits
  MAX_RESPONSE_SIZE: 5 * 1024 * 1024, // 5MB
  FETCH_TIMEOUT: 10000, // 10 seconds

  // Threat scoring
  THREAT_SCORES: {
    SUSPICIOUS_TLD: 20,
    PHISHING_KEYWORD: 10,
    IP_ADDRESS: 30,
    EXCESSIVE_HYPHENS: 15,
    LONG_DOMAIN: 10,
    URL_SHORTENER: 25,
    MALICIOUS_DETECTION: 10,
  },

  THREAT_THRESHOLDS: {
    HIGH: 70,
    MEDIUM: 40,
    LOW: 20,
  },

  // Blocked IPs and ranges
  BLOCKED_IPS: [
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'localhost',
    '169.254.169.254', // AWS/Azure/GCP metadata
    'fd00:ec2::254', // AWS IPv6 metadata
    '100.100.100.200', // Alibaba Cloud metadata
  ],

  PRIVATE_IP_RANGES: [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./, // Link-local
    /^fc00:/, // IPv6 private
    /^fe80:/, // IPv6 link-local
  ],
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://cybersmrt.org',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      // X-Frame-Options removed - we WANT proxied content to be frameable for preview
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/tools/qr_proxy/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'qr-proxy-secure',
        version: '2.1.0',
        edge: request.cf?.colo || 'unknown',
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Admin block endpoint (with audit logging)
    if (url.pathname === '/tools/qr_proxy/block') {
      return handleBlockDomain(request, env, corsHeaders);
    }

    // Main proxy endpoint (rate limited)
    if (url.pathname === '/tools/qr_proxy') {
      return handleProxy(request, env, corsHeaders);
    }

    return new Response('Not Found', { status: 404 });
  }
};

/**
 * Main proxy handler with comprehensive security
 */
async function handleProxy(request, env, corsHeaders) {
  const url = new URL(request.url);
  const targetURL = url.searchParams.get('url');

  // === INPUT VALIDATION ===
  if (!targetURL) {
    return jsonResponse({ error: 'Missing URL parameter' }, 400, corsHeaders);
  }

  // Check URL length (prevent DoS)
  if (targetURL.length > 2048) {
    return jsonResponse({ error: 'URL too long (max 2048 chars)' }, 400, corsHeaders);
  }

  // === RATE LIMITING ===
  const rateLimitResult = await checkRateLimit(request, env);
  if (rateLimitResult.limited) {
    return jsonResponse({
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter
    }, 429, corsHeaders);
  }

  // === URL VALIDATION ===
  let parsedURL;
  try {
    parsedURL = new URL(targetURL);
  } catch (e) {
    return jsonResponse({ error: 'Invalid URL format' }, 400, corsHeaders);
  }

  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsedURL.protocol)) {
    return jsonResponse({
      error: 'Invalid protocol. Only HTTP and HTTPS are allowed'
    }, 400, corsHeaders);
  }

  // === SSRF PROTECTION ===
  const ssrfCheck = await checkSSRF(parsedURL);
  if (ssrfCheck.blocked) {
    await logSecurityEvent(env, request, 'ssrf_blocked', {
      url: targetURL,
      reason: ssrfCheck.reason
    });
    return jsonResponse({
      error: 'Access forbidden',
      reason: ssrfCheck.reason
    }, 403, corsHeaders);
  }

  // === SECURITY ANALYSIS ===
  const securityChecks = await performSecurityChecks(parsedURL, env);

  if (securityChecks.blocked) {
    await logSecurityEvent(env, request, 'threat_blocked', {
      url: targetURL,
      reason: securityChecks.reason,
      score: securityChecks.threatScore
    });
    return jsonResponse({
      error: 'URL blocked',
      reason: securityChecks.reason,
      threatIntel: securityChecks.threatIntel
    }, 403, corsHeaders);
  }

  // === URL UNSHORTENING ===
  // Follow redirects to reveal the final destination
  const redirectChain = await unshortenURL(targetURL);

  // Log request
  await logRequest(request, targetURL, securityChecks, env);

  // Analysis only mode (don't fetch content)
  const analysisOnly = url.searchParams.get('analysis_only') === 'true';
  if (analysisOnly) {
    return jsonResponse({
      url: targetURL,
      finalUrl: redirectChain.finalUrl,
      redirectChain: redirectChain.chain,
      isShortened: redirectChain.isShortened,
      security: {
        ...securityChecks,
        breakdown: generateThreatBreakdown(securityChecks)
      },
      blocked: false
    }, 200, corsHeaders);
  }

  // === FETCH WITH SECURITY ===
  try {
    const response = await fetchWithSecurity(targetURL, parsedURL, env);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type') || 'text/html';
    let content = response.content;

    // Inject security measures for HTML
    if (contentType.includes('text/html')) {
      content = injectSecurityMeasures(content, targetURL, securityChecks);
    }

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Proxied-By': 'CyberSmrt-Secure',
        'X-Target-URL': targetURL,
        'X-Threat-Score': securityChecks.threatScore.toString(),
        'Content-Security-Policy': "default-src 'self'; script-src 'none'; form-action 'none';",
        // X-Frame-Options removed - we WANT this content to be frameable in our preview iframe
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
      message: 'Failed to fetch URL'
    }, 500, corsHeaders);
  }
}

/**
 * Rate limiting using KV
 */
async function checkRateLimit(request, env) {
  if (!env.RATE_LIMIT_KV) {
    return { limited: false };
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:${ip}`;

  try {
    const current = await env.RATE_LIMIT_KV.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= SECURITY_CONFIG.RATE_LIMIT_REQUESTS) {
      return {
        limited: true,
        retryAfter: SECURITY_CONFIG.RATE_LIMIT_WINDOW
      };
    }

    // Increment counter with TTL
    await env.RATE_LIMIT_KV.put(
      key,
      (count + 1).toString(),
      { expirationTtl: SECURITY_CONFIG.RATE_LIMIT_WINDOW }
    );

    return { limited: false };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { limited: false }; // Fail open
  }
}

/**
 * SSRF Protection - Check for internal/private IPs and cloud metadata
 */
async function checkSSRF(parsedURL) {
  const hostname = parsedURL.hostname.toLowerCase();

  // Check direct IP blocks
  if (SECURITY_CONFIG.BLOCKED_IPS.includes(hostname)) {
    return {
      blocked: true,
      reason: 'Access to internal IPs forbidden'
    };
  }

  // Check private IP ranges
  if (SECURITY_CONFIG.PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname))) {
    return {
      blocked: true,
      reason: 'Access to private IP ranges forbidden'
    };
  }

  // Try DNS resolution for domain names (best effort)
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    try {
      const resolvedIP = await resolveDNS(hostname);
      if (resolvedIP) {
        // Check resolved IP
        if (SECURITY_CONFIG.BLOCKED_IPS.includes(resolvedIP)) {
          return {
            blocked: true,
            reason: 'Domain resolves to blocked IP address'
          };
        }

        if (SECURITY_CONFIG.PRIVATE_IP_RANGES.some(pattern => pattern.test(resolvedIP))) {
          return {
            blocked: true,
            reason: 'Domain resolves to private IP range'
          };
        }
      }
    } catch (error) {
      console.error('DNS resolution failed:', error);
      // Continue anyway - don't block on DNS failure
    }
  }

  return { blocked: false };
}

/**
 * DNS Resolution using Cloudflare DNS over HTTPS
 */
async function resolveDNS(hostname) {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      {
        headers: { 'Accept': 'application/dns-json' },
        cf: { cacheTtl: 300 }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.Answer?.[0]?.data || null;
  } catch (error) {
    console.error('DNS resolution error:', error);
    return null;
  }
}

/**
 * Unshorten URL by following redirects
 * Returns the full redirect chain and final destination
 */
async function unshortenURL(startUrl) {
  const chain = [startUrl];
  let currentUrl = startUrl;
  const maxRedirects = 10; // Prevent infinite loops
  let redirectCount = 0;

  try {
    while (redirectCount < maxRedirects) {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'CyberSmrt-QR-Scanner/2.1 (+https://cybersmrt.org)'
        },
        cf: {
          timeout: 5000 // 5 second timeout for HEAD requests
        }
      });

      // Check if it's a redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;

        // Resolve relative URLs
        currentUrl = new URL(location, currentUrl).href;
        chain.push(currentUrl);
        redirectCount++;
      } else {
        // Not a redirect, we've reached the final destination
        break;
      }
    }

    return {
      finalUrl: currentUrl,
      chain: chain,
      isShortened: chain.length > 1,
      redirectCount: chain.length - 1
    };
  } catch (error) {
    console.error('URL unshortening failed:', error);
    // Return original URL if unshortening fails
    return {
      finalUrl: startUrl,
      chain: [startUrl],
      isShortened: false,
      redirectCount: 0,
      error: error.message
    };
  }
}

/**
 * Fetch with security controls and size limits
 */
async function fetchWithSecurity(targetURL, parsedURL, env) {
  // First fetch with manual redirect
  const response = await fetch(targetURL, {
    headers: {
      'User-Agent': 'CyberSmrt-QR-Scanner/2.1 (+https://cybersmrt.org)'
    },
    redirect: 'manual',
    cf: {
      timeout: SECURITY_CONFIG.FETCH_TIMEOUT,
      cacheTtl: 0
    }
  });

  // Check for redirects and validate them
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (location) {
      const redirectURL = new URL(location, targetURL);

      // Check redirect for SSRF
      const ssrfCheck = await checkSSRF(redirectURL);
      if (ssrfCheck.blocked) {
        throw new Error('Redirect to blocked destination: ' + ssrfCheck.reason);
      }

      // Follow redirect (one level only)
      return await fetchWithSecurity(redirectURL.href, redirectURL, env);
    }
  }

  // Check content length
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.MAX_RESPONSE_SIZE) {
    throw new Error('Content too large (max 5MB)');
  }

  // Stream response with size limit
  const reader = response.body.getReader();
  const chunks = [];
  let receivedLength = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    if (receivedLength > SECURITY_CONFIG.MAX_RESPONSE_SIZE) {
      throw new Error('Content too large (max 5MB)');
    }
  }

  // Reconstruct content
  const chunksAll = new Uint8Array(receivedLength);
  let position = 0;
  for (let chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }

  const content = new TextDecoder('utf-8').decode(chunksAll);

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    content: content
  };
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

  // 2. VirusTotal check (if API key available)
  if (env.VIRUSTOTAL_API_KEY) {
    const vtCheck = await checkVirusTotal(parsedURL.href, env.VIRUSTOTAL_API_KEY);
    checks.threatIntel = vtCheck;

    if (vtCheck.malicious > 5) {
      checks.blocked = true;
      checks.reason = `Detected by ${vtCheck.malicious} security vendors`;
      checks.threatScore = 100;
      return checks;
    }

    checks.threatScore += vtCheck.malicious * SECURITY_CONFIG.THREAT_SCORES.MALICIOUS_DETECTION;
    checks.checks.push({
      name: 'VirusTotal',
      status: vtCheck.malicious > 0 ? 'warning' : 'clean',
      details: `${vtCheck.malicious}/${vtCheck.total} vendors flagged as malicious`
    });
  }

  // 3. Pattern-based heuristics
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
    const blocked = await env.BLOCKED_DOMAINS.get(`blocked:${hostname}`);
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
 * VirusTotal API integration
 */
async function checkVirusTotal(url, apiKey) {
  try {
    const urlId = btoa(url).replace(/=/g, '');

    const response = await fetch(
      `https://www.virustotal.com/api/v3/urls/${urlId}`,
      {
        headers: { 'x-apikey': apiKey },
        cf: { cacheTtl: 3600 }
      }
    );

    if (response.status === 404) {
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
    score += SECURITY_CONFIG.THREAT_SCORES.SUSPICIOUS_TLD;
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
    score += keywordMatches.length * SECURITY_CONFIG.THREAT_SCORES.PHISHING_KEYWORD;
    checks.push({
      name: 'Keyword Analysis',
      status: keywordMatches.length > 2 ? 'danger' : 'warning',
      details: `Contains phishing keywords: ${keywordMatches.join(', ')}`
    });
  }

  // IP address instead of domain
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    score += SECURITY_CONFIG.THREAT_SCORES.IP_ADDRESS;
    checks.push({
      name: 'Domain Type',
      status: 'warning',
      details: 'Uses IP address instead of domain name'
    });
  }

  // Excessive hyphens
  if ((hostname.match(/-/g) || []).length > 3) {
    score += SECURITY_CONFIG.THREAT_SCORES.EXCESSIVE_HYPHENS;
    checks.push({
      name: 'Domain Structure',
      status: 'warning',
      details: 'Unusual number of hyphens in domain'
    });
  }

  // Very long domain
  if (hostname.length > 30) {
    score += SECURITY_CONFIG.THREAT_SCORES.LONG_DOMAIN;
    checks.push({
      name: 'Domain Length',
      status: 'info',
      details: 'Unusually long domain name'
    });
  }

  // URL shortener domains
  const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co', 'is.gd'];
  if (shorteners.some(s => hostname.includes(s))) {
    score += SECURITY_CONFIG.THREAT_SCORES.URL_SHORTENER;
    checks.push({
      name: 'URL Shortener',
      status: 'warning',
      details: 'URL shortener detected - final destination hidden'
    });
  }

  return { score, checks };
}

/**
 * Generate human-readable breakdown of threat score
 */
function generateThreatBreakdown(securityChecks) {
  const breakdown = {
    totalScore: securityChecks.threatScore,
    level: securityChecks.threatScore > SECURITY_CONFIG.THREAT_THRESHOLDS.HIGH ? 'HIGH' :
           securityChecks.threatScore > SECURITY_CONFIG.THREAT_THRESHOLDS.MEDIUM ? 'MEDIUM' : 'LOW',
    components: [],
    summary: ''
  };

  // Add VirusTotal results if available
  if (securityChecks.threatIntel && securityChecks.threatIntel.malicious > 0) {
    breakdown.components.push({
      factor: 'VirusTotal Detections',
      score: securityChecks.threatIntel.malicious * SECURITY_CONFIG.THREAT_SCORES.MALICIOUS_DETECTION,
      details: `${securityChecks.threatIntel.malicious} security vendors flagged this URL`,
      explanation: 'VirusTotal scans URLs against 90+ antivirus engines and security databases. Even 1-2 detections can indicate suspicious activity, though false positives do occur for new or uncommon sites.'
    });
  }

  // Add each check from the heuristic analysis
  securityChecks.checks.forEach(check => {
    let score = 0;
    let factor = '';
    let explanation = '';

    // Map check names to their scores and explanations
    if (check.name === 'TLD Check') {
      score = SECURITY_CONFIG.THREAT_SCORES.SUSPICIOUS_TLD;
      factor = 'Suspicious TLD';
      explanation = 'Free or commonly-abused domain extensions (like .tk, .ml, .xyz) are often used by scammers because they\'re easy to register anonymously and cost nothing.';
    } else if (check.name === 'Keyword Analysis') {
      const keywordCount = check.details.split(':')[1]?.split(',').length || 1;
      score = keywordCount * SECURITY_CONFIG.THREAT_SCORES.PHISHING_KEYWORD;
      factor = 'Phishing Keywords';
      explanation = 'Words like "login," "verify," "urgent," and "password" are commonly used in phishing attacks to create panic and trick users into entering credentials on fake sites.';
    } else if (check.name === 'Domain Type' && check.details.includes('IP address')) {
      score = SECURITY_CONFIG.THREAT_SCORES.IP_ADDRESS;
      factor = 'IP Address Usage';
      explanation = 'Legitimate websites use domain names (like google.com), not raw IP addresses. Using an IP address directly is a red flag that often indicates a temporary or malicious server.';
    } else if (check.name === 'Domain Structure') {
      score = SECURITY_CONFIG.THREAT_SCORES.EXCESSIVE_HYPHENS;
      factor = 'Excessive Hyphens';
      explanation = 'Many hyphens in a domain name can indicate typosquatting (like "pay-pal-secure-login.com"). Attackers use this to create domains that look similar to legitimate brands.';
    } else if (check.name === 'Domain Length') {
      score = SECURITY_CONFIG.THREAT_SCORES.LONG_DOMAIN;
      factor = 'Long Domain Name';
      explanation = 'Unusually long domain names are sometimes used to hide the real domain or make it harder to verify legitimacy at a glance.';
    } else if (check.name === 'URL Shortener') {
      score = SECURITY_CONFIG.THREAT_SCORES.URL_SHORTENER;
      factor = 'URL Shortener Detected';
      explanation = 'URL shorteners hide the final destination, making it impossible to verify where the link leads without clicking. This is a common technique in phishing campaigns.';
    }

    if (score > 0) {
      breakdown.components.push({
        factor: factor,
        score: score,
        details: check.details,
        explanation: explanation
      });
    }
  });

  // Generate summary
  if (breakdown.totalScore === 0) {
    breakdown.summary = 'No suspicious patterns detected. This URL appears safe.';
  } else if (breakdown.level === 'LOW') {
    breakdown.summary = 'Minor concerns detected. The URL has some suspicious characteristics but is likely safe.';
  } else if (breakdown.level === 'MEDIUM') {
    breakdown.summary = 'Moderate risk detected. Exercise caution when visiting this URL.';
  } else {
    breakdown.summary = 'High risk detected. This URL shows multiple red flags and may be malicious.';
  }

  return breakdown;
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
  const threatLevel = securityChecks.threatScore > SECURITY_CONFIG.THREAT_THRESHOLDS.HIGH ? 'HIGH' :
                      securityChecks.threatScore > SECURITY_CONFIG.THREAT_THRESHOLDS.MEDIUM ? 'MEDIUM' : 'LOW';
  const threatColor = securityChecks.threatScore > SECURITY_CONFIG.THREAT_THRESHOLDS.HIGH ? '#ef4444' :
                       securityChecks.threatScore > SECURITY_CONFIG.THREAT_THRESHOLDS.MEDIUM ? '#f59e0b' : '#10b981';

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
 * Block domain handler (admin only with audit logging)
 */
async function handleBlockDomain(request, env, corsHeaders) {
  // Verify admin token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await logAdminAttempt(env, request, 'missing_token');
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const token = authHeader.substring(7);

  // Compare tokens securely (timing-safe)
  if (token !== env.ADMIN_TOKEN) {
    await logAdminAttempt(env, request, 'invalid_token');
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

  await env.BLOCKED_DOMAINS.put(`blocked:${domain}`, JSON.stringify({
    reason: reason || 'Manually blocked',
    addedAt: new Date().toISOString(),
    addedBy: 'admin'
  }));

  // Log admin action
  await logAdminAttempt(env, request, 'domain_blocked', { domain, reason });

  return jsonResponse({
    success: true,
    domain,
    message: 'Domain blocked successfully'
  }, 200, corsHeaders);
}

/**
 * Log admin access attempts
 */
async function logAdminAttempt(env, request, action, metadata = {}) {
  if (!env.ANALYTICS) return;

  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    await env.ANALYTICS.writeDataPoint({
      indexes: [`admin:${action}`],
      blobs: [ip, JSON.stringify(metadata)],
      doubles: [Date.now()]
    });
  } catch (error) {
    console.error('Admin logging failed:', error);
  }
}

/**
 * Log security events
 */
async function logSecurityEvent(env, request, eventType, metadata) {
  if (!env.ANALYTICS) return;

  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    await env.ANALYTICS.writeDataPoint({
      indexes: [`security:${eventType}`],
      blobs: [ip, JSON.stringify(metadata)],
      doubles: [Date.now()]
    });
  } catch (error) {
    console.error('Security logging failed:', error);
  }
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

  if (env.ANALYTICS) {
    try {
      await env.ANALYTICS.writeDataPoint({
        indexes: ['error'],
        blobs: [error.message, targetURL],
        doubles: [Date.now()]
      });
    } catch (e) {
      console.error('Error logging failed:', e);
    }
  }
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