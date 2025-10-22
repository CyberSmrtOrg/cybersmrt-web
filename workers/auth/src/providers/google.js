/**
 * Google OAuth 2.0 Provider
 * Implements Google Sign-In flow
 */

import { getProviderConfig } from '../config.js';

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(env, state) {
  const config = getProviderConfig('google', env);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    scope: config.scope,
    state: state,
    access_type: 'offline',  // Request refresh token
    prompt: 'consent',       // Force consent screen to get refresh token
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(code, env) {
  const config = getProviderConfig('google', env);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return await response.json();
}

/**
 * Get user profile from Google
 */
export async function getGoogleUserInfo(accessToken, env) {
  const config = getProviderConfig('google', env || {});  // Only need endpoints

  const response = await fetch(config.userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const userInfo = await response.json();

  return {
    provider: 'google',
    providerUserId: userInfo.id,
    email: userInfo.email,
    emailVerified: userInfo.verified_email,
    displayName: userInfo.name,
    firstName: userInfo.given_name,
    lastName: userInfo.family_name,
    avatarUrl: userInfo.picture,
    locale: userInfo.locale,
  };
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(refreshToken, env) {
  const config = getProviderConfig('google', env);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return await response.json();
}

/**
 * Complete Google OAuth flow
 */
export async function handleGoogleCallback(code, env) {
  // Exchange code for tokens
  const tokens = await exchangeGoogleCode(code, env);

  // Get user profile
  const profile = await getGoogleUserInfo(tokens.access_token, env);

  return {
    tokens,
    profile,
  };
}