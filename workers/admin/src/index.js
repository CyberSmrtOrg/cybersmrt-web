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
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return { valid: false, error: 'Insufficient permissions - admin role required' };
    }

    // Check email domain - must be @cybersmrt.org
    const email = payload.email || '';
    if (!email.endsWith('@cybersmrt.org')) {
      return { valid: false, error: 'Access denied - must use @cybersmrt.org email' };
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
      background: linear-gradient(135deg, #1a0033 0%, #4a0080 50%, #7b2cbf 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: transparent;
      border-radius: 20px;
      max-width: 1200px;
      width: 100%;
      overflow: hidden;
    }

    .header {
      background: #000000;
      color: white;
      padding: 20px 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #667eea;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-logo {
      max-width: 120px;
      height: auto;
    }

    .header h1 {
      font-size: 1.3rem;
      margin: 0;
      font-weight: 600;
      color: #667eea;
    }

    .header-nav {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .header-nav-btn {
      background: transparent;
      border: none;
      color: #cbd5e1;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .header-nav-btn:hover {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
    }

    .header-nav-btn.active {
      background: #667eea;
      color: white;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: white;
    }

    .user-email {
      font-size: 11px;
      color: #94a3b8;
    }

    .logout-btn {
      background: #ef4444;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }

    .content {
      padding: 40px;
      background: white;
      border-radius: 0 0 20px 20px;
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

    .content-area {
      min-height: 400px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .data-table thead {
      background: #f8f9fa;
    }

    .data-table th {
      text-align: left;
      padding: 12px 16px;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
    }

    .data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      color: #555;
    }

    .data-table tr:hover {
      background: #f8f9ff;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge.admin {
      background: #667eea;
      color: white;
    }

    .badge.super_admin {
      background: #764ba2;
      color: white;
    }

    .badge.user {
      background: #e0e0e0;
      color: #666;
    }

    .badge.success {
      background: #10b981;
      color: white;
    }

    .badge.warning {
      background: #f59e0b;
      color: white;
    }

    .badge.danger {
      background: #ef4444;
      color: white;
    }

    .badge.info {
      background: #3b82f6;
      color: white;
    }

    .action-btn {
      padding: 6px 12px;
      margin: 0 4px;
      border: 1px solid #e0e0e0;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #f0f0f0;
      border-color: #667eea;
    }

    .search-box {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .search-box:focus {
      outline: none;
      border-color: #667eea;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    /* Chart styles */
    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-top: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .chart-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }

    .progress-ring {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      min-height: 200px;
    }

    .ring {
      position: relative;
      width: 160px;
      height: 160px;
    }

    .ring svg {
      transform: rotate(-90deg);
    }

    .ring-background {
      fill: none;
      stroke: #f0f0f0;
      stroke-width: 12;
    }

    .ring-progress {
      fill: none;
      stroke: #667eea;
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .ring-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 32px;
      font-weight: 700;
      color: #333;
    }

    .ring-label {
      margin-top: 12px;
      font-size: 14px;
      color: #666;
    }

    /* Content Management Styles */
    .content-type-btn {
      padding: 12px 24px;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      color: #666;
    }

    .content-type-btn:hover {
      background: #f8f9fa;
      border-color: #667eea;
      color: #667eea;
    }

    .content-type-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
      color: white;
    }

    .content-type-section {
      display: none;
    }

    .content-type-section.active {
      display: block;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      height: 200px;
      padding: 20px 0;
    }

    .bar {
      flex: 1;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 6px 6px 0 0;
      min-height: 20px;
      position: relative;
      transition: all 0.3s ease;
    }

    .bar:hover {
      opacity: 0.8;
      transform: translateY(-4px);
    }

    .bar-label {
      position: absolute;
      bottom: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #666;
      white-space: nowrap;
    }

    .bar-value {
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <img src="https://cybersmrt.org/assets/logos/cybersmrt-logo-stacked.png" alt="CyberSmrt" class="header-logo">
        <h1>Admin Dashboard</h1>
      </div>
      <div class="header-nav" id="headerNav" style="display: none;">
        <button class="header-nav-btn active" onclick="loadSection('dashboard')" data-section="dashboard">Dashboard</button>
        <button class="header-nav-btn" onclick="loadSection('users')" data-section="users">Users</button>
        <button class="header-nav-btn" onclick="loadSection('analytics')" data-section="analytics">Analytics</button>
        <button class="header-nav-btn" onclick="loadSection('content')" data-section="content">Content</button>
        <button class="header-nav-btn" onclick="loadSection('security')" data-section="security">Security</button>
      </div>
      <div class="header-right" id="headerRight" style="display: none;">
        <div class="user-info">
          <div class="user-avatar" id="userAvatar">?</div>
          <div class="user-details">
            <div class="user-name" id="userName">Loading...</div>
            <div class="user-email" id="userEmail"></div>
          </div>
        </div>
        <button class="logout-btn" onclick="logout()">Logout</button>
      </div>
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

      <!-- 2FA Verification -->
      <div id="twofaContainer" class="login-container" style="display: none;">
        <div class="info">
          Two-factor authentication is required for your account
        </div>
        <div id="twofaErrorMessage" class="error" style="display: none;"></div>

        <div style="margin-bottom: 20px;">
          <label for="twofa-code" style="display: block; margin-bottom: 8px; color: #333; font-weight: 600;">
            Enter your 6-digit code or backup code:
          </label>
          <input
            type="text"
            id="twofa-code"
            placeholder="000000"
            maxlength="9"
            autocomplete="off"
            style="width: 100%; padding: 14px; background: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 8px; color: #333; font-size: 1.2rem; text-align: center; letter-spacing: 0.2em; font-family: 'Courier New', monospace;"
          />
        </div>
        <button id="verify-2fa-btn" class="btn" onclick="verify2FA()">Verify</button>
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

        <div id="content-area" class="content-area">
          <div class="section">
            <h2>Welcome to Admin Dashboard</h2>
            <p>Use the navigation menu above to manage your CyberSmrt platform.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let authToken = null;
    let pendingAuthData = null;

    // Initiate OAuth login with specified provider
    function initiateOAuth(provider) {
      // Store state to identify admin dashboard return
      const state = btoa(JSON.stringify({
        returnUrl: 'https://admin.cybersmrt.org/',
        timestamp: Date.now()
      }));
      sessionStorage.setItem('oauth_state', state);

      // Redirect to OAuth provider
      window.location.href = \`https://auth.cybersmrt.org/\${provider}?state=\${encodeURIComponent(state)}\`;
    }

    // Check for existing session or OAuth callback
    window.addEventListener('DOMContentLoaded', () => {
      // Check if we have a token from OAuth callback in URL hash
      const hash = window.location.hash.substring(1);
      if (hash) {
        try {
          const data = JSON.parse(atob(hash));
          // Handle 2FA requirement or regular token callback
          if (data.requires2FA || data.token) {
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

        // Handle 2FA requirement
        if (data.requires2FA) {
          // Store pending auth data
          pendingAuthData = data;

          // Hide login container, show 2FA container
          document.getElementById('loginContainer').style.display = 'none';
          document.getElementById('twofaContainer').style.display = 'block';

          // Focus on input
          document.getElementById('twofa-code').focus();
          return;
        }

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

    // Verify 2FA code
    async function verify2FA() {
      if (!pendingAuthData) {
        const errorDiv = document.getElementById('twofaErrorMessage');
        errorDiv.textContent = 'No pending authentication found';
        errorDiv.style.display = 'block';
        return;
      }

      const code = document.getElementById('twofa-code').value.trim();

      if (!code) {
        const errorDiv = document.getElementById('twofaErrorMessage');
        errorDiv.textContent = 'Please enter your verification code';
        errorDiv.style.display = 'block';
        return;
      }

      // Disable button
      const btn = document.getElementById('verify-2fa-btn');
      btn.disabled = true;
      btn.textContent = 'Verifying...';

      try {
        const response = await fetch('https://auth.cybersmrt.org/2fa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: pendingAuthData.userId,
            code: code,
            pendingAuthId: pendingAuthData.pendingAuthId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Verification failed');
        }

        if (result.success && result.verified && result.tokens && result.tokens.accessToken) {
          // Clear the hash from URL
          window.location.hash = '';

          // Decode JWT to check role and email
          const payload = JSON.parse(atob(result.tokens.accessToken.split('.')[1]));

          // Verify user email is @cybersmrt.org
          if (!payload.email || !payload.email.endsWith('@cybersmrt.org')) {
            await fetch('/log-oauth-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'admin_login_failed_invalid_email',
                severity: 'critical',
                email: payload.email,
                reason: 'Non-@cybersmrt.org email attempted admin access via 2FA'
              })
            }).catch(console.error);

            const errorDiv = document.getElementById('twofaErrorMessage');
            errorDiv.textContent = 'Access denied - @cybersmrt.org email required';
            errorDiv.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Verify';
            return;
          }

          // Verify user has admin or super_admin role
          if (payload.role !== 'admin' && payload.role !== 'super_admin') {
            await fetch('/log-oauth-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'admin_login_failed_invalid_role',
                severity: 'critical',
                email: payload.email,
                reason: \`User with role '\${payload.role}' attempted admin access via 2FA\`
              })
            }).catch(console.error);

            const errorDiv = document.getElementById('twofaErrorMessage');
            errorDiv.textContent = 'Access denied - admin privileges required';
            errorDiv.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Verify';
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
              reason: 'Successful admin dashboard login with 2FA'
            })
          }).catch(console.error);

          // Store token and show dashboard
          authToken = result.tokens.accessToken;
          localStorage.setItem('adminToken', authToken);

          // Hide 2FA form, show dashboard
          document.getElementById('twofaContainer').style.display = 'none';
          showDashboard();
          loadDashboardStats();
        } else {
          throw new Error('Verification failed');
        }
      } catch (error) {
        console.error('2FA verification error:', error);
        const errorDiv = document.getElementById('twofaErrorMessage');
        errorDiv.textContent = error.message || 'Invalid verification code. Please try again.';
        errorDiv.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Verify';
      }
    }

    // Allow Enter key to submit 2FA
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('twofa-code')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          verify2FA();
        }
      });
    });

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
      // Decode JWT to get user info
      try {
        const tokenParts = authToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));

          // Populate user info
          const email = payload.email || '';
          const name = payload.displayName || payload.name || email.split('@')[0];
          const initials = name.charAt(0).toUpperCase();

          document.getElementById('userName').textContent = name;
          document.getElementById('userEmail').textContent = email;
          document.getElementById('userAvatar').textContent = initials;

          // Show header elements
          document.getElementById('headerNav').style.display = 'flex';
          document.getElementById('headerRight').style.display = 'flex';
        }
      } catch (e) {
        console.error('Failed to decode user info:', e);
      }

      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('twofaContainer').style.display = 'none';
      document.getElementById('dashboard').classList.add('active');
    }

    function logout() {
      localStorage.removeItem('adminToken');
      authToken = null;

      // Hide header elements
      document.getElementById('headerNav').style.display = 'none';
      document.getElementById('headerRight').style.display = 'none';

      // Show login, hide dashboard
      document.getElementById('loginContainer').style.display = 'block';
      document.getElementById('dashboard').classList.remove('active');

      // Reload to reset state
      window.location.reload();
    }

    function handleLogout() {
      logout();
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

    async function loadSection(section) {
      const contentArea = document.getElementById('content-area');

      // Update active nav button
      document.querySelectorAll('.header-nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
          btn.classList.add('active');
        }
      });

      // Update active old nav button for backwards compatibility
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });

      switch(section) {
        case 'dashboard':
          contentArea.innerHTML = \`
            <div class="section">
              <h2>Welcome to CyberSmrt Admin</h2>
              <p>Use the navigation menu in the header to manage users, view analytics, and monitor security.</p>
            </div>
          \`;
          break;
        case 'users':
          await loadUserManagement(contentArea);
          break;
        case 'security':
          await loadSecurityLogs(contentArea);
          break;
        case 'analytics':
          await loadAnalytics(contentArea);
          break;
        case 'content':
          await loadContentManagement(contentArea);
          break;
        case 'monitoring':
          contentArea.innerHTML = '<div class="section"><h2>📈 System Monitoring</h2><p>Coming soon...</p></div>';
          break;
        case 'settings':
          contentArea.innerHTML = '<div class="section"><h2>⚙️ Settings</h2><p>Coming soon...</p></div>';
          break;
        default:
          contentArea.innerHTML = '<div class="section"><h2>Unknown Section</h2><p>Section not found</p></div>';
      }
    }

    async function loadUserManagement(container) {
      container.innerHTML = \`
        <div class="section">
          <h2>👥 User Management</h2>
          <input type="text" class="search-box" id="user-search" placeholder="Search users by name or email..." onkeyup="filterUsers()">
          <div class="loading">Loading users...</div>
        </div>
      \`;

      try {
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': \`Bearer \${authToken}\`,
          },
        });

        if (!response.ok) throw new Error('Failed to load users');

        const data = await response.json();

        if (data.success && data.users && data.users.length > 0) {
          container.innerHTML = \`
            <div class="section">
              <h2>👥 User Management</h2>
              <p style="color: #666; margin-bottom: 20px;">Total Users: \${data.total || data.users.length}</p>
              <input type="text" class="search-box" id="user-search" placeholder="Search users by name or email..." onkeyup="filterUsers()">
              <table class="data-table" id="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  \${data.users.map(user => \`
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <div style="width: 32px; height: 32px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            \${(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span>\${user.displayName || 'No name'}</span>
                        </div>
                      </td>
                      <td>\${user.email || 'N/A'}</td>
                      <td><span class="badge \${user.role || 'user'}">\${user.role || 'user'}</span></td>
                      <td><span class="badge \${user.banned ? 'danger' : 'success'}">\${user.banned ? 'Banned' : 'Active'}</span></td>
                      <td>\${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button class="action-btn" onclick="viewUser('\${user.id}')">View</button>
                        <button class="action-btn" onclick="editUserRole('\${user.id}', '\${user.role}')">Role</button>
                        <button class="action-btn" onclick="toggleUserBan('\${user.id}', \${user.banned || false})">\${user.banned ? 'Unban' : 'Ban'}</button>
                      </td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
        } else {
          container.innerHTML = \`
            <div class="section">
              <h2>👥 User Management</h2>
              <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p>No users found</p>
              </div>
            </div>
          \`;
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        container.innerHTML = \`
          <div class="section">
            <h2>👥 User Management</h2>
            <div class="error">Failed to load users: \${error.message}</div>
          </div>
        \`;
      }
    }

    async function loadSecurityLogs(container) {
      container.innerHTML = \`
        <div class="section">
          <h2>🔒 Security Logs</h2>
          <div class="loading">Loading security events...</div>
        </div>
      \`;

      try {
        const response = await fetch('/api/security-logs?limit=50', {
          headers: {
            'Authorization': \`Bearer \${authToken}\`,
          },
        });

        if (!response.ok) throw new Error('Failed to load security logs');

        const data = await response.json();

        if (data.success && data.logs && data.logs.length > 0) {
          container.innerHTML = \`
            <div class="section">
              <h2>🔒 Security Logs</h2>
              <p style="color: #666; margin-bottom: 20px;">Showing last 50 events</p>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Severity</th>
                    <th>User/IP</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  \${data.logs.map(log => \`
                    <tr>
                      <td>\${new Date(log.timestamp).toLocaleString()}</td>
                      <td style="font-family: monospace; font-size: 12px;">\${log.eventType || 'unknown'}</td>
                      <td><span class="badge \${log.severity === 'critical' ? 'danger' : log.severity === 'warning' ? 'warning' : 'info'}">\${log.severity || 'info'}</span></td>
                      <td>\${log.email || log.ipAddress || 'N/A'}</td>
                      <td style="font-size: 13px; color: #666;">\${log.reason || log.details || '-'}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \`;
        } else {
          container.innerHTML = \`
            <div class="section">
              <h2>🔒 Security Logs</h2>
              <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p>No security events found</p>
              </div>
            </div>
          \`;
        }
      } catch (error) {
        console.error('Failed to load security logs:', error);
        container.innerHTML = \`
          <div class="section">
            <h2>🔒 Security Logs</h2>
            <div class="error">Failed to load security logs: \${error.message}</div>
          </div>
        \`;
      }
    }

    async function loadAnalytics(container) {
      container.innerHTML = \`
        <div class="section">
          <h2>📊 Analytics</h2>
          <div class="loading">Loading analytics data...</div>
        </div>
      \`;

      try {
        const response = await fetch('/api/analytics', {
          headers: {
            'Authorization': \`Bearer \${authToken}\`,
          },
        });

        if (!response.ok) throw new Error('Failed to load analytics');

        const data = await response.json();

        const twoFAPercent = data.twoFAAdoption || 0;
        const loginPercent = data.loginSuccessRate || 0;

        // Calculate SVG circle values
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const twoFAOffset = circumference - (twoFAPercent / 100) * circumference;
        const loginOffset = circumference - (loginPercent / 100) * circumference;

        container.innerHTML = \`
          <div class="section">
            <h2>📊 Analytics</h2>

            <h3 style="margin-top: 20px; margin-bottom: 15px; color: #333;">User Analytics</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>New Users (7d)</h3>
                <div class="value">\${data.newUsersWeek || 0}</div>
                <div class="label">Last 7 days</div>
              </div>
              <div class="stat-card">
                <h3>Active Users (30d)</h3>
                <div class="value">\${data.activeUsersMonth || 0}</div>
                <div class="label">Last 30 days</div>
              </div>
              <div class="stat-card">
                <h3>Total Users</h3>
                <div class="value">\${data.totalUsers || 0}</div>
                <div class="label">All registered users</div>
              </div>
              <div class="stat-card">
                <h3>2FA Users</h3>
                <div class="value">\${data.twoFAUsers || 0}</div>
                <div class="label">With 2FA enabled</div>
              </div>
            </div>

            <!-- Security Metrics Charts -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
              <div class="chart-container">
                <div class="chart-title">2FA Adoption Rate</div>
                <div class="progress-ring">
                  <div class="ring">
                    <svg width="160" height="160">
                      <circle class="ring-background" cx="80" cy="80" r="70"></circle>
                      <circle class="ring-progress" cx="80" cy="80" r="70"
                        stroke-dasharray="\${circumference}"
                        stroke-dashoffset="\${twoFAOffset}"></circle>
                    </svg>
                    <div class="ring-text">\${twoFAPercent}%</div>
                  </div>
                  <div class="ring-label">\${data.twoFAUsers || 0} of \${data.totalUsers || 0} users</div>
                </div>
              </div>

              <div class="chart-container">
                <div class="chart-title">Login Success Rate</div>
                <div class="progress-ring">
                  <div class="ring">
                    <svg width="160" height="160">
                      <circle class="ring-background" cx="80" cy="80" r="70"></circle>
                      <circle class="ring-progress" cx="80" cy="80" r="70"
                        stroke-dasharray="\${circumference}"
                        stroke-dashoffset="\${loginOffset}"
                        style="stroke: #10b981;"></circle>
                    </svg>
                    <div class="ring-text">\${loginPercent}%</div>
                  </div>
                  <div class="ring-label">Last 30 days</div>
                </div>
              </div>
            </div>

            <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Cloudflare Analytics (7d)</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Page Views</h3>
                <div class="value">\${(data.cloudflare?.pageViews || 0).toLocaleString()}</div>
                <div class="label">Total page views</div>
              </div>
              <div class="stat-card">
                <h3>Unique Visitors</h3>
                <div class="value">\${(data.cloudflare?.uniqueVisitors || 0).toLocaleString()}</div>
                <div class="label">Unique visitors</div>
              </div>
              <div class="stat-card">
                <h3>Bandwidth</h3>
                <div class="value">\${(data.cloudflare?.bandwidth || 0).toLocaleString()} MB</div>
                <div class="label">Total bandwidth used</div>
              </div>
              <div class="stat-card">
                <h3>Total Requests</h3>
                <div class="value">\${(data.cloudflare?.requests || 0).toLocaleString()}</div>
                <div class="label">All requests</div>
              </div>
            </div>

            <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Google Analytics</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Sessions</h3>
                <div class="value">\${(data.googleAnalytics?.sessions || 0).toLocaleString()}</div>
                <div class="label">Total sessions</div>
              </div>
              <div class="stat-card">
                <h3>Users</h3>
                <div class="value">\${(data.googleAnalytics?.users || 0).toLocaleString()}</div>
                <div class="label">Unique users</div>
              </div>
              <div class="stat-card">
                <h3>Pageviews</h3>
                <div class="value">\${(data.googleAnalytics?.pageviews || 0).toLocaleString()}</div>
                <div class="label">Total pageviews</div>
              </div>
            </div>

            <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Microsoft Clarity</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Session Recordings</h3>
                <div class="value">\${(data.clarity?.recordings || 0).toLocaleString()}</div>
                <div class="label">Total recordings</div>
              </div>
              <div class="stat-card">
                <h3>Dead Clicks</h3>
                <div class="value">\${(data.clarity?.deadClicks || 0).toLocaleString()}</div>
                <div class="label">UX issues detected</div>
              </div>
            </div>
          </div>
        \`;
      } catch (error) {
        console.error('Failed to load analytics:', error);
        container.innerHTML = \`
          <div class="section">
            <h2>📊 Analytics</h2>
            <div class="error">Failed to load analytics: \${error.message}</div>
          </div>
        \`;
      }
    }

    async function loadContentManagement(container) {
      container.innerHTML = \`
        <div class="section">
          <h2>📝 Content Management</h2>
          <p style="color: #666; margin-bottom: 30px;">Create and manage blog posts, news articles, and press releases.</p>

          <!-- Content Type Selector -->
          <div style="margin-bottom: 30px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="content-type-btn active" onclick="showContentType('blog')" data-type="blog">
                📰 Blog Posts
              </button>
              <button class="content-type-btn" onclick="showContentType('news')" data-type="news">
                📢 News
              </button>
              <button class="content-type-btn" onclick="showContentType('press')" data-type="press">
                📄 Press Releases
              </button>
            </div>
          </div>

          <!-- Content Areas -->
          <div id="content-type-area">
            <!-- Blog Posts -->
            <div id="blog-content" class="content-type-section active">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">Blog Posts</h3>
                <button class="action-btn" onclick="createNewPost('blog')">
                  ➕ New Blog Post
                </button>
              </div>
              <div class="info" style="margin-bottom: 20px;">
                Manage blog posts that appear on <a href="https://cybersmrt.org/blog.html" target="_blank">cybersmrt.org/blog.html</a>
              </div>
              <div class="loading">Loading blog posts...</div>
            </div>

            <!-- News -->
            <div id="news-content" class="content-type-section">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">News Articles</h3>
                <button class="action-btn" onclick="createNewPost('news')">
                  ➕ New News Article
                </button>
              </div>
              <div class="info" style="margin-bottom: 20px;">
                Manage news articles that appear on the CyberSmrt website
              </div>
              <div class="loading">Loading news articles...</div>
            </div>

            <!-- Press Releases -->
            <div id="press-content" class="content-type-section">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">Press Releases</h3>
                <button class="action-btn" onclick="createNewPost('press')">
                  ➕ New Press Release
                </button>
              </div>
              <div class="info" style="margin-bottom: 20px;">
                Manage official press releases for media and stakeholders
              </div>
              <div class="loading">Loading press releases...</div>
            </div>

          </div>
        </div>
      \`;

      // Load initial content based on active tab
      loadBlogPosts();
    }

    function showContentType(type) {
      // Update active button
      document.querySelectorAll('.content-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
          btn.classList.add('active');
        }
      });

      // Update visible content section
      document.querySelectorAll('.content-type-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(type + '-content').classList.add('active');

      // Load appropriate content
      switch(type) {
        case 'blog':
          loadBlogPosts();
          break;
        case 'news':
          loadNewsArticles();
          break;
        case 'press':
          loadPressReleases();
          break;
      }
    }

    async function loadBlogPosts() {
      const container = document.getElementById('blog-content');
      const loadingDiv = container.querySelector('.loading');

      try {
        // TODO: Implement actual API call when backend is ready
        // For now, show placeholder
        loadingDiv.innerHTML = \`
          <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <p style="margin-bottom: 20px;">Blog post management coming soon</p>
            <p style="font-size: 14px; color: #999;">This will integrate with the existing blog system at cybersmrt.org/blog.html</p>
          </div>
        \`;
      } catch (error) {
        loadingDiv.innerHTML = '<div class="error">Failed to load blog posts</div>';
      }
    }

    async function loadNewsArticles() {
      const container = document.getElementById('news-content');
      const loadingDiv = container.querySelector('.loading');

      loadingDiv.innerHTML = \`
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">📢</div>
          <p>News article management coming soon</p>
        </div>
      \`;
    }

    async function loadPressReleases() {
      const container = document.getElementById('press-content');
      const loadingDiv = container.querySelector('.loading');

      loadingDiv.innerHTML = \`
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
          <p>Press release management coming soon</p>
        </div>
      \`;
    }

    function createNewPost(type) {
      alert('Create new ' + type + ' post - Editor coming soon!');
    }

    function filterUsers() {
      const searchInput = document.getElementById('user-search');
      const filter = searchInput.value.toUpperCase();
      const table = document.getElementById('users-table');
      if (!table) return;

      const tr = table.getElementsByTagName('tr');

      for (let i = 1; i < tr.length; i++) {
        const tdName = tr[i].getElementsByTagName('td')[0];
        const tdEmail = tr[i].getElementsByTagName('td')[1];

        if (tdName || tdEmail) {
          const nameValue = tdName.textContent || tdName.innerText;
          const emailValue = tdEmail.textContent || tdEmail.innerText;

          if (nameValue.toUpperCase().indexOf(filter) > -1 || emailValue.toUpperCase().indexOf(filter) > -1) {
            tr[i].style.display = '';
          } else {
            tr[i].style.display = 'none';
          }
        }
      }
    }

    function viewUser(userId) {
      alert(\`View user details for: \${userId}\nFull user profile modal coming soon...\`);
    }

    function editUserRole(userId, currentRole) {
      const newRole = prompt(\`Enter new role for user \${userId}:\n\nAvailable roles:\n- user\n- admin\n- super_admin\`, currentRole);

      if (newRole && ['user', 'admin', 'super_admin'].includes(newRole)) {
        alert(\`Role update functionality coming soon...\nWould update user \${userId} to role: \${newRole}\`);
        // TODO: Implement role update API call
      } else if (newRole) {
        alert('Invalid role. Please use: user, admin, or super_admin');
      }
    }

    function toggleUserBan(userId, currentlyBanned) {
      const action = currentlyBanned ? 'unban' : 'ban';
      if (confirm(\`Are you sure you want to \${action} this user?\`)) {
        alert(\`User \${action} functionality coming soon...\nWould \${action} user: \${userId}\`);
        // TODO: Implement ban/unban API call
      }
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

        try {
          // Fetch stats from auth worker
          const authUrl = new URL('/admin/stats', env.AUTH_API_URL || 'https://auth.cybersmrt.org');
          const authResponse = await fetch(authUrl.toString(), {
            method: 'GET',
            headers: {
              'Authorization': request.headers.get('Authorization'),
              'Content-Type': 'application/json',
            },
          });

          if (authResponse.ok) {
            const data = await authResponse.json();
            return successResponse(request, env, data);
          }

          // Fallback to placeholder data if auth service unavailable
          return successResponse(request, env, {
            stats: {
              totalUsers: 0,
              activeSessions: 0,
              securityEvents: 0,
            },
          });
        } catch (error) {
          console.error('Error fetching stats:', error);
          return successResponse(request, env, {
            stats: {
              totalUsers: 0,
              activeSessions: 0,
              securityEvents: 0,
            },
          });
        }
      }

      // User management endpoints
      if (path === '/api/users') {
        if (request.method === 'GET') {
          await logSecurityEvent(env, EVENT_TYPE.API_USERS_VIEWED, SEVERITY.INFO, {
            ...requestContext,
            email: auth.email,
            userId: auth.userId,
          });

          // Fetch users from auth worker
          try {
            const authUrl = new URL('/admin/users', env.AUTH_API_URL || 'https://auth.cybersmrt.org');
            const authResponse = await fetch(authUrl.toString(), {
              method: 'GET',
              headers: {
                'Authorization': request.headers.get('Authorization'),
                'Content-Type': 'application/json',
              },
            });

            if (!authResponse.ok) {
              const errorText = await authResponse.text();
              console.error('Auth service error:', authResponse.status, errorText);
              throw new Error('Failed to fetch users from auth service: ' + authResponse.status + ' - ' + errorText);
            }

            const data = await authResponse.json();
            return successResponse(request, env, data);
          } catch (error) {
            console.error('Error fetching users:', error);
            return errorResponse(request, env, error.message || 'Failed to load users', 500);
          }
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

          // Fetch security logs from KV store
          try {
            const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50');
            const logs = [];

            // Fetch recent security logs from SECURITY_LOGS KV
            const logsList = await env.SECURITY_LOGS.list({ limit: Math.min(limit, 100) });

            for (const key of logsList.keys) {
              try {
                const logData = await env.SECURITY_LOGS.get(key.name);
                if (logData) {
                  const log = JSON.parse(logData);
                  logs.push(log);
                }
              } catch (e) {
                console.error('Failed to parse log:', e);
              }
            }

            // Sort logs by timestamp (most recent first)
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return successResponse(request, env, {
              logs: logs.slice(0, limit),
              total: logs.length,
            });
          } catch (error) {
            console.error('Error fetching security logs:', error);
            return errorResponse(request, env, 'Failed to load security logs', 500);
          }
        }
      }

      // Analytics endpoint
      if (path === '/api/analytics') {
        if (request.method === 'GET') {
          await logSecurityEvent(env, EVENT_TYPE.API_ACCESS_SUCCESS, SEVERITY.INFO, {
            ...requestContext,
            email: auth.email,
            userId: auth.userId,
            action: 'view_analytics',
          });

          try {
            const analyticsData = {
              newUsersWeek: 0,
              activeUsersMonth: 0,
              loginSuccessRate: 0,
              twoFAAdoption: 0,
              cloudflare: { pageViews: 0, uniqueVisitors: 0, bandwidth: 0, requests: 0 },
              googleAnalytics: { sessions: 0, users: 0, pageviews: 0 },
              clarity: { recordings: 0, deadClicks: 0 },
            };

            // Fetch user analytics from auth worker
            try {
              const authUrl = new URL('/admin/analytics', env.AUTH_API_URL || 'https://auth.cybersmrt.org');
              const authResponse = await fetch(authUrl.toString(), {
                method: 'GET',
                headers: {
                  'Authorization': request.headers.get('Authorization'),
                  'Content-Type': 'application/json',
                },
              });

              if (authResponse.ok) {
                const authData = await authResponse.json();
                Object.assign(analyticsData, authData);
              }
            } catch (error) {
              console.error('Error fetching auth analytics:', error);
            }

            // Fetch Cloudflare Analytics (last 7 days)
            if (env.CLOUDFLARE_API_TOKEN) {
              try {
                const zoneId = '9c1eb0e5c42b7d90cbb1c0e3c3da3d85';
                const cfUrl = 'https://api.cloudflare.com/client/v4/zones/' + zoneId + '/analytics/dashboard?since=-10080&until=0';

                const cfResponse = await fetch(cfUrl, {
                  headers: {
                    'Authorization': 'Bearer ' + env.CLOUDFLARE_API_TOKEN,
                    'Content-Type': 'application/json',
                  },
                });

                if (cfResponse.ok) {
                  const cfData = await cfResponse.json();
                  if (cfData.success && cfData.result) {
                    analyticsData.cloudflare = {
                      pageViews: cfData.result.totals?.pageviews?.all || 0,
                      uniqueVisitors: cfData.result.totals?.uniques?.all || 0,
                      bandwidth: Math.round((cfData.result.totals?.bandwidth?.all || 0) / 1024 / 1024), // Convert to MB
                      requests: cfData.result.totals?.requests?.all || 0,
                    };
                  }
                }
              } catch (error) {
                console.error('Error fetching Cloudflare analytics:', error);
              }
            }

            return successResponse(request, env, analyticsData);
          } catch (error) {
            console.error('Error fetching analytics:', error);
            return successResponse(request, env, {
              newUsersWeek: 0,
              activeUsersMonth: 0,
              loginSuccessRate: 0,
              twoFAAdoption: 0,
              cloudflare: { pageViews: 0, uniqueVisitors: 0 },
            });
          }
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

    // Serve admin dashboard HTML for all non-API routes
    // This allows client-side routing and OAuth callback handling
    return new Response(getAdminDashboardHTML(), {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cybersmrt.org data:; connect-src 'self' https://auth.cybersmrt.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
      },
    });
  },
};
