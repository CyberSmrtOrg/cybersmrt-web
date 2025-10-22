/**
 * CyberSmrt Unified API Worker
 * Main entry point and router
 *
 * File path: workers/api/src/index.js
 */

import { handleProfileRoutes } from './profile/routes.js';
import { handleDashboardRoutes } from './dashboard/routes.js';
import { handleSettingsRoutes } from './settings/routes.js';
import { jsonResponse, errorResponse } from './utils/response.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function handleOptions() {
  return new Response(null, {
    headers: CORS_HEADERS,
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Profile routes
      if (path.startsWith('/profile')) {
        return await handleProfileRoutes(request, env, ctx);
      }

      // Dashboard routes
      if (path.startsWith('/dashboard')) {
        return await handleDashboardRoutes(request, env, ctx);
      }

      // Settings routes (includes 2FA)
      if (path.startsWith('/settings')) {
        return await handleSettingsRoutes(request, env, ctx);
      }

      // API root - documentation
      if (path === '/api' || path === '/api/') {
        return jsonResponse({
          name: 'CyberSmrt API',
          version: '2.0.0',
          endpoints: {
            profile: {
              get: 'GET /api/profile',
              update: 'PUT /api/profile',
              uploadPhoto: 'POST /api/profile/photo',
              getPhoto: 'GET /api/profile/photo/:userId',
            },
            dashboard: {
              get: 'GET /api/dashboard',
            },
            settings: {
              get: 'GET /api/settings',
              update: 'PUT /api/settings',
              twoFactor: {
                setup: 'POST /api/settings/2fa/setup',
                enable: 'POST /api/settings/2fa/enable',
                disable: 'POST /api/settings/2fa/disable',
                verify: 'POST /api/settings/2fa/verify',
                status: 'GET /api/settings/2fa/status',
              },
            },
            health: '/api/health',
          },
        });
      }

      // Health check
      if (path === '/api/health') {
        return jsonResponse({
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }

      return errorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('API error:', error);

      if (error.stack) {
        console.error(error.stack);
      }

      return errorResponse(error.message, 500);
    }
  },
};