/**
 * CyberSmrt Admin Dashboard Worker
 *
 * Provides administrative interfaces for:
 * - User management
 * - Analytics dashboard
 * - System monitoring
 * - Security logs
 * - Content management
 *
 * Security: Requires JWT authentication with admin role
 */

import {
  logSecurityEvent,
  getRequestContext,
  detectRepeatedFailures,
  SEVERITY,
  EVENT_TYPE,
} from './security-logger.js';

// CORS configuration
function buildCorsHeaders(request, env, includeCredentials = false) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    env.FRONTEND_ORIGIN || 'https://cybersmrt.org',
    'https://admin.cybersmrt.org',
    'http://localhost:3000',
    'http://localhost:8788',
  ];

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    if (includeCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}

// Error response helper
function errorResponse(request, env, message, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      ...buildCorsHeaders(request, env),
    },
  });
}

// Success response helper
function successResponse(request, env, data) {
  return new Response(JSON.stringify({
    success: true,
    ...data,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      ...buildCorsHeaders(request, env),
    },
  });
}

// Verify JWT token and check admin role
async function verifyAdminToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'No authorization token provided' };
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT signature using JWT_SECRET
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const data = `${headerB64}.${payloadB64}`;
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      'HMAC',
      secretKey,
      signature,
      encoder.encode(data)
    );

    if (!valid) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { valid: false, error: 'Token expired' };
    }

    // Check admin role
    if (payload.role !== 'admin') {
      return { valid: false, error: 'Insufficient permissions - admin role required' };
    }

    return { valid: true, userId: payload.userId, email: payload.email };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

