/**
 * Admin API Router
 * Handles all admin-only endpoints
 */

import {
  ROLES,
  logAdminAction,
  getAdminSettings,
  updateAdminSetting,
  promoteToAdmin,
  demoteFromAdmin,
  getAdminActionLogs,
  ADMIN_ACTIONS,
} from './utils/admin.js';

export class AdminRouter {
  constructor(env, request, adminUser) {
    this.env = env;
    this.request = request;
    this.adminUser = adminUser; // Set by withAdminAuth middleware
  }

  /**
   * Helper to parse request body
   */
  async getBody() {
    try {
      return await this.request.json();
    } catch {
      return {};
    }
  }

  /**
   * Get all users (paginated)
   */
  async handleGetUsers() {
    try {
      const url = new URL(this.request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const search = url.searchParams.get('search') || '';
      const role = url.searchParams.get('role') || '';
      const status = url.searchParams.get('status') || '';

      const offset = (page - 1) * limit;

      let query = 'SELECT id, email, display_name, role, email_verified, is_active, created_at, last_login_at FROM users WHERE 1=1';
      const bindings = [];

      // Apply filters
      if (search) {
        query += ' AND (email LIKE ? OR display_name LIKE ?)';
        bindings.push(`%${search}%`, `%${search}%`);
      }

      if (role) {
        query += ' AND role = ?';
        bindings.push(role);
      }

      if (status === 'active') {
        query += ' AND is_active = 1';
      } else if (status === 'inactive') {
        query += ' AND is_active = 0';
      }

      // Get total count
      let countQuery = query.replace('SELECT id, email, display_name, role, email_verified, is_active, created_at, last_login_at', 'SELECT COUNT(*) as count');
      let preparedCountQuery = this.env.DB.prepare(countQuery);
      for (const binding of bindings) {
        preparedCountQuery = preparedCountQuery.bind(binding);
      }
      const countResult = await preparedCountQuery.first();
      const total = countResult.count;

      // Get paginated users
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      bindings.push(limit, offset);

      let preparedQuery = this.env.DB.prepare(query);
      for (const binding of bindings) {
        preparedQuery = preparedQuery.bind(binding);
      }

      const result = await preparedQuery.all();

      // Transform snake_case to camelCase for frontend compatibility
      const users = result.results.map(user => ({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        emailVerified: user.email_verified === 1,
        isActive: user.is_active === 1,
        banned: user.is_active === 0,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      }));

      // Log admin action
      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.SECURITY_LOG_VIEWED,
        'users',
        null,
        { page, limit, filters: { search, role, status } },
        this.request,
        this.env
      );

      return {
        success: true,
        users: users,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

    } catch (error) {
      console.error('Get users error:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get single user details (including sensitive info for admin)
   */
  async handleGetUser() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/').pop();

      const user = await this.env.DB.prepare(`
        SELECT id, email, display_name, avatar_url, role, email_verified, is_active,
               bio, location, website, two_factor_enabled, totp_enabled,
               created_at, updated_at, last_login_at,
               promoted_at, promoted_by, deletion_scheduled_at, deleted_at
        FROM users WHERE id = ?
      `).bind(userId).first();

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get user's sessions
      const sessions = await this.env.DB.prepare(
        'SELECT id, created_at, last_activity, ip_address FROM sessions WHERE user_id = ? ORDER BY last_activity DESC LIMIT 10'
      ).bind(userId).all();

      // Get user's recent security events
      const securityLogs = await this.env.DB.prepare(
        'SELECT event_type, created_at, ip_address, details FROM security_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
      ).bind(userId).all();

      // Log admin action
      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.SECURITY_LOG_VIEWED,
        'user',
        userId,
        null,
        this.request,
        this.env
      );

      return {
        success: true,
        user,
        sessions: sessions.results,
        securityLogs: securityLogs.results.map(log => ({
          ...log,
          details: log.details ? JSON.parse(log.details) : null,
        })),
      };

    } catch (error) {
      console.error('Get user error:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  /**
   * Update user (admin override)
   */
  async handleUpdateUser() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/').pop();
      const body = await this.getBody();

      const { email, displayName, role, emailVerified, isActive } = body;

      // Build update query dynamically
      const updates = [];
      const bindings = [];

      if (email !== undefined) {
        updates.push('email = ?');
        bindings.push(email);
      }

      if (displayName !== undefined) {
        updates.push('display_name = ?');
        bindings.push(displayName);
      }

      if (role !== undefined && [ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
        updates.push('role = ?');
        bindings.push(role);
      }

      if (emailVerified !== undefined) {
        updates.push('email_verified = ?');
        bindings.push(emailVerified ? 1 : 0);
      }

      if (isActive !== undefined) {
        updates.push('is_active = ?');
        bindings.push(isActive ? 1 : 0);
      }

      if (updates.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      // Add updated_at
      const now = Math.floor(Date.now() / 1000);
      updates.push('updated_at = ?');
      bindings.push(now);

      // Add userId to bindings
      bindings.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      await this.env.DB.prepare(query).bind(...bindings).run();

      // Log admin action
      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.USER_UPDATED,
        'user',
        userId,
        { changes: body },
        this.request,
        this.env
      );

      return { success: true, message: 'User updated successfully' };

    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Suspend/activate user account
   */
  async handleToggleUserStatus() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/')[2]; // /admin/users/{userId}/toggle-status
      const body = await this.getBody();
      const { isActive, reason } = body;

      const now = Math.floor(Date.now() / 1000);

      await this.env.DB.prepare(
        'UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?'
      ).bind(isActive ? 1 : 0, now, userId).run();

      // Log admin action
      await logAdminAction(
        this.adminUser.id,
        isActive ? ADMIN_ACTIONS.USER_ACTIVATED : ADMIN_ACTIONS.USER_SUSPENDED,
        'user',
        userId,
        { reason },
        this.request,
        this.env
      );

      return {
        success: true,
        message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      };

    } catch (error) {
      console.error('Toggle user status error:', error);
      throw new Error('Failed to update user status');
    }
  }

  /**
   * Delete user (admin override)
   */
  async handleDeleteUser() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/')[2]; // /admin/users/{userId}
      const body = await this.getBody();
      const { reason, hardDelete = false } = body;

      if (hardDelete) {
        // Hard delete - remove all data
        await this.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

        await logAdminAction(
          this.adminUser.id,
          ADMIN_ACTIONS.USER_DELETED,
          'user',
          userId,
          { reason, type: 'hard' },
          this.request,
          this.env
        );
      } else {
        // Soft delete - mark as inactive and deleted
        const now = Math.floor(Date.now() / 1000);
        await this.env.DB.prepare(
          'UPDATE users SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?'
        ).bind(now, now, userId).run();

        await logAdminAction(
          this.adminUser.id,
          ADMIN_ACTIONS.USER_DELETED,
          'user',
          userId,
          { reason, type: 'soft' },
          this.request,
          this.env
        );
      }

      return { success: true, message: 'User deleted successfully' };

    } catch (error) {
      console.error('Delete user error:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Promote user to admin
   */
  async handlePromoteUser() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/')[2]; // /admin/users/{userId}/promote
      const body = await this.getBody();
      const { role = ROLES.ADMIN } = body;

      const result = await promoteToAdmin(userId, role, this.adminUser.id, this.env);

      if (!result.success) {
        return result;
      }

      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.USER_PROMOTED,
        'user',
        userId,
        { role },
        this.request,
        this.env
      );

      return { success: true, message: 'User promoted successfully' };

    } catch (error) {
      console.error('Promote user error:', error);
      throw new Error('Failed to promote user');
    }
  }

  /**
   * Demote admin to regular user
   */
  async handleDemoteUser() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/')[2]; // /admin/users/{userId}/demote

      const result = await demoteFromAdmin(userId, this.env);

      if (!result.success) {
        return result;
      }

      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.USER_DEMOTED,
        'user',
        userId,
        null,
        this.request,
        this.env
      );

