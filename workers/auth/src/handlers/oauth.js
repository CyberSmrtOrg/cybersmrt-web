/**
 * OAuth Handler - FIXED
 * Better error handling for new users
 */

import { generateTokens, createSession } from '../utils/token.js';

const OAUTH_CONFIGS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid'
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email'
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid profile email User.Read'
  }
};

export async function generateOAuthURL(env, provider) {
  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  // Get credentials from environment
  const clientId = env[`${provider.toUpperCase()}_CLIENT_ID`];
  const redirectUri = env[`${provider.toUpperCase()}_REDIRECT_URI`];

  if (!clientId || !redirectUri) {
    console.error(`Missing OAuth config for ${provider}:`, {
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri
    });
    throw new Error(`OAuth not configured for ${provider}`);
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;

  // Redirect to OAuth provider
  return Response.redirect(authUrl, 302);
}

export async function handleOAuthCallback(env, request, provider) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Check for OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return redirectWithError(env, `OAuth error: ${error}`);
  }

  if (!code) {
    console.error('No code in callback');
    return redirectWithError(env, 'No authorization code received');
  }

  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    return redirectWithError(env, `Unsupported provider: ${provider}`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(env, provider, code, config);

    if (!tokenResponse.access_token) {
      console.error('No access token received:', tokenResponse);
      return redirectWithError(env, 'Failed to get access token');
    }

    // Get user info
    const userInfo = await fetchUserInfo(provider, tokenResponse.access_token, config);

    if (!userInfo || !userInfo.email) {
      console.error('Invalid user info:', userInfo);
      return redirectWithError(env, 'Failed to get user information');
    }

    // Find or create user
    const user = await findOrCreateUser(env, provider, userInfo);

    // Generate JWT tokens
    const tokens = await generateTokens(env, user);

    // Create session
    const session = await createSession(env, user.id, request);

    // Prepare callback data
    const callbackData = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        provider: user.provider
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt
      }
    };

    // Encode data as base64 for URL hash
    const encoded = btoa(JSON.stringify(callbackData));

    // Redirect to frontend with data in hash
    const frontendUrl = env.FRONTEND_URL || 'https://cybersmrt.org';
    return Response.redirect(`${frontendUrl}/callback.html#${encoded}`, 302);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return redirectWithError(env, error.message);
  }
}

async function exchangeCodeForToken(env, provider, code, config) {
  const clientId = env[`${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = env[`${provider.toUpperCase()}_CLIENT_SECRET`];
  const redirectUri = env[`${provider.toUpperCase()}_REDIRECT_URI`];

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', response.status, errorText);
    throw new Error('Failed to exchange code for token');
  }

  return await response.json();
}

async function fetchUserInfo(provider, accessToken, config) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  };

  // GitHub requires User-Agent header
  if (provider === 'github') {
    headers['User-Agent'] = 'CyberSmrt-Auth';
  }

  const response = await fetch(config.userInfoUrl, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('User info fetch failed:', response.status, errorText);
    throw new Error('Failed to fetch user information');
  }

  const userInfo = await response.json();

  // Normalize user info across providers
  return normalizeUserInfo(provider, userInfo);
}

function normalizeUserInfo(provider, info) {
  switch (provider) {
    case 'google':
      return {
        email: info.email,
        displayName: info.name,
        avatarUrl: info.picture,
        providerId: info.id
      };
    case 'github':
      return {
        email: info.email || `${info.login}@github.placeholder`,
        displayName: info.name || info.login,
        avatarUrl: info.avatar_url,
        providerId: String(info.id)
      };
    case 'microsoft':
      return {
        email: info.mail || info.userPrincipalName,
        displayName: info.displayName,
        avatarUrl: null,
        providerId: info.id
      };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function findOrCreateUser(env, provider, userInfo) {
  const email = userInfo.email.toLowerCase();

  // Try to find existing user by email
  let user = null;
  try {
    const existingUser = await env.USERS.get(`email:${email}`);
    if (existingUser) {
      user = JSON.parse(existingUser);
      console.log('Found existing user:', user.id);
    }
  } catch (error) {
    console.error('Error looking up user:', error);
    // Continue to create new user
  }

  // Create new user if not found
  if (!user) {
    console.log('Creating new user for:', email);
    user = {
      id: crypto.randomUUID(),
      email: email,
      displayName: userInfo.displayName,
      avatarUrl: userInfo.avatarUrl,
      provider: provider,
      providerId: userInfo.providerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store user
    try {
      await env.USERS.put(`user:${user.id}`, JSON.stringify(user));
      await env.USERS.put(`email:${email}`, JSON.stringify(user));
      await env.USERS.put(`provider:${provider}:${userInfo.providerId}`, JSON.stringify(user));
      console.log('User created successfully:', user.id);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user account');
    }
  }

  return user;
}

function redirectWithError(env, message) {
  const frontendUrl = env.FRONTEND_URL || 'https://cybersmrt.org';
  const errorData = {
    success: false,
    error: message
  };
  const encoded = btoa(JSON.stringify(errorData));
  return Response.redirect(`${frontendUrl}/callback.html#${encoded}`, 302);
}