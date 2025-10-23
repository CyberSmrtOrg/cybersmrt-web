/**
 * Profile Router
 * Handles all profile-related endpoints
 */

import { authenticateRequest } from './utils/auth.js';

/**
 * Profile Router Class
 */
export class ProfileRouter {
  constructor(env, request) {
    this.env = env;
    this.request = request;
  }

  /**
   * Get user profile
   */
  async handleGetProfile() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Get user from database
    const user = await this.env.DB
      .prepare(`
        SELECT
          id, email, display_name, bio, location, website,
          avatar_url, email_verified, totp_enabled, role,
          created_at, updated_at
        FROM users
        WHERE id = ?
      `)
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
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        bio: user.bio,
        location: user.location,
        website: user.website,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified === 1,
        totpEnabled: user.totp_enabled === 1,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        connectedProviders: providers.results || [],
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Update user profile
   */
  async handleUpdateProfile() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { displayName, bio, location, website } = body;

    // Validate inputs
    if (displayName !== undefined && displayName.length > 100) {
      throw new Error('Display name must be 100 characters or less');
    }

    if (bio !== undefined && bio.length > 500) {
      throw new Error('Bio must be 500 characters or less');
    }

    if (location !== undefined && location.length > 100) {
      throw new Error('Location must be 100 characters or less');
    }

    if (website !== undefined && website.length > 200) {
      throw new Error('Website must be 200 characters or less');
    }

    // Validate website URL if provided
    if (website && website.trim() !== '') {
      try {
        new URL(website);
      } catch {
        throw new Error('Invalid website URL');
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }

    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }

    if (website !== undefined) {
      updates.push('website = ?');
      values.push(website);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add userId for WHERE clause
    values.push(userId);

    // Execute update
    await this.env.DB
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Fetch updated user
    const user = await this.env.DB
      .prepare(`
        SELECT
          id, email, display_name, bio, location, website,
          avatar_url, email_verified, totp_enabled, role,
          created_at, updated_at
        FROM users
        WHERE id = ?
      `)
      .bind(userId)
      .first();

    return new Response(JSON.stringify({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        bio: user.bio,
        location: user.location,
        website: user.website,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified === 1,
        totpEnabled: user.totp_enabled === 1,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get user settings
   */
  async handleGetSettings() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Get user settings
    const user = await this.env.DB
      .prepare(`
        SELECT
          email, display_name, email_verified, totp_enabled,
          is_active, role
        FROM users
        WHERE id = ?
      `)
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get connected providers
    const providers = await this.env.DB
      .prepare('SELECT provider FROM oauth_providers WHERE user_id = ?')
      .bind(userId)
      .all();

    // Get backup codes count
    const backupCodes = await this.env.DB
      .prepare('SELECT COUNT(*) as count FROM backup_codes WHERE user_id = ? AND used = 0')
      .bind(userId)
      .first();

    // Get active sessions count
    const sessions = await this.env.DB
      .prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > ?')
      .bind(userId, Math.floor(Date.now() / 1000))
      .first();

    return new Response(JSON.stringify({
      success: true,
      settings: {
        email: user.email,
        displayName: user.display_name,
        emailVerified: user.email_verified === 1,
        twoFactorEnabled: user.totp_enabled === 1,
        backupCodesRemaining: backupCodes?.count || 0,
        connectedProviders: (providers.results || []).map(p => p.provider),
        activeSessions: sessions?.count || 0,
        accountActive: user.is_active === 1,
        role: user.role,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Update user settings
   * Currently handles display name updates (more can be added)
   */
  async handleUpdateSettings() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { displayName } = body;

    // For now, only allow updating display name through settings
    // Other settings (2FA, password) have dedicated endpoints

    if (!displayName) {
      throw new Error('Display name is required');
    }

    if (displayName.length > 100) {
      throw new Error('Display name must be 100 characters or less');
    }

    const now = Math.floor(Date.now() / 1000);

    await this.env.DB
      .prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?')
      .bind(displayName, now, userId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Settings updated successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get security activity logs
   */
  async handleGetSecurityLogs() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const url = new URL(this.request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Validate limits
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    const logs = await this.env.DB
      .prepare(`
        SELECT
          id, event_type, ip_address, user_agent, details, created_at
        FROM security_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(userId, validLimit, validOffset)
      .all();

    // Get total count
    const countResult = await this.env.DB
      .prepare('SELECT COUNT(*) as count FROM security_logs WHERE user_id = ?')
      .bind(userId)
      .first();

    return new Response(JSON.stringify({
      success: true,
      logs: logs.results || [],
      pagination: {
        limit: validLimit,
        offset: validOffset,
        total: countResult?.count || 0,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Export user data (GDPR compliance)
   */
  async handleExportData() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Get user data
    const user = await this.env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get OAuth providers
    const providers = await this.env.DB
      .prepare('SELECT * FROM oauth_providers WHERE user_id = ?')
      .bind(userId)
      .all();

    // Get sessions
    const sessions = await this.env.DB
      .prepare('SELECT * FROM sessions WHERE user_id = ?')
      .bind(userId)
      .all();

    // Get security logs
    const logs = await this.env.DB
      .prepare('SELECT * FROM security_logs WHERE user_id = ?')
      .bind(userId)
      .all();

    // Build export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        bio: user.bio,
        location: user.location,
        website: user.website,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified === 1,
        twoFactorEnabled: user.totp_enabled === 1,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      oauthProviders: providers.results || [],
      sessions: sessions.results || [],
      securityLogs: logs.results || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cybersmrt-data-${userId}-${Date.now()}.json"`,
      },
    });
  }

  /**
   * Delete user account (GDPR compliance)
   * This is a soft delete - sets is_active = 0
   */
  async handleDeleteAccount() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { password, confirmDelete } = body;

    if (!confirmDelete || confirmDelete !== 'DELETE MY ACCOUNT') {
      throw new Error('Please confirm account deletion by typing "DELETE MY ACCOUNT"');
    }

    // Get user
    const user = await this.env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // If user has a password, verify it
    if (user.password_hash && password) {
      // TODO: Verify password using bcrypt
      // For now, we'll require password but not verify
      // In production, import password verification from auth worker
    }

    // Soft delete: deactivate account
    const now = Math.floor(Date.now() / 1000);
    await this.env.DB
      .prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();

    // Delete all sessions
    await this.env.DB
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(userId)
      .run();

    // Delete backup codes
    await this.env.DB
      .prepare('DELETE FROM backup_codes WHERE user_id = ?')
      .bind(userId)
      .run();

    // Note: We keep security logs for audit trail

    return new Response(JSON.stringify({
      success: true,
      message: 'Account deleted successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