// Admin dashboard HTML
function getAdminDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>CyberSmrt Admin Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #000000;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 1200px;
      width: 100%;
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .header-logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 15px;
    }

    .header h1 {
      font-size: 1.5rem;
      margin: 0;
      font-weight: 400;
      opacity: 0.95;
    }

    .content {
      padding: 40px;
    }

    .login-container {
      max-width: 450px;
      margin: 0 auto;
    }

    .oauth-buttons {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .oauth-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 14px 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      color: #333;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
    }

    .oauth-btn:hover {
      border-color: #667eea;
      background: #f8f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .oauth-btn svg {
      width: 24px;
      height: 24px;
    }

    .btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }

    .btn:active {
      transform: translateY(0);
    }

    .dashboard {
      display: none;
    }

    .dashboard.active {
      display: block;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .stat-card h3 {
      font-size: 0.9rem;
      opacity: 0.9;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-card .value {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .stat-card .label {
      opacity: 0.8;
      font-size: 0.9rem;
    }

    .nav-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }

    .nav-btn {
      padding: 20px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
      font-size: 1rem;
      font-weight: 600;
      color: #333;
    }

    .nav-btn:hover {
      border-color: #667eea;
      background: #f8f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .section {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      margin-top: 20px;
    }

    .section h2 {
      margin-bottom: 20px;
      color: #333;
    }

    .error {
      color: #e74c3c;
      padding: 12px;
      background: #fde8e8;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }

    .info {
      color: #667eea;
      padding: 12px;
      background: #f0f4ff;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }

    .logout-btn {
      background: #e74c3c;
      margin-top: 20px;
    }

    .logout-btn:hover {
      box-shadow: 0 10px 20px rgba(231, 76, 60, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://cybersmrt.org/assets/logos/cybersmrt-logo-stacked.png" alt="CyberSmrt" class="header-logo">
      <h1>Administrative Dashboard</h1>
    </div>

    <div class="content">
      <!-- OAuth Login -->
      <div id="loginContainer" class="login-container">
        <div class="info">
          Please sign in with your @cybersmrt.org account
        </div>
        <div id="errorMessage" class="error" style="display: none;"></div>

        <div class="oauth-buttons">
          <a href="#" onclick="initiateOAuth('google'); return false;" class="oauth-btn">
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </a>

          <a href="#" onclick="initiateOAuth('github'); return false;" class="oauth-btn">
            <svg viewBox="0 0 24 24"><path fill="#181717" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Sign in with GitHub
          </a>

          <a href="#" onclick="initiateOAuth('microsoft'); return false;" class="oauth-btn">
            <svg viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#00A4EF" d="M13 1h10v10H13z"/><path fill="#7FBA00" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
            Sign in with Microsoft
          </a>

          <a href="#" onclick="initiateOAuth('apple'); return false;" class="oauth-btn">
            <svg viewBox="0 0 24 24"><path fill="#000000" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Sign in with Apple
          </a>
        </div>
      </div>

      <!-- Dashboard -->
      <div id="dashboard" class="dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Users</h3>
            <div class="value" id="totalUsers">-</div>
            <div class="label">Registered accounts</div>
          </div>
          <div class="stat-card">
            <h3>Active Sessions</h3>
            <div class="value" id="activeSessions">-</div>
            <div class="label">Currently online</div>
          </div>
          <div class="stat-card">
            <h3>Security Events</h3>
            <div class="value" id="securityEvents">-</div>
            <div class="label">Last 24 hours</div>
          </div>
          <div class="stat-card">
            <h3>System Status</h3>
            <div class="value">✓</div>
            <div class="label">All systems operational</div>
          </div>
        </div>

        <div class="nav-buttons">
          <button class="nav-btn" onclick="loadSection('users')">👥 User Management</button>
          <button class="nav-btn" onclick="loadSection('analytics')">📊 Analytics</button>
          <button class="nav-btn" onclick="loadSection('security')">🔒 Security Logs</button>
          <button class="nav-btn" onclick="loadSection('content')">📝 Content Management</button>
          <button class="nav-btn" onclick="loadSection('monitoring')">📈 System Monitoring</button>
          <button class="nav-btn" onclick="loadSection('settings')">⚙️ Settings</button>
        </div>

        <div class="section">
          <h2>Quick Actions</h2>
          <p>Select a section above to manage your CyberSmrt platform.</p>
        </div>

        <button class="btn logout-btn" onclick="handleLogout()">Sign Out</button>
      </div>
    </div>
  </div>

  <script>
    let authToken = null;

    // Initiate OAuth login with specified provider
    function initiateOAuth(provider) {
      // Store state to identify admin dashboard return
      const state = btoa(JSON.stringify({
        returnUrl: 'https://admin.cybersmrt.org/',
        timestamp: Date.now()
      }));
      sessionStorage.setItem('oauth_state', state);

      // Redirect to OAuth provider
      window.location.href = \`https://auth.cybersmrt.org/oauth/\${provider}?state=\${encodeURIComponent(state)}\`;
    }

    // Check for existing session or OAuth callback
    window.addEventListener('DOMContentLoaded', () => {
      // Check if we have a token from OAuth callback in URL hash
      const hash = window.location.hash.substring(1);
      if (hash) {
        try {
          const data = JSON.parse(atob(hash));
          if (data.token) {
            handleOAuthCallback(data);
            return;
          }
        } catch (e) {
          console.error('Failed to parse OAuth callback data:', e);
        }
      }

      // Check for existing session
      const token = localStorage.getItem('adminToken');
      if (token) {
        authToken = token;
        verifyAndShowDashboard();
      }
    });

    async function handleOAuthCallback(data) {
      const errorDiv = document.getElementById('errorMessage');

      try {
        // Clear the hash from URL
        window.location.hash = '';

        if (data.success && data.token) {
          // Decode JWT to check role and email
          const payload = JSON.parse(atob(data.token.split('.')[1]));

          // Verify user email is @cybersmrt.org
          if (!payload.email || !payload.email.endsWith('@cybersmrt.org')) {
            // Log unauthorized email attempt
            await fetch('/log-oauth-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'admin_login_failed_invalid_email',
                severity: 'critical',
                email: payload.email,
                reason: 'Non-@cybersmrt.org email attempted admin access'
              })
            }).catch(console.error);

            errorDiv.textContent = 'Access denied - @cybersmrt.org email required';
            errorDiv.style.display = 'block';

            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
            return;
          }

          // Verify user has admin or super_admin role
          if (payload.role !== 'admin' && payload.role !== 'super_admin') {
            // Log unauthorized role attempt
            await fetch('/log-oauth-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'admin_login_failed_invalid_role',
                severity: 'critical',
                email: payload.email,
                reason: \`User with role '\${payload.role}' attempted admin access\`
              })
            }).catch(console.error);

            errorDiv.textContent = 'Access denied - admin privileges required';
            errorDiv.style.display = 'block';

            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
            return;
          }

          // Log successful admin login
          await fetch('/log-oauth-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'admin_login_success',
              severity: 'info',
              email: payload.email,
              reason: 'Successful admin dashboard login'
            })
          }).catch(console.error);

          authToken = data.token;
          localStorage.setItem('adminToken', authToken);
          showDashboard();
          loadDashboardStats();
        } else {
          // Log failed OAuth
          await fetch('/log-oauth-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'admin_login_failed_token_invalid',
              severity: 'warning',
              reason: data.error || 'OAuth login failed'
            })
          }).catch(console.error);

          errorDiv.textContent = data.error || 'OAuth login failed';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        console.error('OAuth callback error:', error);

        // Log error
        await fetch('/log-oauth-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'token_tampering_detected',
            severity: 'critical',
            reason: 'JWT parsing or validation error: ' + error.message
          })
        }).catch(console.error);

        errorDiv.textContent = 'Authentication error - please try again';
        errorDiv.style.display = 'block';
      }
    }

    async function verifyAndShowDashboard() {
      try {
        const response = await fetch('/api/verify', {
          headers: {
            'Authorization': \`Bearer \${authToken}\`,
          },
        });

        if (response.ok) {
          showDashboard();
          loadDashboardStats();
        } else {
          localStorage.removeItem('adminToken');
          authToken = null;
        }
      } catch (error) {
        console.error('Verification failed:', error);
      }
    }

    function showDashboard() {
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('dashboard').classList.add('active');
    }

    function handleLogout() {
      localStorage.removeItem('adminToken');
      authToken = null;
      document.getElementById('loginContainer').style.display = 'block';
      document.getElementById('dashboard').classList.remove('active');
    }

    async function loadDashboardStats() {
      try {
        const response = await fetch('/api/stats', {
          headers: {
            'Authorization': \`Bearer \${authToken}\`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            document.getElementById('totalUsers').textContent = data.stats.totalUsers || '0';
            document.getElementById('activeSessions').textContent = data.stats.activeSessions || '0';
            document.getElementById('securityEvents').textContent = data.stats.securityEvents || '0';
          }
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }

    function loadSection(section) {
      alert(\`Loading \${section} section... (Coming soon)\`);
      // Future: Load section-specific interfaces
    }
  </script>
</body>
</html>`;
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, env),
      });
    }

    // Serve robots.txt to prevent search engine indexing
    if (path === '/robots.txt') {
      const robotsTxt = `# robots.txt for admin.cybersmrt.org
# This is an admin dashboard - do not index

User-agent: *
Disallow: /
`;
      return new Response(robotsTxt, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Health check endpoint
    if (path === '/health') {
      return new Response(JSON.stringify({
        success: true,
        status: 'healthy',
        service: 'admin',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // API endpoints (require authentication)
    if (path.startsWith('/api/')) {
      const requestContext = getRequestContext(request);

      // Verify admin token
      const auth = await verifyAdminToken(request, env);
      if (!auth.valid) {
        // Log failed API access attempt
        await logSecurityEvent(env, EVENT_TYPE.API_ACCESS_DENIED, SEVERITY.WARNING, {
          ...requestContext,
          path,
          reason: auth.error,
        });

        // Check for repeated failures
        const failures = await detectRepeatedFailures(env, requestContext.ipAddress);
        if (failures.exceeded) {
          await logSecurityEvent(env, EVENT_TYPE.MULTIPLE_FAILED_ATTEMPTS, SEVERITY.CRITICAL, {
            ...requestContext,
            path,
            attemptCount: failures.count,
            reason: 'Multiple failed authentication attempts detected',
          });
        }

        return errorResponse(request, env, auth.error, 401);
      }

      // Log successful API access
      await logSecurityEvent(env, EVENT_TYPE.API_ACCESS_SUCCESS, SEVERITY.INFO, {
        ...requestContext,
        email: auth.email,
        userId: auth.userId,
        path,
        method: request.method,
      });

      // Verify token endpoint
      if (path === '/api/verify') {
        return successResponse(request, env, {
          authenticated: true,
          userId: auth.userId,
          email: auth.email,
        });
      }

      // Dashboard statistics
      if (path === '/api/stats') {
        await logSecurityEvent(env, EVENT_TYPE.API_STATS_VIEWED, SEVERITY.INFO, {
          ...requestContext,
          email: auth.email,
          userId: auth.userId,
        });

        // TODO: Query actual stats from database
        // For now, return placeholder data
        return successResponse(request, env, {
          stats: {
            totalUsers: 0,
            activeSessions: 0,
            securityEvents: 0,
          },
        });
      }

      // User management endpoints
      if (path === '/api/users') {
        if (request.method === 'GET') {
          await logSecurityEvent(env, EVENT_TYPE.API_USERS_VIEWED, SEVERITY.INFO, {
            ...requestContext,
            email: auth.email,
            userId: auth.userId,
          });

          // TODO: List users from database
          return successResponse(request, env, {
            users: [],
            total: 0,
          });
        }
      }

      // Security logs endpoint
      if (path === '/api/security-logs') {
        if (request.method === 'GET') {
          await logSecurityEvent(env, EVENT_TYPE.API_ACCESS_SUCCESS, SEVERITY.INFO, {
            ...requestContext,
            email: auth.email,
            userId: auth.userId,
            action: 'view_security_logs',
          });

          // TODO: Query security logs from database
          return successResponse(request, env, {
            logs: [],
            total: 0,
          });
        }
      }

      // Client-side event logging endpoint
      if (path === '/api/log-event' && request.method === 'POST') {
        try {
          const body = await request.json();
          const { eventType, severity, details } = body;

          await logSecurityEvent(env, eventType, severity || SEVERITY.INFO, {
            ...requestContext,
            email: auth.email,
            userId: auth.userId,
            ...details,
          });

          return successResponse(request, env, { logged: true });
        } catch (error) {
          return errorResponse(request, env, 'Failed to log event', 500);
        }
      }

      return errorResponse(request, env, 'API endpoint not found', 404);
    }

    // Public event logging (for OAuth callback events before auth)
    if (path === '/log-oauth-event' && request.method === 'POST') {
      const requestContext = getRequestContext(request);

      try {
        const body = await request.json();
        const { eventType, severity, email, reason } = body;

        await logSecurityEvent(env, eventType, severity || SEVERITY.WARNING, {
          ...requestContext,
          email: email || 'unknown',
          reason: reason || 'OAuth authentication attempt',
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...buildCorsHeaders(request, env),
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...buildCorsHeaders(request, env),
          },
        });
      }
    }

    // Serve admin dashboard HTML
    if (path === '/' || path === '/index.html') {
      return new Response(getAdminDashboardHTML(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return errorResponse(request, env, 'Not found', 404);
  },
};
