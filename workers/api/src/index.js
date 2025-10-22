/**
 * CyberSmrt Unified API Worker
 * Main entry point and router
 *
 * File path: workers/api/src/index.js
 * Subdomain: api.cybersmrt.org
 */

import { handleProfileRoutes } from './profile/routes.js';
import { handleDashboardRoutes } from './dashboard/routes.js';
import { handleSettingsRoutes } from './settings/routes.js';
import { jsonResponse, errorResponse } from './utils/response.js';

const ALLOWED_ORIGINS = [
  'https://cybersmrt.org',
  'https://www.cybersmrt.org',
  'http://localhost:8788',
  'http://localhost:3000',
];

/**
 * Get CORS headers for the request origin
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight
 */
function handleOptions(request) {
  return new Response(null, {
    headers: getCorsHeaders(request),
  });
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Profile routes (NO /api prefix - we're already on api.cybersmrt.org)
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
      if (path === '/' || path === '') {
        return jsonResponse({
          name: 'CyberSmrt API',
          version: '2.0.0',
          subdomain: 'api.cybersmrt.org',
          endpoints: {
            profile: {
              get: 'GET /profile',
              update: 'PUT /profile',
              uploadPhoto: 'POST /profile/photo',
              getPhoto: 'GET /profile/photo/:userId',
            },
            dashboard: {
              get: 'GET /dashboard',
            },
            settings: {
              get: 'GET /settings',
              update: 'PUT /settings',
              twoFactor: {
                setup: 'POST /settings/2fa/setup',
                enable: 'POST /settings/2fa/enable',
                disable: 'POST /settings/2fa/disable',
                verify: 'POST /settings/2fa/verify',
                status: 'GET /settings/2fa/status',
              },
            },
            health: '/health',
          },
        });
      }

      // Health check
      if (path === '/health') {
        return jsonResponse({
          status: 'healthy',
          subdomain: 'api.cybersmrt.org',
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