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

export async function handleDashboardRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // All dashboard endpoints require authentication
    const user = await authenticate(request, env);
    const rateInfo = await rateLimit(request, env, user.userId);

    if (path === '/dashboard' && method === 'GET') {
      const dashboard = await getDashboardData(user.userId, env);
      return jsonResponse(
        { dashboard },
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    return errorResponse('Dashboard endpoint not found', 404, {}, request);

  } catch (error) {
    console.error('Dashboard route error:', error);

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return errorResponse(error.message, 401, {}, request);
    }

    if (error.message.includes('Rate limit')) {
      return errorResponse(error.message, 429, {}, request);
    }

    return errorResponse(error.message, 500, {}, request);
  }
}