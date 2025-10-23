/**
 * Profile Router
 * Handles all profile-related endpoints
 */

import { authenticateRequest } from './utils/auth.js';
import {
  validateFile,
  generateFilename,
  uploadToR2,
  deleteFromR2,
  getFromR2,
  parseFormData,
  getCDNUrl,
  cleanupOldAvatar,
} from './utils/upload.js';
import {
  scheduleAccountDeletion,
  cancelAccountDeletion,
  softDeleteAccount,
  hardDeleteAccount,
  getDeletionStatus,
} from './utils/deletion.js';
import {
  sendDeletionScheduledEmail,
  sendDeletionCancelledEmail,
  sendAccountDeletedEmail,
} from './utils/deletion-emails.js';

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
   * Export security logs to CSV or JSON
   */
  async handleExportSecurityLogs() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const url = new URL(this.request.url);
    const format = url.searchParams.get('format') || 'json'; // 'json' or 'csv'

    // Get all security logs for the user
    const logs = await this.env.DB
      .prepare(`
        SELECT
          id, event_type, ip_address, user_agent, details, created_at
        FROM security_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
      `)
      .bind(userId)
      .all();

    const logData = logs.results || [];

    if (format === 'csv') {
      // Convert to CSV
      const csvRows = [];

      // Header
      csvRows.push([
        'Timestamp',
        'Event Type',
        'IP Address',
        'Browser',
        'Operating System',
        'Device Type',
        'Location',
        'Country',
        'City',
        'Risk Level',
        'Security Flags',
      ].join(','));

      // Data rows
      for (const log of logData) {
        let details = {};
        try {
          details = JSON.parse(log.details || '{}');
        } catch (e) {
          // Skip invalid JSON
        }

        const timestamp = new Date(log.created_at * 1000).toISOString();
        const eventType = log.event_type;
        const ipAddress = log.ip_address || '';
        const browser = details.device?.browser || '';
        const os = details.device?.os || '';
        const deviceType = details.device?.type || '';
        const location = details.geolocation?.location || '';
        const country = details.geolocation?.countryName || '';
        const city = details.geolocation?.city || '';
        const riskLevel = details.securityAnalysis?.riskLevel || '';
        const flags = details.securityAnalysis?.flags?.join('; ') || '';

        csvRows.push([
          `"${timestamp}"`,
          `"${eventType}"`,
          `"${ipAddress}"`,
          `"${browser}"`,
          `"${os}"`,
          `"${deviceType}"`,
          `"${location}"`,
          `"${country}"`,
          `"${city}"`,
          `"${riskLevel}"`,
          `"${flags}"`,
        ].join(','));
      }

      const csvContent = csvRows.join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="security-logs-${userId}-${Date.now()}.csv"`,
        },
      });
    } else {
      // JSON format (default)
      const jsonData = {
        exportDate: new Date().toISOString(),
        userId,
        totalLogs: logData.length,
        logs: logData.map(log => {
          let details = {};
          try {
            details = JSON.parse(log.details || '{}');
          } catch (e) {
            details = {};
          }

          return {
            timestamp: new Date(log.created_at * 1000).toISOString(),
            eventType: log.event_type,
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            device: details.device || null,
            geolocation: details.geolocation || null,
            securityAnalysis: details.securityAnalysis || null,
            otherDetails: Object.keys(details)
              .filter(key => !['device', 'geolocation', 'securityAnalysis'].includes(key))
              .reduce((obj, key) => {
                obj[key] = details[key];
                return obj;
              }, {}),
          };
        }),
      };

      return new Response(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="security-logs-${userId}-${Date.now()}.json"`,
        },
      });
    }
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

    // Get backup codes
    const backupCodes = await this.env.DB
      .prepare('SELECT code_hash, used, used_at, created_at FROM backup_codes WHERE user_id = ?')
      .bind(userId)
      .all();

    // Get uploaded files from R2
    const uploadedFiles = [];
    if (this.env.UPLOADS) {
      try {
        const prefix = `avatars/${userId}/`;
        const list = await this.env.UPLOADS.list({ prefix });
        for (const object of list.objects) {
          uploadedFiles.push({
            key: object.key,
            size: object.size,
            uploaded: object.uploaded,
            downloadUrl: `https://profile.cybersmrt.org/uploads/${object.key}`,
          });
        }
      } catch (error) {
        console.error('Error listing R2 files:', error);
      }
    }

    // Get deletion status
    const deletionStatus = await getDeletionStatus(userId, this.env);

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
        deletionScheduled: deletionStatus.scheduled,
        deletionDate: deletionStatus.deleteAt ? new Date(deletionStatus.deleteAt * 1000).toISOString() : null,
      },
      oauthProviders: providers.results || [],
      sessions: sessions.results || [],
      securityLogs: logs.results || [],
      backupCodes: backupCodes.results || [],
      uploadedFiles: uploadedFiles,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cybersmrt-data-${userId}-${Date.now()}.json"`,
      },
    });
  }

  /**
   * Schedule account deletion with grace period
   */
  async handleScheduleAccountDeletion() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { confirmDelete, reason, gracePeriodDays } = body;

    if (!confirmDelete || confirmDelete !== 'DELETE MY ACCOUNT') {
      throw new Error('Please confirm account deletion by typing "DELETE MY ACCOUNT"');
    }

    // Get user
    const user = await this.env.DB
      .prepare('SELECT id, email, display_name FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Schedule deletion
    const deletionInfo = await scheduleAccountDeletion(
      userId,
      reason || 'User requested deletion',
      this.env,
      gracePeriodDays || 30
    );

    // Send confirmation email
    await sendDeletionScheduledEmail(user, deletionInfo, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: `Account deletion scheduled for ${new Date(deletionInfo.deleteAt * 1000).toLocaleDateString()}`,
      deletionInfo: {
        scheduledAt: deletionInfo.scheduledAt,
        deleteAt: deletionInfo.deleteAt,
        gracePeriodDays: deletionInfo.gracePeriodDays,
        canCancelUntil: deletionInfo.canCancelUntil,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Cancel scheduled account deletion
   */
  async handleCancelAccountDeletion() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Get user
    const user = await this.env.DB
      .prepare('SELECT id, email, display_name FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Cancel deletion
    const result = await cancelAccountDeletion(userId, this.env);

    // Send confirmation email
    await sendDeletionCancelledEmail(user, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Account deletion cancelled successfully',
      cancelledAt: result.timestamp,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get deletion status
   */
  async handleGetDeletionStatus() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const status = await getDeletionStatus(userId, this.env);

    return new Response(JSON.stringify({
      success: true,
      deletionStatus: status,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Delete user account immediately (soft delete)
   * For users who want immediate deletion without grace period
   */
  async handleDeleteAccount() {
    const { userId } = await authenticateRequest(this.request, this.env);

    const body = await this.request.json();
    const { confirmDelete, reason } = body;

    if (!confirmDelete || confirmDelete !== 'DELETE MY ACCOUNT') {
      throw new Error('Please confirm account deletion by typing "DELETE MY ACCOUNT"');
    }

    // Get user
    const user = await this.env.DB
      .prepare('SELECT id, email FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Perform soft delete
    await softDeleteAccount(userId, reason || 'User requested immediate deletion', this.env);

    // Send confirmation email
    await sendAccountDeletedEmail(user.email, this.env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Account deleted successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Upload avatar
   */
  async handleUploadAvatar() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Parse multipart form data
    const { files } = await parseFormData(this.request);

    if (files.length === 0) {
      throw new Error('No file provided');
    }

    const fileEntry = files[0];
    const file = fileEntry.file;

    // Validate file
    validateFile(file, {
      maxSize: 2 * 1024 * 1024, // 2MB for avatars
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });

    // Get current user to check for existing avatar
    const user = await this.env.DB
      .prepare('SELECT avatar_url FROM users WHERE id = ?')
      .bind(userId)
      .first();

    // Clean up old avatar if exists
    if (user.avatar_url) {
      await cleanupOldAvatar(this.env.UPLOADS, userId, user.avatar_url);
    }

    // Generate filename
    const filename = generateFilename(userId, file.name, 'avatars/');

    // Upload to R2
    const uploadResult = await uploadToR2(this.env.UPLOADS, filename, file, {
      userId,
      type: 'avatar',
    });

    // Generate CDN URL
    const avatarUrl = getCDNUrl(filename, this.env);

    // Update database
    const now = Math.floor(Date.now() / 1000);
    await this.env.DB
      .prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?')
      .bind(avatarUrl, now, userId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      avatarUrl,
      message: 'Avatar uploaded successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Delete avatar
   */
  async handleDeleteAvatar() {
    const { userId } = await authenticateRequest(this.request, this.env);

    // Get current avatar URL
    const user = await this.env.DB
      .prepare('SELECT avatar_url FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user || !user.avatar_url) {
      throw new Error('No avatar to delete');
    }

    // Delete from R2
    await cleanupOldAvatar(this.env.UPLOADS, userId, user.avatar_url);

    // Update database
    const now = Math.floor(Date.now() / 1000);
    await this.env.DB
      .prepare('UPDATE users SET avatar_url = NULL, updated_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Avatar deleted successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Serve uploaded file from R2
   */
  async handleServeFile(key) {
    try {
      const file = await getFromR2(this.env.UPLOADS, key);

      if (!file) {
        return new Response('File not found', { status: 404 });
      }

      return new Response(file.body, {
        headers: {
          'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } catch (error) {
      console.error('Error serving file:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
}
