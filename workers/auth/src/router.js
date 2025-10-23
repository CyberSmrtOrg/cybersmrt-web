/**
 * Authentication Router
 * Handles all auth-related endpoints
 */

import { getGoogleAuthUrl, handleGoogleCallback } from './providers/google.js';
import { getGitHubAuthUrl, handleGitHubCallback } from './providers/github.js';
import { getMicrosoftAuthUrl, handleMicrosoftCallback } from './providers/microsoft.js';
import { getAppleAuthUrl, handleAppleCallback } from './providers/apple.js';
import {
  registerWithPassword,
  loginWithPassword,
  changePassword,
  requestPasswordReset,
  resetPassword
} from './providers/password.js';
import { generateAccessToken, generateRefreshToken, refreshAccessToken, authenticateRequest } from './utils/jwt.js';
import { createSession, getSession, deleteSession, getUserSessions } from './utils/session.js';
import { checkOAuthRateLimit } from './utils/rateLimit.js';
import { logLogin, logLogout, logOAuthLink } from './utils/security.js';

/**
 * Generate secure random state for OAuth
 */
function generateState() {
  return crypto.randomUUID();
}

/**
 * Store OAuth state in KV (prevent CSRF)
 */
async function storeState(state, env) {
  await env.RATE_LIMIT_KV.put(`oauth_state:${state}`, 'valid', {
    expirationTtl: 600,  // 10 minutes
  });
}

/**
 * Verify OAuth state
 */
async function verifyState(state, env) {
  const value = await env.RATE_LIMIT_KV.get(`oauth_state:${state}`);
  if (!value) {
    throw new Error('Invalid or expired state parameter');
  }
  // Delete state after use (one-time use)
  await env.RATE_LIMIT_KV.delete(`oauth_state:${state}`);
}

/**
 * Find or create user from OAuth profile
 */
