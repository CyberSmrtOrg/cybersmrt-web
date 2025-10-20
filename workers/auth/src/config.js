/**
 * OAuth Provider Configuration
 * Centralizes all OAuth 2.0 provider settings
 */

export const PROVIDERS = {
  google: {
    name: 'Google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
    responseType: 'code',
  },

  github: {
    name: 'GitHub',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    emailEndpoint: 'https://api.github.com/user/emails',
    scope: 'read:user user:email',
    responseType: 'code',
  },

  apple: {
    name: 'Apple',
    authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
    tokenEndpoint: 'https://appleid.apple.com/auth/token',
    scope: 'name email',
    responseType: 'code id_token',
    responseMode: 'form_post',
  },

  microsoft: {
    name: 'Microsoft',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile User.Read',
    responseType: 'code',
  },
};

/**
 * Get provider configuration
 */
export function getProviderConfig(provider, env) {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown OAuth provider: ${provider}`);
  }

  // Add credentials from environment
  switch (provider) {
    case 'google':
      return {
        ...config,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI,
      };

    case 'github':
      return {
        ...config,
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectUri: env.GITHUB_REDIRECT_URI,
      };

    case 'apple':
      return {
        ...config,
        clientId: env.APPLE_CLIENT_ID,
        teamId: env.APPLE_TEAM_ID,
        keyId: env.APPLE_KEY_ID,
        privateKey: env.APPLE_PRIVATE_KEY,
        redirectUri: env.APPLE_REDIRECT_URI,
      };

    case 'microsoft':
      return {
        ...config,
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        redirectUri: env.MICROSOFT_REDIRECT_URI,
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Validate OAuth configuration
 */
export function validateConfig(provider, env) {
  const required = {
    google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_REDIRECT_URI'],
    apple: ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'APPLE_REDIRECT_URI'],
    microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_REDIRECT_URI'],
  };

  const missing = required[provider]?.filter(key => !env[key]) || [];

  if (missing.length > 0) {
    throw new Error(`Missing configuration for ${provider}: ${missing.join(', ')}`);
  }

  return true;
}