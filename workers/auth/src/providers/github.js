/**
 * GitHub OAuth 2.0 Provider
 * Implements GitHub Sign-In flow
 */

import { getProviderConfig } from '../config.js';

/**
 * Generate GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(env, state) {
  const config = getProviderConfig('github', env);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: state,
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGitHubCode(code, env) {
  const config = getProviderConfig('github', env);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return await response.json();
}

/**
 * Get user profile from GitHub
 */
export async function getGitHubUserInfo(accessToken, env) {
  const config = getProviderConfig('github', env);

  // Get user profile
  const userResponse = await fetch(config.userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'CyberSmrt-Auth',
    },
  });

  if (!userResponse.ok) {
    const error = await userResponse.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const user = await userResponse.json();

  // Get user emails (GitHub requires separate endpoint)
  const emailsResponse = await fetch(config.emailEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'CyberSmrt-Auth',
    },
  });

  let email = user.email;
  let emailVerified = false;

  if (emailsResponse.ok) {
    const emails = await emailsResponse.json();
    // Find primary verified email
    const primaryEmail = emails.find(e => e.primary && e.verified);
    if (primaryEmail) {
      email = primaryEmail.email;
      emailVerified = true;
    } else {
      // Fall back to first verified email
      const verifiedEmail = emails.find(e => e.verified);
      if (verifiedEmail) {
        email = verifiedEmail.email;
        emailVerified = true;
      }
    }
  }

  return {
    provider: 'github',
    providerUserId: user.id.toString(),
    email: email,
    emailVerified: emailVerified,
    displayName: user.name || user.login,
    username: user.login,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url,
    bio: user.bio,
    location: user.location,
    company: user.company,
  };
}

/**
 * Complete GitHub OAuth flow
 */
export async function handleGitHubCallback(code, env) {
  // Exchange code for tokens
  const tokens = await exchangeGitHubCode(code, env);

  // Get user profile (GitHub returns access_token not accessToken)
  const profile = await getGitHubUserInfo(tokens.access_token, env);

  return {
    tokens,
    profile,
  };
}