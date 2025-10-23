/**
 * Dashboard API Routes
 * Handles /dashboard/* endpoints
 *
 * File path: workers/api/src/dashboard/routes.js
 */

import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { getDashboardData } from './handlers.js';

export async function handleDashboardRoutes(request, env, _ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // All dashboard endpoints require authentication
    const user = await authenticate(request, env);

    // Rate limiting - skip if KV not configured
    let rateInfo = {
      remaining: 100,
      resetAt: Date.now() + 60000
    };

    try {
      if (env.RATE_LIMIT_KV) {
        rateInfo = await rateLimit(request, env, user.userId);
      }
    } catch (e) {
      console.warn('Rate limiting skipped:', e.message);
    }

    if (path === '/dashboard' && method === 'GET') {
      const dashboard = await getDashboardData(user.userId, env);

      // Safely format resetAt - ensure it's a valid timestamp
      let resetAtISO;
      try {
        const resetTimestamp = typeof rateInfo.resetAt === 'number' ? rateInfo.resetAt : Date.now();
        resetAtISO = new Date(resetTimestamp).toISOString();
      } catch (e) {
        console.error('Error formatting resetAt:', e);
        resetAtISO = new Date().toISOString();
      }

      return jsonResponse(
        { dashboard },
        200,
        {
          'X-RateLimit-Remaining': String(rateInfo.remaining || 100),
          'X-RateLimit-Reset': resetAtISO,
        },
        request
      );
    }

    return errorResponse('Dashboard endpoint not found', 404, {}, request);

  } catch (error) {
    console.error('Dashboard route error:', error);

    // Log full error details
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return errorResponse(error.message, 401, {}, request);
    }

    if (error.message.includes('Rate limit')) {
      return errorResponse(error.message, 429, {}, request);
    }

    return errorResponse(error.message, 500, {}, request);
  }
}