/**
 * Microsoft OAuth 2.0 Provider
 * Implements Microsoft Account / Azure AD Sign-In flow
 */

import { getProviderConfig } from '../config.js';

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(env, state) {
  const config = getProviderConfig('microsoft', env);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    response_mode: 'query',
    scope: config.scope,
    state: state,
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeMicrosoftCode(code, env) {
  const config = getProviderConfig('microsoft', env);

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
 * Get user profile from Microsoft Graph API
 */
export async function getMicrosoftUserInfo(accessToken, env) {
  const config = getProviderConfig('microsoft', env || {});

  const response = await fetch(config.userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const userInfo = await response.json();

  return {
    provider: 'microsoft',
    providerUserId: userInfo.id,
    email: userInfo.mail || userInfo.userPrincipalName,
    emailVerified: true,  // Microsoft emails are pre-verified
    displayName: userInfo.displayName,
    firstName: userInfo.givenName,
    lastName: userInfo.surname,
    jobTitle: userInfo.jobTitle,
    officeLocation: userInfo.officeLocation,
    preferredLanguage: userInfo.preferredLanguage,
  };
}

/**
 * Refresh Microsoft access token
 */
export async function refreshMicrosoftToken(refreshToken, env) {
  const config = getProviderConfig('microsoft', env);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refreshToken: refreshToken,
      grant_type: 'refreshToken',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return await response.json();
}

/**
 * Complete Microsoft OAuth flow
 */
export async function handleMicrosoftCallback(code, env) {
  // Exchange code for tokens
  const tokens = await exchangeMicrosoftCode(code, env);

  // Get user profile (Microsoft returns access_token not accessToken)
  const profile = await getMicrosoftUserInfo(tokens.access_token, env);

  return {
    tokens,
    profile,
  };
}