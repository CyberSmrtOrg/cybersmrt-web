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
 * Add CORS headers to response
 */
function addCorsHeaders(response, request, env) {
  const corsHeaders = buildCorsHeaders(request, env, true);
  const newHeaders = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
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
        const response = await router.handleGetProfile();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/profile' && request.method === 'PUT') {
        const response = await router.handleUpdateProfile();
        return addCorsHeaders(response, request, env);
      }

      // Settings endpoints
      if (path === '/settings' && request.method === 'GET') {
        const response = await router.handleGetSettings();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/settings' && request.method === 'PUT') {
        const response = await router.handleUpdateSettings();
        return addCorsHeaders(response, request, env);
      }

      // Security logs
      if (path === '/security-logs' && request.method === 'GET') {
        const response = await router.handleGetSecurityLogs();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/security-logs/export' && request.method === 'GET') {
        const response = await router.handleExportSecurityLogs();
        return addCorsHeaders(response, request, env);
      }

      // Account management
      if (path === '/export' && request.method === 'GET') {
        const response = await router.handleExportData();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/account' && request.method === 'DELETE') {
        const response = await router.handleDeleteAccount();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/account/schedule-deletion' && request.method === 'POST') {
        const response = await router.handleScheduleAccountDeletion();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/account/cancel-deletion' && request.method === 'POST') {
        const response = await router.handleCancelAccountDeletion();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/account/deletion-status' && request.method === 'GET') {
        const response = await router.handleGetDeletionStatus();
        return addCorsHeaders(response, request, env);
      }

      // Avatar upload
      if (path === '/avatar/upload' && request.method === 'POST') {
        const response = await router.handleUploadAvatar();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/avatar' && request.method === 'DELETE') {
        const response = await router.handleDeleteAvatar();
        return addCorsHeaders(response, request, env);
      }

      // Serve uploaded files
      if (path.startsWith('/uploads/')) {
        const key = path.substring(9); // Remove '/uploads/' prefix
        const response = await router.handleServeFile(key);
        return addCorsHeaders(response, request, env);
      }

      // Device management
      if (path === '/devices' && request.method === 'GET') {
        const response = await router.handleGetDevices();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/devices/trust' && request.method === 'POST') {
        const response = await router.handleTrustDevice();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/devices/untrust' && request.method === 'POST') {
        const response = await router.handleUntrustDevice();
        return addCorsHeaders(response, request, env);
      }
      if (path.match(/^\/devices\/[^/]+$/) && request.method === 'DELETE') {
        const response = await router.handleRemoveDevice();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/devices/verify' && request.method === 'POST') {
        const response = await router.handleVerifyDeviceChallenge();
        return addCorsHeaders(response, request, env);
      }
      if (path === '/devices/deny' && request.method === 'POST') {
        const response = await router.handleDenyDeviceChallenge();
        return addCorsHeaders(response, request, env);
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
            avatar: {
              upload: 'POST /avatar/upload',
              delete: 'DELETE /avatar',
            },
            uploads: {
              serve: 'GET /uploads/{key}',
            },
            security: {
              logs: 'GET /security-logs',
            },
            account: {
              export: 'GET /export',
              delete: 'DELETE /account',
            },
            devices: {
              list: 'GET /devices',
              trust: 'POST /devices/trust',
              untrust: 'POST /devices/untrust',
              remove: 'DELETE /devices/{id}',
              verify: 'POST /devices/verify',
              deny: 'POST /devices/deny',
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