async function findOrCreateUser(profile, env) {
  // Check if user exists by email
  let user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(profile.email)
    .first();

  const now = Math.floor(Date.now() / 1000);

  if (!user) {
    // Create new user
    const userId = crypto.randomUUID();

    await env.DB
      .prepare(`
        INSERT INTO users (id, email, display_name, avatar_url, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        profile.email,
        profile.displayName || profile.email,
        profile.avatarUrl || null,
        profile.emailVerified ? 1 : 0,
        now,
        now
      )
      .run();

    user = await env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();
  }

  // Store or update OAuth provider connection
  const existingProvider = await env.DB
    .prepare('SELECT * FROM oauth_providers WHERE user_id = ? AND provider = ?')
    .bind(user.id, profile.provider)
    .first();

  if (!existingProvider) {
    await env.DB
      .prepare(`
        INSERT INTO oauth_providers (id, user_id, provider, provider_user_id, profile_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        user.id,
        profile.provider,
        profile.providerUserId,
        JSON.stringify(profile),
        now,
        now
      )
      .run();
  } else {
    // Update existing provider data
    await env.DB
      .prepare(`
        UPDATE oauth_providers
        SET provider_user_id = ?, profile_data = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(
        profile.providerUserId,
        JSON.stringify(profile),
        now,
        existingProvider.id
      )
      .run();
  }

  return user;
}

/**
 * Route handler class
 */
export class AuthRouter {
  constructor(env, request) {
    this.env = env;
    this.request = request;
    this.url = new URL(request.url);
  }

  /**
   * Handle OAuth initiation
   */
  async handleOAuthInit(provider) {
    await checkOAuthRateLimit(this.request, this.env);

    // Generate and store state
    const state = generateState();
    await storeState(state, this.env);

    // Get authorization URL
    let authUrl;
    switch (provider) {
      case 'google':
        authUrl = getGoogleAuthUrl(this.env, state);
        break;
      case 'github':
        authUrl = getGitHubAuthUrl(this.env, state);
        break;
      case 'microsoft':
        authUrl = getMicrosoftAuthUrl(this.env, state);
        break;
      case 'apple':
        authUrl = getAppleAuthUrl(this.env, state);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return Response.redirect(authUrl, 302);
  }

  /**
     * Handle OAuth callback
     */
    async handleOAuthCallback(provider) {
      await checkOAuthRateLimit(this.request, this.env);

      // Get code and state from query params
      const code = this.url.searchParams.get('code');
      const state = this.url.searchParams.get('state');

      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      // Verify state (CSRF protection)
      await verifyState(state, this.env);

      // Exchange code for tokens and get user profile
      let result;
      switch (provider) {
        case 'google':
          result = await handleGoogleCallback(code, this.env);
          break;
        case 'github':
          result = await handleGitHubCallback(code, this.env);
          break;
        case 'microsoft':
          result = await handleMicrosoftCallback(code, this.env);
          break;
        case 'apple': {
          // For Apple, check if there's user data in POST body
          const userData = this.request.method === 'POST'
            ? await this.request.formData().then(fd => fd.get('user'))
            : null;
          result = await handleAppleCallback(code, this.env, userData);
          break;
        }
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Find or create user
      const user = await findOrCreateUser(result.profile, this.env);

      // Create session
      const session = await createSession(user.id, this.request, this.env);

      // Generate JWT tokens
      const accessToken = await generateAccessToken(user.id, user.email, this.env);
      const refreshToken = await generateRefreshToken(user.id, this.env);

      // Log successful login
      await logLogin(user.id, this.request, this.env, provider);
      await logOAuthLink(user.id, provider, this.request, this.env);

      // Prepare user data for frontend
      const userData = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          role: user.role,
        },
        session: {
          id: session.sessionId,
          expiresAt: session.expiresAt,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      };

      // Encode data for URL (base64 to avoid URL length issues)
      const dataString = JSON.stringify(userData);
      const encodedData = btoa(dataString);

      // Redirect to frontend callback page with data in hash
      const callbackUrl = new URL('https://cybersmrt.org/callback.html');
      callbackUrl.hash = encodedData;

      // Set session cookie
      const cookieHeader = `session=${session.sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${this.env.SESSION_EXPIRY}; Path=/`;

      return Response.redirect(callbackUrl.toString(), 302, {
        headers: {
          'Set-Cookie': cookieHeader,
        },
      });
    }

  /**
   * Handle user registration with email/password
   */
  async handleRegister() {
    await checkOAuthRateLimit(this.request, this.env);

    const body = await this.request.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Register user
    const user = await registerWithPassword(email, password, displayName, this.request, this.env);

    // Create session
    const session = await createSession(user.userId, this.request, this.env);

    // Generate tokens
    const accessToken = await generateAccessToken(user.userId, user.email, this.env);
    const refreshToken = await generateRefreshToken(user.userId, this.env);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        displayName: user.displayName,
        role: 'user',
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${session.sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${this.env.SESSION_EXPIRY}; Path=/`,
      },
    });
  }

  /**
   * Handle user login with email/password
   */
  async handleLogin() {
    await checkOAuthRateLimit(this.request, this.env);

    const body = await this.request.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Login user
    const user = await loginWithPassword(email, password, this.request, this.env);

    // Create session
    const session = await createSession(user.id, this.request, this.env);

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, user.email, this.env);
    const refreshToken = await generateRefreshToken(user.id, this.env);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${session.sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${this.env.SESSION_EXPIRY}; Path=/`,
      },
    });
  }

  /**
   * Handle password change
   */
  async handleChangePassword() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    await changePassword(userId, currentPassword, newPassword, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password changed successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle forgot password request
   */
  async handleForgotPassword() {
    await checkOAuthRateLimit(this.request, this.env);

    const body = await this.request.json();
    const { email } = body;

    if (!email) {
      throw new Error('Email is required');
    }

    await requestPasswordReset(email, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle password reset
   */
  async handleResetPassword() {
    await checkOAuthRateLimit(this.request, this.env);

    const body = await this.request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    await resetPassword(token, newPassword, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle token refresh
   */
  async handleRefresh() {
    const body = await this.request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new Error('Refresh token required');
    }

    const accessToken = await refreshAccessToken(refreshToken, this.env);

    return new Response(JSON.stringify({
      success: true,
      accessToken,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Get session ID from cookie
    const cookies = this.request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;

    if (sessionId) {
      await deleteSession(sessionId, this.env);
    }

    await logLogout(userId, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
      },
    });
  }

  /**
   * Get current user info
   */
  async handleMe() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const user = await this.env.DB
      .prepare('SELECT id, email, display_name, avatar_url, role, email_verified, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get connected OAuth providers
    const providers = await this.env.DB
      .prepare('SELECT provider, created_at FROM oauth_providers WHERE user_id = ?')
      .bind(userId)
      .all();

    return new Response(JSON.stringify({
      success: true,
      user: {
        ...user,
        connectedProviders: providers.results || [],
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get user sessions
   */
  async handleSessions() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const sessions = await getUserSessions(userId, this.env);

    return new Response(JSON.stringify({
      success: true,
      sessions,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}