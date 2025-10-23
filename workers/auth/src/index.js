/**
 * CyberSmrt OAuth Authentication Worker
 * Main entry point
 */

import { AuthRouter } from './router.js';
import { AdminRouter } from './admin-router.js';
import { cleanupExpiredSessions } from './utils/session.js';
import { cleanupExpiredTokens, cleanupExpiredVerificationTokens } from './utils/password.js';
import { withRateLimit, identifiers, createRateLimitResponse } from './utils/rate-limit.js';
import { withAdminAuth, isMaintenanceMode, ROLES } from './utils/admin.js';

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
        return await withRateLimit(
          'register',
          identifiers.ip,
          (req, env, ctx) => router.handleRegister(),
          request,
          env,
          _ctx
        );
      }
      if (path === '/login' && request.method === 'POST') {
        return await withRateLimit(
          'login',
          identifiers.ip,
          (req, env, ctx) => router.handleLogin(),
          request,
          env,
          _ctx
        );
      }
      if (path === '/change-password' && request.method === 'POST') {
        return await router.handleChangePassword();
      }
      if (path === '/forgot-password' && request.method === 'POST') {
        return await withRateLimit(
          'password-reset-request',
          identifiers.email,
          (req, env, ctx) => router.handleForgotPassword(),
          request,
          env,
          _ctx
        );
      }
      if (path === '/reset-password' && request.method === 'POST') {
        return await withRateLimit(
          'password-reset-complete',
          identifiers.token,
          (req, env, ctx) => router.handleResetPassword(),
          request,
          env,
          _ctx
        );
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
        return await withRateLimit(
          'email-verification',
          identifiers.user,
          (req, env, ctx) => router.handleResendVerification(),
          request,
          env,
          _ctx
        );
      }

      // Two-Factor Authentication (2FA)
      if (path === '/2fa/setup' && request.method === 'POST') {
        return await withRateLimit(
          '2fa-setup',
          identifiers.user,
          (req, env, ctx) => router.handle2FASetup(),
          request,
          env,
          _ctx
        );
      }
      if (path === '/2fa/enable' && request.method === 'POST') {
        return await router.handle2FAEnable();
      }
      if (path === '/2fa/disable' && request.method === 'POST') {
        return await router.handle2FADisable();
      }
      if (path === '/2fa/verify' && request.method === 'POST') {
        return await withRateLimit(
          '2fa-verify',
          identifiers.ip,
          (req, env, ctx) => router.handle2FAVerify(),
          request,
          env,
          _ctx
        );
      }
      if (path === '/2fa/status' && request.method === 'GET') {
        return await router.handle2FAStatus();
      }
      if (path === '/2fa/regenerate-backup-codes' && request.method === 'POST') {
        return await router.handle2FARegenerateBackupCodes();
      }

      // Admin endpoints (protected by withAdminAuth middleware)
      if (path.startsWith('/admin/')) {
        // Admin: Get all users
        if (path === '/admin/users' && request.method === 'GET') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleGetUsers();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Get single user
        if (path.match(/^\/admin\/users\/[^/]+$/) && request.method === 'GET') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleGetUser();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Update user
        if (path.match(/^\/admin\/users\/[^/]+$/) && request.method === 'PUT') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleUpdateUser();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Delete user
        if (path.match(/^\/admin\/users\/[^/]+$/) && request.method === 'DELETE') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleDeleteUser();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Toggle user status
        if (path.match(/^\/admin\/users\/[^/]+\/toggle-status$/) && request.method === 'POST') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleToggleUserStatus();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Promote user
        if (path.match(/^\/admin\/users\/[^/]+\/promote$/) && request.method === 'POST') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handlePromoteUser();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.SUPER_ADMIN // Only super admins can promote
          );
        }

        // Admin: Demote user
        if (path.match(/^\/admin\/users\/[^/]+\/demote$/) && request.method === 'POST') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleDemoteUser();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.SUPER_ADMIN // Only super admins can demote
          );
        }

        // Admin: Reset user password
        if (path.match(/^\/admin\/users\/[^/]+\/reset-password$/) && request.method === 'POST') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleResetUserPassword();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Get system stats
        if (path === '/admin/stats' && request.method === 'GET') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleGetStats();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Get admin action logs
        if (path === '/admin/logs' && request.method === 'GET') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleGetAdminLogs();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Get system settings
        if (path === '/admin/settings' && request.method === 'GET') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleGetSettings();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin: Update system setting
        if (path === '/admin/settings' && request.method === 'PUT') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleUpdateSetting();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.SUPER_ADMIN // Only super admins can change settings
          );
        }

        // Admin: Terminate session
        if (path.match(/^\/admin\/sessions\/[^/]+\/terminate$/) && request.method === 'POST') {
          return await withAdminAuth(
            async (req, env, ctx) => {
              const adminRouter = new AdminRouter(env, req, ctx.adminUser);
              const result = await adminRouter.handleTerminateSession();
              return jsonResponse(req, env, result);
            },
            request, env, _ctx, ROLES.ADMIN
          );
        }

        // Admin Security Analytics Endpoints
        if (path === '/admin/security/stats' && request.method === 'GET') {
          return await router.handleAdminSecurityStats();
        }
        if (path === '/admin/security/events' && request.method === 'GET') {
          return await router.handleAdminSecurityEvents();
        }
        if (path === '/admin/security/login-analytics' && request.method === 'GET') {
          return await router.handleAdminLoginAnalytics();
        }
        if (path === '/admin/security/locked-accounts' && request.method === 'GET') {
          return await router.handleAdminLockedAccounts();
        }
        if (path === '/admin/security/unlock-account' && request.method === 'POST') {
          return await router.handleAdminUnlockAccount();
        }
        if (path === '/admin/security/device-stats' && request.method === 'GET') {
          return await router.handleAdminDeviceStats();
        }
        if (path === '/admin/security/pending-challenges' && request.method === 'GET') {
          return await router.handleAdminPendingChallenges();
        }
        if (path === '/admin/security/geographic-distribution' && request.method === 'GET') {
          return await router.handleAdminGeographicDistribution();
        }
        if (path === '/admin/security/search' && request.method === 'GET') {
          return await router.handleAdminSearchEvents();
        }
        if (path === '/admin/security/user-threat-history' && request.method === 'GET') {
          return await router.handleAdminUserThreatHistory();
        }
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
            admin: {
              users: 'GET /admin/users',
              getUser: 'GET /admin/users/{id}',
              updateUser: 'PUT /admin/users/{id}',
              deleteUser: 'DELETE /admin/users/{id}',
              toggleUserStatus: 'POST /admin/users/{id}/toggle-status',
              promoteUser: 'POST /admin/users/{id}/promote',
              demoteUser: 'POST /admin/users/{id}/demote',
              resetUserPassword: 'POST /admin/users/{id}/reset-password',
              stats: 'GET /admin/stats',
              logs: 'GET /admin/logs',
              settings: 'GET /admin/settings',
              updateSetting: 'PUT /admin/settings',
              terminateSession: 'POST /admin/sessions/{id}/terminate',
              security: {
                stats: "GET /admin/security/stats",
                events: "GET /admin/security/events",
                loginAnalytics: "GET /admin/security/login-analytics",
                lockedAccounts: "GET /admin/security/locked-accounts",
                unlockAccount: "POST /admin/security/unlock-account",
                deviceStats: "GET /admin/security/device-stats",
                pendingChallenges: "GET /admin/security/pending-challenges",
                geographicDistribution: "GET /admin/security/geographic-distribution",
                search: "GET /admin/security/search",
                userThreatHistory: "GET /admin/security/user-threat-history"
              },
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