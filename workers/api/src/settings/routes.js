/**
 * Settings API Routes
 * Handles /settings/* endpoints including 2FA
 *
 * File path: workers/api/src/settings/routes.js
 */

import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import {
  getSettings,
  updateSettings,
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FA,
  get2FAStatus,
} from './handlers.js';

export async function handleSettingsRoutes(request, env, _ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // All settings endpoints require authentication
    const user = await authenticate(request, env);

    // Rate limiting - skip if KV not configured
    let rateInfo = { remaining: 100, resetAt: Date.now() + 60000 };
    try {
      if (env.RATE_LIMIT_KV) {
        rateInfo = await rateLimit(request, env, user.userId);
        // Ensure resetAt is valid and in milliseconds
        if (rateInfo.resetAt && typeof rateInfo.resetAt === 'number') {
          // Convert seconds to milliseconds if needed (timestamps < year 2286)
          if (rateInfo.resetAt < 10000000000) {
            rateInfo.resetAt = rateInfo.resetAt * 1000;
          }
        } else {
          // Fallback to current time + 1 minute if invalid
          rateInfo.resetAt = Date.now() + 60000;
        }
      }
    } catch (e) {
      console.warn('Rate limiting skipped:', e.message);
      // Reset to default on error
      rateInfo = { remaining: 100, resetAt: Date.now() + 60000 };
    }

    // Get settings
    if (path === '/settings' && method === 'GET') {
      const settings = await getSettings(user.userId, env);
      return jsonResponse(
        { settings },
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    // Update settings
    if (path === '/settings' && method === 'PUT') {
      const body = await request.json();
      const settings = await updateSettings(user.userId, body, env);
      return jsonResponse(
        { settings },
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    // 2FA: Setup (generate QR code)
    if (path === '/settings/2fa/setup' && method === 'POST') {
      const setup = await setup2FA(user.userId, user.email, env);
      return jsonResponse(
        setup,
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    // 2FA: Enable (verify and activate)
    if (path === '/settings/2fa/enable' && method === 'POST') {
      const body = await request.json();
      const result = await enable2FA(user.userId, body.token, env);
      return jsonResponse(
        result,
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    // 2FA: Disable
    if (path === '/settings/2fa/disable' && method === 'POST') {
      const body = await request.json();
      const result = await disable2FA(user.userId, body.token, env);
      return jsonResponse(
        result,
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    // 2FA: Verify token
    if (path === '/settings/2fa/verify' && method === 'POST') {
      const body = await request.json();
      const result = await verify2FA(user.userId, body.token, env);
      return jsonResponse(
        result,
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    // 2FA: Get status
    if (path === '/settings/2fa/status' && method === 'GET') {
      const status = await get2FAStatus(user.userId, env);
      return jsonResponse(
        status,
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    return errorResponse('Settings endpoint not found', 404, {}, request);

  } catch (error) {
    console.error('Settings route error:', error);

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return errorResponse(error.message, 401, {}, request);
    }

    if (error.message.includes('Rate limit')) {
      return errorResponse(error.message, 429, {}, request);
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return errorResponse(error.message, 400, {}, request);
    }

    return errorResponse(error.message, 500, {}, request);
  }
}