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
  resetPassword,
  verifyEmail,
  resendVerificationEmail
} from './providers/password.js';
import {
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FA,
  get2FAStatus,
  regenerateBackupCodes,
  confirm2FASetup
} from './providers/2fa.js';
import { generateAccessToken, generateRefreshToken, refreshAccessToken, authenticateRequest } from './utils/jwt.js';
import { createSession, deleteSession, getUserSessions, deleteUserSessions } from './utils/session.js';
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
 * @param {string} state - The state token
 * @param {object} stateData - Optional state data (e.g., returnUrl)
 * @param {object} env - Worker environment
 */
async function storeState(state, env, stateData = null) {
  const value = stateData ? JSON.stringify(stateData) : 'valid';
  await env.RATE_LIMIT_KV.put(`oauth_state:${state}`, value, {
    expirationTtl: 600,  // 10 minutes
  });
}

/**
 * Verify OAuth state and return any stored state data
 * @returns {object|null} - Stored state data or null
 */
async function verifyState(state, env) {
  const value = await env.RATE_LIMIT_KV.get(`oauth_state:${state}`);
  if (!value) {
    throw new Error('Invalid or expired state parameter');
  }
  // Delete state after use (one-time use)
  await env.RATE_LIMIT_KV.delete(`oauth_state:${state}`);

  // Try to parse as JSON, otherwise return null
  try {
    return value === 'valid' ? null : JSON.parse(value);
  } catch {
    return null;
  }
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

    // Check if incoming state parameter contains returnUrl (from admin dashboard, etc.)
    const incomingState = this.url.searchParams.get('state');
    let stateData = null;

    if (incomingState) {
      try {
        // Try to parse the incoming state to extract returnUrl
        const decoded = JSON.parse(atob(incomingState));
        if (decoded.returnUrl) {
          stateData = { returnUrl: decoded.returnUrl };
        }
      } catch {
        // If parsing fails, ignore and use default behavior
      }
    }

    // Generate and store state with optional returnUrl data
    const state = generateState();
    await storeState(state, this.env, stateData);

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

      // Verify state (CSRF protection) and get stored state data
      const stateData = await verifyState(state, this.env);

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

      // Check if 2FA is enabled
      if (user.totp_enabled === 1) {
        // Store pending auth data in KV for 2FA verification
        const pendingAuthId = crypto.randomUUID();
        const pendingAuthData = {
          userId: user.id,
          provider,
          timestamp: Date.now(),
        };

        await this.env.RATE_LIMIT_KV.put(
          `pending_2fa:${pendingAuthId}`,
          JSON.stringify(pendingAuthData),
          { expirationTtl: 600 } // 10 minutes
        );

        // Log OAuth link but not full login yet (waiting for 2FA)
        await logOAuthLink(user.id, provider, this.request, this.env);

        // Redirect to 2FA verification page
        const frontend = this.env.FRONTEND_ORIGIN || 'https://cybersmrt.org';
        const returnUrl = stateData?.returnUrl || frontend;
        const callbackPath = returnUrl.includes('/callback') ? '' : '/callback';
        const twoFAUrl = new URL(returnUrl + callbackPath);

        // Pass pending auth ID and user info in hash
        const pendingData = {
          requires2FA: true,
          pendingAuthId,
          userId: user.id,
          email: user.email,
          displayName: user.display_name,
          provider,
        };

        twoFAUrl.hash = btoa(JSON.stringify(pendingData));

        return Response.redirect(twoFAUrl.toString(), 302);
      }

      // No 2FA required - proceed with normal login
      // Create session
      const session = await createSession(user.id, this.request, this.env);

      // Generate JWT tokens (include role for admin access)
      const accessToken = await generateAccessToken(user.id, user.email, this.env, user.role || 'user');
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
      // Use returnUrl from state if provided, otherwise default to FRONTEND_ORIGIN
      const frontend = this.env.FRONTEND_ORIGIN || 'https://cybersmrt.org';
      const returnUrl = stateData?.returnUrl || frontend;

      // Admin dashboard already has path, don't append /callback
      const callbackUrl = returnUrl.endsWith('/') ? new URL(returnUrl) : new URL(returnUrl);
      callbackUrl.hash = encodedData;

      // Set cookies for cross-subdomain auth (HttpOnly, Secure, cross-subdomain)
      const cookieMaxAge = this.env.SESSION_EXPIRY || 86400; // Default 24 hours
      const sessionCookie = `session=${session.sessionId}; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;
      const accessTokenCookie = `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;
      const refreshTokenCookie = `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;

      console.log('🍪 Setting cookies for redirect to:', callbackUrl.toString());
      console.log('🍪 Session cookie:', sessionCookie.substring(0, 50) + '...');
      console.log('🍪 Access token cookie:', accessTokenCookie.substring(0, 50) + '...');

      // Create redirect response with multiple Set-Cookie headers
      const headers = new Headers();
      headers.append('Location', callbackUrl.toString());
      headers.append('Set-Cookie', sessionCookie);
      headers.append('Set-Cookie', accessTokenCookie);
      headers.append('Set-Cookie', refreshTokenCookie);

      console.log('🍪 Response headers Set-Cookie count:', headers.getSetCookie().length);

      return new Response(null, {
        status: 302,
        headers: headers
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

    // Generate tokens (new users default to 'user' role)
    const accessToken = await generateAccessToken(user.userId, user.email, this.env, 'user');
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

    // Check if 2FA is enabled
    if (user.totp_enabled === 1) {
      // Return response indicating 2FA is required
      // Do NOT create session yet - wait for 2FA verification
      return new Response(JSON.stringify({
        success: true,
        requires2FA: true,
        userId: user.id, // Needed for 2FA verification
        message: 'Two-factor authentication required',
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // No 2FA required, proceed with normal login
    // Create session
    const session = await createSession(user.id, this.request, this.env);

    // Generate tokens (include role for admin access)
    const accessToken = await generateAccessToken(user.id, user.email, this.env, user.role || 'user');
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
    // Get session ID from cookie
    const cookies = this.request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;

    // Try to authenticate to get userId for logging, but don't fail if not authenticated
    let userId = null;
    try {
      const auth = await authenticateRequest(this.request, this.env);
      userId = auth.userId;
    } catch {
      // Not authenticated, that's okay - still proceed with logout
    }

    // Delete session if exists
    if (sessionId) {
      await deleteSession(sessionId, this.env);
    }

    // Log logout if we have a userId
    if (userId) {
      await logLogout(userId, this.request, this.env);
    }

    // Clear ALL auth cookies (cross-subdomain)
    const cookiesToClear = ['session', 'accessToken', 'refreshToken', 'user_info', 'sessionId'];
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    cookiesToClear.forEach(cookieName => {
      // Clear cookie for .cybersmrt.org domain
      headers.append('Set-Cookie', `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=0; Path=/`);
      // Also clear for current domain (belt and suspenders)
      headers.append('Set-Cookie', `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`);
    });

    console.log('🚪 Logout: Cleared', cookiesToClear.length, 'cookies');
    console.log('🚪 Logout: Set-Cookie headers count:', headers.getSetCookie().length);

    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully',
    }), {
      headers: headers
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

  /**
   * Verify email with token
   */
  async handleVerifyEmail() {
    await checkOAuthRateLimit(this.request, this.env);

    const body = await this.request.json();
    const { token } = body;

    if (!token) {
      throw new Error('Verification token is required');
    }

    const result = await verifyEmail(token, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email verified successfully',
      user: result,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Resend verification email
   */
  async handleResendVerification() {
    await checkOAuthRateLimit(this.request, this.env);

    const body = await this.request.json();
    const { email } = body;

    if (!email) {
      throw new Error('Email is required');
    }

    const result = await resendVerificationEmail(email, this.request, this.env);

    if (result.alreadyVerified) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is already verified',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'If an unverified account exists with this email, a verification link has been sent',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Start 2FA setup
   */
  async handle2FASetup() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const result = await setup2FA(userId, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      email: result.email,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Enable 2FA (verify TOTP and get backup codes)
   * Note: This doesn't enable 2FA yet - user must verify a backup code first
   */
  async handle2FAEnable() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { token } = body;

    if (!token) {
      throw new Error('Verification code is required');
    }

    const result = await enable2FA(userId, token, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      setupComplete: result.setupComplete,
      backupCodes: result.backupCodes,
      message: result.message,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Confirm 2FA setup by verifying backup code
   * This actually enables 2FA and logs out all sessions
   */
  async handle2FAConfirm() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { backupCode } = body;

    if (!backupCode) {
      throw new Error('Backup code is required');
    }

    // Verify backup code and enable 2FA
    const result = await confirm2FASetup(userId, backupCode, this.request, this.env);

    // Delete all user sessions (force re-login with 2FA)
    await deleteUserSessions(userId, this.env);

    return new Response(JSON.stringify({
      success: true,
      enabled: result.enabled,
      message: result.message,
      requiresRelogin: true,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Disable 2FA
   */
  async handle2FADisable() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { password, token } = body;

    if (!password) {
      throw new Error('Password is required');
    }

    if (!token) {
      throw new Error('Verification code is required');
    }

    const result = await disable2FA(userId, password, token, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      disabled: result.disabled,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Verify 2FA code (used during login)
   */
  async handle2FAVerify() {
    // Handle both JSON and form-encoded requests
    const contentType = this.request.headers.get('content-type') || '';
    let userId, code, pendingAuthId;

    if (contentType.includes('application/json')) {
      // JSON request (from fetch)
      const body = await this.request.json();
      ({ userId, code, pendingAuthId } = body);
    } else {
      // Form-encoded request (from form submission)
      const formData = await this.request.formData();
      userId = formData.get('userId');
      code = formData.get('code');
      pendingAuthId = formData.get('pendingAuthId');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!code) {
      throw new Error('Verification code is required');
    }

    // Verify the 2FA code
    const result = await verify2FA(userId, code, this.request, this.env);

    // Get user details
    const user = await this.env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // If this is completing an OAuth flow, verify and log it
    if (pendingAuthId) {
      const pendingAuthJson = await this.env.RATE_LIMIT_KV.get(`pending_2fa:${pendingAuthId}`);

      if (!pendingAuthJson) {
        throw new Error('Invalid or expired pending authentication');
      }

      const pendingAuth = JSON.parse(pendingAuthJson);

      // Verify user ID matches
      if (pendingAuth.userId !== userId) {
        throw new Error('User ID mismatch');
      }

      // Delete pending auth data (one-time use)
      await this.env.RATE_LIMIT_KV.delete(`pending_2fa:${pendingAuthId}`);

      // Log successful OAuth login (now that 2FA is complete)
      await logLogin(user.id, this.request, this.env, pendingAuth.provider);
    }

    // 2FA verified - create session and return tokens
    const session = await createSession(user.id, this.request, this.env);

    // Generate tokens (include role for admin access)
    const accessToken = await generateAccessToken(user.id, user.email, this.env, user.role || 'user');
    const refreshToken = await generateRefreshToken(user.id, this.env);

    // Set cookies for cross-subdomain auth (HttpOnly, Secure, cross-subdomain)
    const cookieMaxAge = this.env.SESSION_EXPIRY || 86400; // Default 24 hours
    const sessionCookie = `session=${session.sessionId}; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;
    const accessTokenCookie = `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;
    const refreshTokenCookie = `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;

    // Set a readable (non-HttpOnly) cookie with basic user info for cross-subdomain auth state
    // This allows JavaScript to check if user is authenticated without exposing sensitive tokens
    const userInfo = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role
    };
    const userInfoCookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; Secure; SameSite=Lax; Domain=.cybersmrt.org; Max-Age=${cookieMaxAge}; Path=/`;

    console.log('🍪 [2FA Verify] Setting cookies for user:', user.id);
    console.log('🍪 [2FA Verify] Session cookie:', sessionCookie.substring(0, 50) + '...');
    console.log('🍪 [2FA Verify] Access token cookie:', accessTokenCookie.substring(0, 50) + '...');
    console.log('🍪 [2FA Verify] User info cookie (readable):', userInfoCookie.substring(0, 50) + '...');

    // Create response with multiple Set-Cookie headers
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Set-Cookie', sessionCookie);
    headers.append('Set-Cookie', accessTokenCookie);
    headers.append('Set-Cookie', refreshTokenCookie);
    headers.append('Set-Cookie', userInfoCookie);

    console.log('🍪 [2FA Verify] Response headers Set-Cookie count:', headers.getSetCookie().length);

    // Create redirect response to callback with user data
    const callbackUrl = new URL(`${this.env.FRONTEND_ORIGIN}/callback`);
    const callbackData = {
      success: true,
      verified: true,
      method: result.method,
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
      // Don't include tokens in redirect - they're in HttpOnly cookies
      tokens: {
        accessToken,
        refreshToken,
      },
    };

    // Encode data in URL hash (client-side only, not sent to server)
    callbackUrl.hash = btoa(JSON.stringify(callbackData));

    headers.delete('Content-Type'); // Remove JSON content type
    headers.append('Location', callbackUrl.toString());

    console.log('🍪 [2FA Verify] Redirecting to callback with cookies');

    return new Response(null, {
      status: 302,
      headers: headers
    });
  }

  /**
   * Get 2FA status
   */
  async handle2FAStatus() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const status = await get2FAStatus(userId, this.env);

    return new Response(JSON.stringify({
      success: true,
      ...status,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Regenerate backup codes
   */
  async handle2FARegenerateBackupCodes() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { token } = body;

    if (!token) {
      throw new Error('Verification code is required');
    }

    const result = await regenerateBackupCodes(userId, token, this.request, this.env);

    return new Response(JSON.stringify({
      success: true,
      backupCodes: result.backupCodes,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get security dashboard statistics
   */
  async handleAdminSecurityStats() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const timeRange = parseInt(url.searchParams.get('timeRange')) || 24;

    const { getSecurityStats } = await import('./utils/security-analytics.js');
    const stats = await getSecurityStats(this.env, timeRange);

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get recent security events
   */
  async handleAdminSecurityEvents() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const eventType = url.searchParams.get('eventType') || null;

    const { getRecentSecurityEvents } = await import('./utils/security-analytics.js');
    const events = await getRecentSecurityEvents(this.env, limit, offset, eventType);

    return new Response(JSON.stringify(events), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get login attempt analytics
   */
  async handleAdminLoginAnalytics() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const timeRange = parseInt(url.searchParams.get('timeRange')) || 24;

    const { getLoginAttemptAnalytics } = await import('./utils/security-analytics.js');
    const analytics = await getLoginAttemptAnalytics(this.env, timeRange);

    return new Response(JSON.stringify(analytics), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get locked accounts
   */
  async handleAdminLockedAccounts() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { getLockedAccounts } = await import('./utils/security-analytics.js');
    const accounts = await getLockedAccounts(this.env);

    return new Response(JSON.stringify(accounts), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Unlock account
   */
  async handleAdminUnlockAccount() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const body = await this.request.json();
    const { email } = body;

    if (!email) {
      throw new Error('Email is required');
    }

    const { unlockAccount } = await import('./utils/security-analytics.js');
    const result = await unlockAccount(email, this.env);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get device statistics
   */
  async handleAdminDeviceStats() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const timeRange = parseInt(url.searchParams.get('timeRange')) || 24;

    const { getDeviceStats } = await import('./utils/security-analytics.js');
    const stats = await getDeviceStats(this.env, timeRange);

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get pending device verification challenges
   */
  async handleAdminPendingChallenges() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { getPendingChallenges } = await import('./utils/security-analytics.js');
    const challenges = await getPendingChallenges(this.env);

    return new Response(JSON.stringify(challenges), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get geographic distribution
   */
  async handleAdminGeographicDistribution() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const timeRange = parseInt(url.searchParams.get('timeRange')) || 24;

    const { getGeographicDistribution } = await import('./utils/security-analytics.js');
    const distribution = await getGeographicDistribution(this.env, timeRange);

    return new Response(JSON.stringify(distribution), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Search security events
   */
  async handleAdminSearchEvents() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const filters = {
      userId: url.searchParams.get('userId') || null,
      eventType: url.searchParams.get('eventType') || null,
      ipAddress: url.searchParams.get('ipAddress') || null,
      email: url.searchParams.get('email') || null,
      startTime: parseInt(url.searchParams.get('startTime')) || null,
      endTime: parseInt(url.searchParams.get('endTime')) || null,
      limit: parseInt(url.searchParams.get('limit')) || 50,
      offset: parseInt(url.searchParams.get('offset')) || 0
    };

    const { searchSecurityEvents } = await import('./utils/security-analytics.js');
    const results = await searchSecurityEvents(this.env, filters);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get user threat history
   */
  async handleAdminUserThreatHistory() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const targetUserId = url.searchParams.get('userId');
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    if (!targetUserId) {
      throw new Error('userId parameter is required');
    }

    const { getUserThreatHistory } = await import('./utils/security-analytics.js');
    const history = await getUserThreatHistory(targetUserId, this.env, limit);

    return new Response(JSON.stringify(history), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get system health
   */
  async handleAdminSystemHealth() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { checkSystemHealth } = await import('./utils/monitoring.js');
    const health = await checkSystemHealth(this.env);

    return new Response(JSON.stringify(health), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get performance metrics
   */
  async handleAdminPerformanceMetrics() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const minutes = parseInt(url.searchParams.get('minutes')) || 60;

    const { getPerformanceMetrics } = await import('./utils/monitoring.js');
    const metrics = await getPerformanceMetrics(this.env, minutes);

    return new Response(JSON.stringify(metrics), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get recent alerts
   */
  async handleAdminAlerts() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    const { getRecentAlerts } = await import('./utils/monitoring.js');
    const alerts = await getRecentAlerts(this.env, limit);

    return new Response(JSON.stringify(alerts), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Acknowledge alert
   */
  async handleAdminAcknowledgeAlert() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const body = await this.request.json();
    const { alertId } = body;

    if (!alertId) {
      throw new Error('alertId is required');
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await this.env.DB.prepare(`
      UPDATE alerts
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
      WHERE id = ?
    `).bind(userId, now, alertId).run();

    return new Response(JSON.stringify({ success: result.success }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Admin: Get error logs
   */
  async handleAdminErrorLogs() {
    const { userId, user } = await authenticateRequest(this.request, this.env);

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const url = new URL(this.request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const errorType = url.searchParams.get('errorType') || null;

    let query = `
      SELECT
        el.id,
        el.error_type,
        el.error_message,
        el.stack_trace,
        el.user_id,
        el.ip_address,
        el.endpoint,
        el.context,
        el.created_at,
        u.email
      FROM error_logs el
      LEFT JOIN users u ON el.user_id = u.id
    `;

    const params = [];

    if (errorType) {
      query += ' WHERE el.error_type = ?';
      params.push(errorType);
    }

    query += ' ORDER BY el.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      errors: result.results.map(error => ({
        ...error,
        context: error.context ? JSON.parse(error.context) : null
      })),
      limit,
      offset
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
