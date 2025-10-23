/**
 * Admin Authentication and Authorization Utilities
 * Provides middleware and helpers for admin-only endpoints
 */

import { verifyToken } from './jwt.js';

/**
 * Admin role hierarchy
 */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

/**
 * Role hierarchy levels (higher = more permissions)
 */
const ROLE_LEVELS = {
  [ROLES.USER]: 0,
  [ROLES.ADMIN]: 10,
  [ROLES.SUPER_ADMIN]: 20,
};

/**
 * Check if a role has required permission level
 */
export function hasPermission(userRole, requiredRole) {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Verify user is authenticated and has admin role
 * Returns { success: boolean, user?: object, error?: string }
 */
export async function verifyAdmin(request, env, requiredRole = ROLES.ADMIN) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return { success: false, error: 'Missing authorization header' };
    }

    // Extract token
    const token = authHeader.replace(/^Bearer\s+/, '');
    if (!token) {
      return { success: false, error: 'Invalid authorization format' };
    }

    // Verify JWT
    const payload = await verifyToken(token, env);
    if (!payload) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Get user from database
    const user = await env.DB.prepare(
      'SELECT id, email, display_name, role, is_active FROM users WHERE id = ?'
    ).bind(payload.sub).first();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if user is active
    if (!user.is_active) {
      return { success: false, error: 'Account is inactive' };
    }

    // Check if user has required role
    if (!hasPermission(user.role, requiredRole)) {
      return { success: false, error: 'Insufficient permissions', statusCode: 403 };
    }

    return { success: true, user };

  } catch (error) {
    console.error('Admin verification error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Admin middleware wrapper
 * Wraps an endpoint handler with admin authentication
 */
export async function withAdminAuth(handler, request, env, ctx, requiredRole = ROLES.ADMIN) {
  // Verify admin access
  const authResult = await verifyAdmin(request, env, requiredRole);

  if (!authResult.success) {
    const statusCode = authResult.statusCode || 401;
    return new Response(JSON.stringify({
      success: false,
      error: authResult.error,
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Add admin user to context for handler to use
  const adminContext = {
    ...ctx,
    adminUser: authResult.user,
  };

  // Execute handler with admin context
  return await handler(request, env, adminContext);
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(adminId, actionType, targetType, targetId, details, request, env) {
  try {
    const id = crypto.randomUUID();
    const ipAddress = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT INTO admin_actions (id, admin_id, action_type, target_type, target_id, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      adminId,
      actionType,
      targetType,
      targetId || null,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
      now
    ).run();

    return { success: true, actionId: id };

  } catch (error) {
    console.error('Failed to log admin action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get admin settings from database
 */
export async function getAdminSettings(env, keys = null) {
  try {
    let query;
    if (keys && keys.length > 0) {
      const placeholders = keys.map(() => '?').join(',');
      query = env.DB.prepare(`SELECT key, value FROM admin_settings WHERE key IN (${placeholders})`);
      for (const key of keys) {
        query = query.bind(key);
      }
    } else {
      query = env.DB.prepare('SELECT key, value FROM admin_settings');
    }

    const result = await query.all();

    // Convert to key-value object
    const settings = {};
    for (const row of result.results) {
      // Parse boolean values
      if (row.value === 'true') settings[row.key] = true;
      else if (row.value === 'false') settings[row.key] = false;
      // Parse numbers
      else if (!isNaN(row.value)) settings[row.key] = parseInt(row.value);
      // Keep as string
      else settings[row.key] = row.value;
    }

    return { success: true, settings };

  } catch (error) {
    console.error('Failed to get admin settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update admin setting
 */
export async function updateAdminSetting(key, value, adminId, env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT INTO admin_settings (key, value, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).bind(key, String(value), now, adminId).run();

    return { success: true };

  } catch (error) {
    console.error('Failed to update admin setting:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(env) {
  const result = await getAdminSettings(env, ['maintenance_mode']);
  return result.success && result.settings.maintenance_mode === true;
}

/**
 * Promote user to admin role
 */
export async function promoteToAdmin(userId, role, promotedBy, env) {
  try {
    // Validate role
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
      return { success: false, error: 'Invalid admin role' };
    }

    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      UPDATE users
      SET role = ?, promoted_at = ?, promoted_by = ?, updated_at = ?
      WHERE id = ?
    `).bind(role, now, promotedBy, now, userId).run();

    return { success: true, promotedAt: now };

  } catch (error) {
    console.error('Failed to promote user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Demote admin to regular user
 */
export async function demoteFromAdmin(userId, env) {
  try {
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      UPDATE users
      SET role = ?, promoted_at = NULL, promoted_by = NULL, updated_at = ?
      WHERE id = ?
    `).bind(ROLES.USER, now, userId).run();

    return { success: true };

  } catch (error) {
    console.error('Failed to demote user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get admin action logs
 */
export async function getAdminActionLogs(filters = {}, env) {
  try {
    const { adminId, actionType, targetType, limit = 100, offset = 0 } = filters;

    let query = 'SELECT * FROM admin_actions WHERE 1=1';
    const bindings = [];

    if (adminId) {
      query += ' AND admin_id = ?';
      bindings.push(adminId);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      bindings.push(actionType);
    }

    if (targetType) {
      query += ' AND target_type = ?';
      bindings.push(targetType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    let preparedQuery = env.DB.prepare(query);
    for (const binding of bindings) {
      preparedQuery = preparedQuery.bind(binding);
    }

    const result = await preparedQuery.all();

    // Parse details JSON
    const logs = result.results.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return { success: true, logs, count: result.results.length };

  } catch (error) {
    console.error('Failed to get admin logs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin action types (for consistency)
 */
export const ADMIN_ACTIONS = {
  // User management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_ACTIVATED: 'user_activated',
  USER_PROMOTED: 'user_promoted',
  USER_DEMOTED: 'user_demoted',
  USER_PASSWORD_RESET: 'user_password_reset',

  // Settings management
  SETTING_UPDATED: 'setting_updated',
  MAINTENANCE_MODE_ENABLED: 'maintenance_mode_enabled',
  MAINTENANCE_MODE_DISABLED: 'maintenance_mode_disabled',

  // Security actions
  SESSION_TERMINATED: 'session_terminated',
  RATE_LIMIT_RESET: 'rate_limit_reset',
  SECURITY_LOG_VIEWED: 'security_log_viewed',

  // Data management
  DATA_EXPORTED: 'data_exported',
  DATA_IMPORTED: 'data_imported',
  BACKUP_CREATED: 'backup_created',
};
