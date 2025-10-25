/**
 * Apple Sign In Provider
 * Implements Apple OAuth flow with client_secret JWT generation
 */

import { getProviderConfig } from '../config.js';
import * as jose from 'jose';

/**
 * Generate Apple client_secret JWT
 * Apple requires a dynamically generated JWT as the client secret
 */
async function generateAppleClientSecret(env) {
  const config = getProviderConfig('apple', env);

  // Import Apple's private key
  const privateKey = await jose.importPKCS8(config.privateKey, 'ES256');

  // Create JWT
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({
      alg: 'ES256',
      kid: config.keyId,
    })
    .setIssuer(config.teamId)
    .setIssuedAt()
    .setExpirationTime('180d')  // Apple allows up to 6 months
    .setAudience('https://appleid.apple.com')
    .setSubject(config.clientId)
    .sign(privateKey);

  return jwt;
}

/**
 * Generate Apple OAuth authorization URL
 */
export function getAppleAuthUrl(env, state) {
  const config = getProviderConfig('apple', env);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    response_mode: config.responseMode,
    scope: config.scope,
    state: state,
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAppleCode(code, env) {
  const config = getProviderConfig('apple', env);
  const clientSecret = await generateAppleClientSecret(env);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: code,
      client_id: config.clientId,
      client_secret: clientSecret,
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
 * Decode Apple ID token to get user info
 * Apple doesn't have a separate userInfo endpoint - info is in the ID token
 */
export async function getAppleUserInfo(idToken) {
  // Decode the ID token (we don't verify signature here since it came directly from Apple's token endpoint)
  const decoded = jose.decodeJwt(idToken);

  return {
    provider: 'apple',
    providerUserId: decoded.sub,
    email: decoded.email,
    emailVerified: decoded.email_verified === 'true' || decoded.email_verified === true,
    // Apple only provides name on first sign-in via form_post
    // After that, it's not included in the ID token
    isPrivateEmail: decoded.is_private_email === 'true' || decoded.is_private_email === true,
  };
}

/**
 * Refresh Apple access token
 */
export async function refreshAppleToken(refreshToken, env) {
  const config = getProviderConfig('apple', env);
  const clientSecret = await generateAppleClientSecret(env);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: clientSecret,
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
 * Complete Apple OAuth flow
 */
export async function handleAppleCallback(code, env, userData = null) {
  // Exchange code for tokens
  const tokens = await exchangeAppleCode(code, env);

  // Get user profile from ID token
  const profile = await getAppleUserInfo(tokens.id_token);

  // Apple sends user data (name) only on first sign-in via form_post
  // It's in the request body, not in the ID token
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.name) {
        profile.firstName = user.name.firstName;
        profile.lastName = user.name.lastName;
        profile.displayName = `${user.name.firstName} ${user.name.lastName}`;
      }
    } catch (e) {
      // userData parsing failed, continue without name
    }
  }

  return {
    tokens,
    profile,
  };
}