/**
 * CyberSmrt OAuth Authentication Worker
 * Main entry point
 */

import { AuthRouter } from './router.js';
import { cleanupExpiredSessions } from './utils/session.js';
import { cleanupExpiredTokens, cleanupExpiredVerificationTokens } from './utils/password.js';

/**
 * Build CORS headers dynamically.
 * If includeCredentials is true, reflect the request Origin (or env.FRONTEND_ORIGIN)
 * and add Access-Control-Allow-Credentials so browsers will accept Set-Cookie responses.
 */
function buildCorsHeaders(request, env, includeCredentials = false) {
  const origin = request.headers.get('Origin') || request.headers.get('origin') || null;
  const allowedOrigin = env.FRONTEND_ORIGIN || null; // set this in production to your front-end URL

  const headers = {};
  if (includeCredentials) {
    // When credentials are set, Access-Control-Allow-Origin must be a specific origin, not '*'
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    else if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    else headers['Access-Control-Allow-Origin'] = '*'; // fallback (same-origin contexts only)
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigin || '*';
  }

  headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
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
function errorResponse(request, env, message, status = 400, includeCredentials = false) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request, env, includeCredentials),
    },
  });
}

/**
 * Success response helper
 */
function jsonResponse(request, env, data, status = 200, includeCredentials = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request, env, includeCredentials),
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
      const router = new AuthRouter(env, request);

      // OAuth initiation endpoints
      if (path === '/google') {
        return await router.handleOAuthInit('google');
      }
      if (path === '/github') {
        return await router.handleOAuthInit('github');
      }
      if (path === '/microsoft') {
        return await router.handleOAuthInit('microsoft');
      }
      if (path === '/apple') {
        return await router.handleOAuthInit('apple');
      }

      // OAuth callback endpoints
      if (path === '/callback/google') {
        return await router.handleOAuthCallback('google');
      }
      if (path === '/callback/github') {
        return await router.handleOAuthCallback('github');
      }
      if (path === '/callback/microsoft') {
        return await router.handleOAuthCallback('microsoft');
      }
      if (path === '/callback/apple') {
        return await router.handleOAuthCallback('apple');
      }

      // Email/Password authentication
      if (path === '/register' && request.method === 'POST') {
        return await router.handleRegister();
      }
      if (path === '/login' && request.method === 'POST') {
        return await router.handleLogin();
      }
      if (path === '/change-password' && request.method === 'POST') {
        return await router.handleChangePassword();
      }
      if (path === '/forgot-password' && request.method === 'POST') {
        return await router.handleForgotPassword();
      }
      if (path === '/reset-password' && request.method === 'POST') {
        return await router.handleResetPassword();
      }

      // Token management
      if (path === '/refresh' && request.method === 'POST') {
        return await router.handleRefresh();
      }

      // Logout
      if (path === '/logout' && request.method === 'POST') {
        return await router.handleLogout();
      }

      // Get current user
      if (path === '/me' && request.method === 'GET') {
        return await router.handleMe();
      }

      // Get user sessions
      if (path === '/sessions' && request.method === 'GET') {
        return await router.handleSessions();
      }

      // Email verification
      if (path === '/verify-email' && request.method === 'POST') {
        return await router.handleVerifyEmail();
      }
      if (path === '/resend-verification' && request.method === 'POST') {
        return await router.handleResendVerification();
      }

      // Two-Factor Authentication (2FA)
      if (path === '/2fa/setup' && request.method === 'POST') {
        return await router.handle2FASetup();
      }
      if (path === '/2fa/enable' && request.method === 'POST') {
        return await router.handle2FAEnable();
      }
      if (path === '/2fa/disable' && request.method === 'POST') {
        return await router.handle2FADisable();
      }
      if (path === '/2fa/verify' && request.method === 'POST') {
        return await router.handle2FAVerify();
      }
      if (path === '/2fa/status' && request.method === 'GET') {
        return await router.handle2FAStatus();
      }
      if (path === '/2fa/regenerate-backup-codes' && request.method === 'POST') {
        return await router.handle2FARegenerateBackupCodes();
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
          name: 'CyberSmrt OAuth Authentication API',
          version: '2.0.0',
          endpoints: {
            oauth: {
              google: '/google',
              github: '/github',
              microsoft: '/microsoft',
              apple: '/apple',
            },
            callbacks: {
              google: '/callback/google',
              github: '/callback/github',
              microsoft: '/callback/microsoft',
              apple: '/callback/apple',
            },
            password: {
              register: 'POST /register',
              login: 'POST /login',
              changePassword: 'POST /change-password',
              forgotPassword: 'POST /forgot-password',
              resetPassword: 'POST /reset-password',
            },
            tokens: {
              refresh: 'POST /refresh',
            },
            user: {
              me: 'GET /me',
              sessions: 'GET /sessions',
              logout: 'POST /logout',
            },
            verification: {
              verifyEmail: 'POST /verify-email',
              resendVerification: 'POST /resend-verification',
            },
            twoFactor: {
              setup: 'POST /2fa/setup',
              enable: 'POST /2fa/enable',
              disable: 'POST /2fa/disable',
              verify: 'POST /2fa/verify',
              status: 'GET /2fa/status',
              regenerateBackupCodes: 'POST /2fa/regenerate-backup-codes',
            },
            health: '/health',
          },
        });
      }

      // 404 Not Found
      return errorResponse(request, env, 'Endpoint not found', 404);

    } catch (error) {
      console.error('Auth error:', error);

      // Log error for debugging
      if (error.stack) {
        console.error(error.stack);
      }

      return errorResponse(request, env, error.message, 500);
    }
  },

  /**
   * Scheduled handler for cleanup tasks
   */
  async scheduled(event, env, _ctx) {
    // Clean up expired sessions daily
    const deletedSessions = await cleanupExpiredSessions(env);
    console.log(`Cleaned up ${deletedSessions} expired sessions`);

    // Clean up expired password reset tokens
    const deletedTokens = await cleanupExpiredTokens(env);
    console.log(`Cleaned up ${deletedTokens} expired password reset tokens`);

    // Clean up expired verification tokens
    const deletedVerificationTokens = await cleanupExpiredVerificationTokens(env);
    console.log(`Cleaned up ${deletedVerificationTokens} expired verification tokens`);
  },
};