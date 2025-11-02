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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

    .header h1 {
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .content {
      padding: 40px;
    }

    .login-form {
      max-width: 400px;
      margin: 0 auto;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
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
      <h1>🛡️ CyberSmrt Admin</h1>
      <p>Administrative Dashboard</p>
    </div>

    <div class="content">
      <!-- Login Form -->
      <div id="loginForm" class="login-form">
        <div class="info">
          Please log in with your admin credentials
        </div>
        <div id="errorMessage" class="error" style="display: none;"></div>
        <form onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required placeholder="admin@cybersmrt.org">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required placeholder="Enter your password">
          </div>
          <button type="submit" class="btn">Sign In</button>
        </form>
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

    // Check for existing session
    window.addEventListener('DOMContentLoaded', () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        authToken = token;
        verifyAndShowDashboard();
      }
    });

    async function handleLogin(event) {
      event.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('errorMessage');

      try {
        // Call auth API to login
        const response = await fetch('https://auth.cybersmrt.org/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.success && data.token) {
          // Verify user has admin role
          const payload = JSON.parse(atob(data.token.split('.')[1]));

          if (payload.role !== 'admin') {
            errorDiv.textContent = 'Access denied - admin privileges required';
            errorDiv.style.display = 'block';
            return;
          }

          authToken = data.token;
          localStorage.setItem('adminToken', authToken);
          showDashboard();
          loadDashboardStats();
        } else {
          errorDiv.textContent = data.error || 'Login failed';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        errorDiv.textContent = 'Network error - please try again';
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
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('dashboard').classList.add('active');
    }

    function handleLogout() {
      localStorage.removeItem('adminToken');
      authToken = null;
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('dashboard').classList.remove('active');
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
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
      // Verify admin token
      const auth = await verifyAdminToken(request, env);
      if (!auth.valid) {
        return errorResponse(request, env, auth.error, 401);
      }

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
          // TODO: Query security logs from database
          return successResponse(request, env, {
            logs: [],
            total: 0,
          });
        }
      }

      return errorResponse(request, env, 'API endpoint not found', 404);
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