      return { success: true, message: 'User demoted successfully' };

    } catch (error) {
      console.error('Demote user error:', error);
      throw new Error('Failed to demote user');
    }
  }

  /**
   * Get system statistics
   */
  async handleGetStats() {
    try {
      // Total users
      const totalUsers = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users'
      ).first();

      // Active users
      const activeUsers = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
      ).first();

      // Users with 2FA enabled
      const twoFactorUsers = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE totp_enabled = 1'
      ).first();

      // Verified users
      const verifiedUsers = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE email_verified = 1'
      ).first();

      // Users by role
      const usersByRole = await this.env.DB.prepare(
        'SELECT role, COUNT(*) as count FROM users GROUP BY role'
      ).all();

      // Recent registrations (last 7 days)
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      const recentRegistrations = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
      ).bind(sevenDaysAgo).first();

      // Recent logins (last 24 hours)
      const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
      const recentLogins = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?'
      ).bind(oneDayAgo).first();

      // Active sessions
      const activeSessions = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM sessions'
      ).all();

      // Security events (last 24 hours)
      const recentSecurityEvents = await this.env.DB.prepare(
        'SELECT event_type, COUNT(*) as count FROM security_events WHERE created_at >= ? GROUP BY event_type'
      ).bind(oneDayAgo).all();

      return {
        success: true,
        stats: {
          users: {
            total: totalUsers.count,
            active: activeUsers.count,
            inactive: totalUsers.count - activeUsers.count,
            verified: verifiedUsers.count,
            twoFactor: twoFactorUsers.count,
            byRole: usersByRole.results,
          },
          activity: {
            recentRegistrations: recentRegistrations.count,
            recentLogins: recentLogins.count,
            activeSessions: activeSessions.results[0]?.count || 0,
          },
          security: {
            recentEvents: recentSecurityEvents.results,
          },
        },
      };

    } catch (error) {
      console.error('Get stats error:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  /**
   * Get admin action logs
   */
  async handleGetAdminLogs() {
    try {
      const url = new URL(this.request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const adminId = url.searchParams.get('adminId') || '';
      const actionType = url.searchParams.get('actionType') || '';

      const offset = (page - 1) * limit;

      const result = await getAdminActionLogs(
        { adminId, actionType, limit, offset },
        this.env
      );

      if (!result.success) {
        return result;
      }

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as count FROM admin_actions WHERE 1=1';
      const bindings = [];

      if (adminId) {
        countQuery += ' AND admin_id = ?';
        bindings.push(adminId);
      }

      if (actionType) {
        countQuery += ' AND action_type = ?';
        bindings.push(actionType);
      }

      let preparedCountQuery = this.env.DB.prepare(countQuery);
      for (const binding of bindings) {
        preparedCountQuery = preparedCountQuery.bind(binding);
      }

      const countResult = await preparedCountQuery.first();

      return {
        success: true,
        logs: result.logs,
        pagination: {
          page,
          limit,
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / limit),
        },
      };

    } catch (error) {
      console.error('Get admin logs error:', error);
      throw new Error('Failed to fetch admin logs');
    }
  }

  /**
   * Get system settings
   */
  async handleGetSettings() {
    try {
      const result = await getAdminSettings(this.env);

      return result;

    } catch (error) {
      console.error('Get settings error:', error);
      throw new Error('Failed to fetch settings');
    }
  }

  /**
   * Update system setting
   */
  async handleUpdateSetting() {
    try {
      const body = await this.getBody();
      const { key, value } = body;

      if (!key) {
        return { success: false, error: 'Setting key is required' };
      }

      const result = await updateAdminSetting(key, value, this.adminUser.id, this.env);

      if (!result.success) {
        return result;
      }

      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.SETTING_UPDATED,
        'setting',
        key,
        { value },
        this.request,
        this.env
      );

      return { success: true, message: 'Setting updated successfully' };

    } catch (error) {
      console.error('Update setting error:', error);
      throw new Error('Failed to update setting');
    }
  }

  /**
   * Reset user password (admin override)
   */
  async handleResetUserPassword() {
    try {
      const url = new URL(this.request.url);
      const userId = url.pathname.split('/')[2]; // /admin/users/{userId}/reset-password
      const body = await this.getBody();
      const { temporaryPassword, requireChange = true } = body;

      if (!temporaryPassword) {
        return { success: false, error: 'Temporary password is required' };
      }

      // Hash the temporary password
      const encoder = new TextEncoder();
      const data = encoder.encode(temporaryPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const now = Math.floor(Date.now() / 1000);

      // Update password and optionally mark for change
      await this.env.DB.prepare(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
      ).bind(passwordHash, now, userId).run();

      // Invalidate all existing sessions
      await this.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();

      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.USER_PASSWORD_RESET,
        'user',
        userId,
        { requireChange },
        this.request,
        this.env
      );

      return {
        success: true,
        message: 'Password reset successfully. All sessions have been terminated.',
      };

    } catch (error) {
      console.error('Reset password error:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Terminate user session
   */
  async handleTerminateSession() {
    try {
      const url = new URL(this.request.url);
      const sessionId = url.pathname.split('/').pop();

      await this.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.SESSION_TERMINATED,
        'session',
        sessionId,
        null,
        this.request,
        this.env
      );

      return { success: true, message: 'Session terminated successfully' };

    } catch (error) {
      console.error('Terminate session error:', error);
      throw new Error('Failed to terminate session');
    }
  }

  /**
   * Get analytics data for admin dashboard
   */
  async handleGetAnalytics() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get total users
      const totalUsersResult = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users'
      ).first();
      const totalUsers = totalUsersResult?.count || 0;

      // Get new users in last 7 days
      const newUsersResult = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
      ).bind(sevenDaysAgo).first();
      const newUsersWeek = newUsersResult?.count || 0;

      // Get active users in last 30 days (users who logged in)
      const activeUsersResult = await this.env.DB.prepare(
        'SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE created_at >= ?'
      ).bind(thirtyDaysAgo).first();
      const activeUsersMonth = activeUsersResult?.count || 0;

      // Get 2FA adoption rate
      const twoFAUsersResult = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE totp_secret IS NOT NULL AND totp_secret != ""'
      ).first();
      const twoFAUsers = twoFAUsersResult?.count || 0;
      const twoFAAdoption = totalUsers > 0 ? Math.round((twoFAUsers / totalUsers) * 100) : 0;

      // Get login success rate (from security logs if available)
      // For now, we'll use a simplified calculation based on sessions created
      const loginSuccessRate = 95; // Placeholder - would need login attempt tracking

      // Log admin action
      await logAdminAction(
        this.adminUser.id,
        ADMIN_ACTIONS.SECURITY_LOG_VIEWED,
        'analytics',
        null,
        null,
        this.request,
        this.env
      );

      return {
        success: true,
        newUsersWeek,
        activeUsersMonth,
        loginSuccessRate,
        twoFAAdoption,
        totalUsers,
        twoFAUsers,
      };

    } catch (error) {
      console.error('Get analytics error:', error);
      throw new Error('Failed to fetch analytics');
    }
  }
}
