/**
 * Dashboard Business Logic Handlers
 *
 * File path: workers/api/src/dashboard/handlers.js
 */

export async function getDashboardData(userId, env) {
  // Get user profile data
  const user = await env.DB
    .prepare(`
      SELECT id, email, display_name, avatar_url, bio, location, website,
             role, email_verified, created_at, updated_at
      FROM users
      WHERE id = ?
    `)
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // Get user's active sessions count
  const sessionCount = await env.DB
    .prepare(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE user_id = ? AND expires_at > ?
    `)
    .bind(userId, Math.floor(Date.now() / 1000))
    .first();

  // Get user settings
  const settings = await env.DB
    .prepare(`
      SELECT settings
      FROM user_settings
      WHERE user_id = ?
    `)
    .bind(userId)
    .first();

  // Get 2FA status
  const twoFactorStatus = await env.DB
    .prepare(`
      SELECT totp_enabled
      FROM users
      WHERE id = ?
    `)
    .bind(userId)
    .first();

  // Parse settings or use defaults
  let userSettings = {
    theme: 'dark',
    notifications: true,
    emailNotifications: true,
    language: 'en',
  };

  if (settings && settings.settings) {
    try {
      userSettings = JSON.parse(settings.settings);
    } catch (e) {
      console.error('Failed to parse user settings:', e);
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      website: user.website,
      role: user.role,
      emailVerified: user.email_verified === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    stats: {
      activeSessions: sessionCount?.count || 0,
      twoFactorEnabled: twoFactorStatus?.totp_enabled === 1,
      accountAge: Math.floor((Date.now() / 1000 - user.created_at) / 86400), // days
    },
    settings: userSettings,
  };
}