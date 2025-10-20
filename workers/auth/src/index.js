/**
 * CyberSmrt OAuth Authentication Worker
 * Main entry point
 */

import { AuthRouter } from './router.js';
import { cleanupExpiredSessions } from './utils/session.js';
import { cleanupExpiredTokens } from './utils/password.js';

/**
 * CORS headers for development
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',  // TODO: Restrict to your domain in production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight
 */
function handleOptions() {
  return new Response(null, {
    headers: CORS_HEADERS,
  });
}

/**
 * Error response helper
 */
function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Success response helper
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const router = new AuthRouter(env, request);

      // OAuth initiation endpoints
      if (path === '/auth/google') {
        return await router.handleOAuthInit('google');
      }
      if (path === '/auth/github') {
        return await router.handleOAuthInit('github');
      }
      if (path === '/auth/microsoft') {
        return await router.handleOAuthInit('microsoft');
      }
      if (path === '/auth/apple') {
        return await router.handleOAuthInit('apple');
      }

      // OAuth callback endpoints
      if (path === '/auth/callback/google') {
        return await router.handleOAuthCallback('google');
      }
      if (path === '/auth/callback/github') {
        return await router.handleOAuthCallback('github');
      }
      if (path === '/auth/callback/microsoft') {
        return await router.handleOAuthCallback('microsoft');
      }
      if (path === '/auth/callback/apple') {
        return await router.handleOAuthCallback('apple');
      }

      // Email/Password authentication
      if (path === '/auth/register' && request.method === 'POST') {
        return await router.handleRegister();
      }
      if (path === '/auth/login' && request.method === 'POST') {
        return await router.handleLogin();
      }
      if (path === '/auth/change-password' && request.method === 'POST') {
        return await router.handleChangePassword();
      }
      if (path === '/auth/forgot-password' && request.method === 'POST') {
        return await router.handleForgotPassword();
      }
      if (path === '/auth/reset-password' && request.method === 'POST') {
        return await router.handleResetPassword();
      }

      // Token management
      if (path === '/auth/refresh' && request.method === 'POST') {
        return await router.handleRefresh();
      }

      // Logout
      if (path === '/auth/logout' && request.method === 'POST') {
        return await router.handleLogout();
      }

      // Get current user
      if (path === '/auth/me' && request.method === 'GET') {
        return await router.handleMe();
      }

      // Get user sessions
      if (path === '/auth/sessions' && request.method === 'GET') {
        return await router.handleSessions();
      }

      // Health check
      if (path === '/auth/health') {
        return jsonResponse({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }

      // API documentation
      if (path === '/auth' || path === '/auth/') {
        return jsonResponse({
          name: 'CyberSmrt OAuth Authentication API',
          version: '2.0.0',
          endpoints: {
            oauth: {
              google: '/auth/google',
              github: '/auth/github',
              microsoft: '/auth/microsoft',
              apple: '/auth/apple',
            },
            callbacks: {
              google: '/auth/callback/google',
              github: '/auth/callback/github',
              microsoft: '/auth/callback/microsoft',
              apple: '/auth/callback/apple',
            },
            password: {
              register: 'POST /auth/register',
              login: 'POST /auth/login',
              changePassword: 'POST /auth/change-password',
              forgotPassword: 'POST /auth/forgot-password',
              resetPassword: 'POST /auth/reset-password',
            },
            tokens: {
              refresh: 'POST /auth/refresh',
            },
            user: {
              me: 'GET /auth/me',
              sessions: 'GET /auth/sessions',
              logout: 'POST /auth/logout',
            },
            health: '/auth/health',
          },
        });
      }

      // 404 Not Found
      return errorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('Auth error:', error);

      // Log error for debugging
      if (error.stack) {
        console.error(error.stack);
      }

      return errorResponse(error.message, 500);
    }
  },

  /**
   * Scheduled handler for cleanup tasks
   */
  async scheduled(event, env, ctx) {
    // Clean up expired sessions daily
    const deletedSessions = await cleanupExpiredSessions(env);
    console.log(`Cleaned up ${deletedSessions} expired sessions`);

    // Clean up expired password reset tokens
    const deletedTokens = await cleanupExpiredTokens(env);
    console.log(`Cleaned up ${deletedTokens} expired password reset tokens`);
  },
};