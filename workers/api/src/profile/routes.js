/**
 * Profile API Routes
 * Handles /profile/* endpoints
 *
 * File path: workers/api/src/profile/routes.js
 */

import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getProfilePhoto,
} from './handlers.js';

export async function handleProfileRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Public endpoint - no auth required
    if (path.startsWith('/profile/photo/') && method === 'GET') {
      const userId = path.split('/').pop();
      return await getProfilePhoto(userId, env);
    }

    // All other endpoints require authentication
    const user = await authenticate(request, env);

    // Rate limiting - skip if KV not configured
    let rateInfo = { remaining: 100, resetAt: Date.now() + 60000 };
    try {
      if (env.RATE_LIMIT_KV) {
        rateInfo = await rateLimit(request, env, user.userId);
      }
    } catch (e) {
      console.warn('Rate limiting skipped:', e.message);
    }

    if (path === '/profile' && method === 'GET') {
      const profile = await getProfile(user.userId, env);
      return jsonResponse(
        { profile },
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    if (path === '/profile' && method === 'PUT') {
      const body = await request.json();
      const profile = await updateProfile(user.userId, body, env);
      return jsonResponse(
        { profile },
        200,
        {
          'X-RateLimit-Remaining': rateInfo.remaining,
          'X-RateLimit-Reset': new Date(rateInfo.resetAt).toISOString(),
        },
        request
      );
    }

    if (path === '/profile/photo' && method === 'POST') {
      const contentType = request.headers.get('Content-Type');

      if (!contentType || !contentType.startsWith('multipart/form-data')) {
        return errorResponse('Content-Type must be multipart/form-data', 400, {}, request);
      }

      const formData = await request.formData();
      const photo = formData.get('photo');

      if (!photo) {
        return errorResponse('No photo provided', 400, {}, request);
      }

      const result = await uploadProfilePhoto(user.userId, photo, env);
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

    return errorResponse('Profile endpoint not found', 404, {}, request);

  } catch (error) {
    console.error('Profile route error:', error);

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