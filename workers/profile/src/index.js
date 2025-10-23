/**
 * CyberSmrt Profile API Worker
 * Main entry point
 */

import { ProfileRouter } from './router.js';

/**
 * Build CORS headers dynamically
 */
function buildCorsHeaders(request, env, includeCredentials = false) {
  const origin = request.headers.get('Origin') || request.headers.get('origin') || null;
  const allowedOrigin = env.FRONTEND_ORIGIN || null;

  const headers = {};
  if (includeCredentials) {
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    else if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    else headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigin || '*';
  }

  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  headers['Access-Control-Max-Age'] = '86400';

  return headers;
}

/**
 * Handle CORS preflight
 */
function handleOptions(request, env) {
  return new Response(null, {
    headers: buildCorsHeaders(request, env, true),
  });
}

/**
 * Error response helper
 */
function errorResponse(request, env, message, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request, env, true),
    },
  });
}

/**
 * Success response helper
 */
function jsonResponse(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request, env, true),
    },
  });
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, _ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const router = new ProfileRouter(env, request);

      // Profile endpoints
      if (path === '/profile' && request.method === 'GET') {
        return await router.handleGetProfile();
      }
      if (path === '/profile' && request.method === 'PUT') {
        return await router.handleUpdateProfile();
      }

      // Settings endpoints
      if (path === '/settings' && request.method === 'GET') {
        return await router.handleGetSettings();
      }
      if (path === '/settings' && request.method === 'PUT') {
        return await router.handleUpdateSettings();
      }

      // Security logs
      if (path === '/security-logs' && request.method === 'GET') {
        return await router.handleGetSecurityLogs();
      }

      // Account management
      if (path === '/export' && request.method === 'GET') {
        return await router.handleExportData();
      }
      if (path === '/account' && request.method === 'DELETE') {
        return await router.handleDeleteAccount();
      }

      // Health check
      if (path === '/health') {
        return jsonResponse(request, env, {
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }

      // API documentation
      if (path === '' || path === '/') {
        return jsonResponse(request, env, {
          name: 'CyberSmrt Profile API',
          version: '1.0.0',
          endpoints: {
            profile: {
              get: 'GET /profile',
              update: 'PUT /profile',
            },
            settings: {
              get: 'GET /settings',
              update: 'PUT /settings',
            },
            security: {
              logs: 'GET /security-logs',
            },
            account: {
              export: 'GET /export',
              delete: 'DELETE /account',
            },
            health: '/health',
          },
        });
      }

      // 404 Not Found
      return errorResponse(request, env, 'Endpoint not found', 404);

    } catch (error) {
      console.error('Profile API error:', error);

      if (error.stack) {
        console.error(error.stack);
      }

      return errorResponse(request, env, error.message, 500);
    }
  },
};
