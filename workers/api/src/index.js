/**
 * CyberSmrt Unified API Worker
 * Main entry point and router
 */

import { handleProfileRoutes } from './profile/routes.js';
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

      if (path.startsWith('/api/profile')) {
        return await handleProfileRoutes(request, env, ctx);
      }

      if (path === '/api' || path === '/api/') {
        return jsonResponse({
          name: 'CyberSmrt API',
          version: '1.0.0',
          endpoints: {
            profile: {
              get: 'GET /api/profile',
              update: 'PUT /api/profile',
              uploadPhoto: 'POST /api/profile/photo',
            },
            health: '/api/health',
          },
        });
      }

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
