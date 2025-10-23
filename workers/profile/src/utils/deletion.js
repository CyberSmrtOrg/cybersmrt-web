/**
 * Account Deletion Utilities
 * Handles account deletion with grace periods, hard delete, and data anonymization
 */

/**
 * Schedule account deletion with grace period
 * Default: 30 days from now
 */
export async function scheduleAccountDeletion(userId, reason, env, gracePeriodDays = 30) {
  const now = Math.floor(Date.now() / 1000);
  const deleteAt = now + (gracePeriodDays * 24 * 60 * 60);
  const queueId = crypto.randomUUID();

  // Check if there's already a scheduled deletion
  const existing = await env.DB
    .prepare(`
      SELECT id FROM deletion_queue
      WHERE user_id = ? AND status = 'scheduled'
    `)
    .bind(userId)
    .first();

  if (existing) {
    throw new Error('Account deletion already scheduled. Cancel existing deletion first.');
  }

  // Create deletion queue entry
  await env.DB
    .prepare(`
      INSERT INTO deletion_queue (id, user_id, scheduled_at, delete_at, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
    `)
    .bind(queueId, userId, now, deleteAt, reason, now)
    .run();

  // Update user record
  await env.DB
    .prepare(`
      UPDATE users
      SET deletion_scheduled_at = ?, deletion_scheduled_by = ?, deletion_reason = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(deleteAt, userId, reason, now, userId)
    .run();

  return {
    queueId,
    scheduledAt: now,
    deleteAt,
    gracePeriodDays,
    canCancelUntil: deleteAt,
  };
}

/**
 * Cancel scheduled account deletion
 */
export async function cancelAccountDeletion(userId, env) {
  const now = Math.floor(Date.now() / 1000);

  // Update deletion queue
  await env.DB
    .prepare(`
      UPDATE deletion_queue
      SET status = 'cancelled'
      WHERE user_id = ? AND status = 'scheduled'
    `)
    .bind(userId)
    .run();

  // Clear user deletion fields
  await env.DB
    .prepare(`
      UPDATE users
      SET deletion_scheduled_at = NULL, deletion_scheduled_by = NULL, deletion_reason = NULL, updated_at = ?
      WHERE id = ?
    `)
    .bind(now, userId)
    .run();

  return { cancelled: true, timestamp: now };
}

/**
 * Soft delete account (immediate deactivation)
 */
export async function softDeleteAccount(userId, reason, env) {
  const now = Math.floor(Date.now() / 1000);

  // Deactivate account
  await env.DB
    .prepare(`
      UPDATE users
      SET is_active = 0, deleted_at = ?, deletion_reason = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(now, reason, now, userId)
    .run();

  // Delete all sessions
  await env.DB
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .bind(userId)
    .run();

  // Delete backup codes
  await env.DB
    .prepare('DELETE FROM backup_codes WHERE user_id = ?')
    .bind(userId)
    .run();

  // Delete password reset tokens
  await env.DB
    .prepare('DELETE FROM password_resets WHERE user_id = ?')
    .bind(userId)
    .run();

  return { softDeleted: true, timestamp: now };
}

/**
 * Hard delete account (permanent removal)
 * WARNING: This is irreversible
 */
export async function hardDeleteAccount(userId, env, options = {}) {
  const { anonymizeLogs = true, deleteFiles = true } = options;

  // Get user info before deletion
  const user = await env.DB
    .prepare('SELECT email, avatar_url FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // Delete from R2 if requested
  if (deleteFiles && user.avatar_url && env.UPLOADS) {
    try {
      const urlParts = user.avatar_url.split('/uploads/');
      if (urlParts.length === 2) {
        const key = urlParts[1];
        await env.UPLOADS.delete(key);
      }

      // Delete entire user folder in R2
      const prefix = `avatars/${userId}/`;
      const list = await env.UPLOADS.list({ prefix });
      for (const object of list.objects) {
        await env.UPLOADS.delete(object.key);
      }
    } catch (error) {
      console.error('Error deleting user files from R2:', error);
    }
  }

  // Anonymize security logs if requested
  if (anonymizeLogs) {
    await anonymizeUserLogs(userId, env);
  } else {
    // Otherwise, delete all security logs
    await env.DB
      .prepare('DELETE FROM security_logs WHERE user_id = ?')
      .bind(userId)
      .run();
  }

  // Delete related records
  await env.DB
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .bind(userId)
    .run();

  await env.DB
    .prepare('DELETE FROM backup_codes WHERE user_id = ?')
    .bind(userId)
    .run();

  await env.DB
    .prepare('DELETE FROM password_resets WHERE user_id = ?')
    .bind(userId)
    .run();

  await env.DB
    .prepare('DELETE FROM oauth_providers WHERE user_id = ?')
    .bind(userId)
    .run();

  await env.DB
    .prepare('DELETE FROM deletion_queue WHERE user_id = ?')
    .bind(userId)
    .run();

  // Delete user record
  await env.DB
    .prepare('DELETE FROM users WHERE id = ?')
    .bind(userId)
    .run();

  return {
    hardDeleted: true,
    timestamp: Math.floor(Date.now() / 1000),
    anonymizedLogs: anonymizeLogs,
    deletedFiles: deleteFiles,
  };
}

/**
 * Anonymize user data in security logs
 * Replaces PII with anonymized versions while preserving audit trail
 */
async function anonymizeUserLogs(userId, env) {
  const anonymizedEmail = `deleted-user-${userId.substring(0, 8)}@anonymized.local`;

  // Get all security logs for the user
  const logs = await env.DB
    .prepare('SELECT id, details FROM security_logs WHERE user_id = ?')
    .bind(userId)
    .all();

  // Anonymize each log entry
  for (const log of logs.results || []) {
    let details = {};
    try {
      details = JSON.parse(log.details || '{}');
    } catch (e) {
      continue;
    }

    // Remove or anonymize PII from details
    if (details.email) details.email = anonymizedEmail;
    if (details.provider) delete details.provider;

    // Update the log
    await env.DB
      .prepare('UPDATE security_logs SET details = ? WHERE id = ?')
      .bind(JSON.stringify(details), log.id)
      .run();
  }

  // Set user_id to NULL to break the foreign key relationship
  await env.DB
    .prepare('UPDATE security_logs SET user_id = NULL WHERE user_id = ?')
    .bind(userId)
    .run();
}

/**
 * Process scheduled deletions
 * Should be called by a cron job
 */
export async function processScheduledDeletions(env) {
  const now = Math.floor(Date.now() / 1000);

  // Get all scheduled deletions that are due
  const deletions = await env.DB
    .prepare(`
      SELECT id, user_id, reason
      FROM deletion_queue
      WHERE status = 'scheduled' AND delete_at <= ?
    `)
    .bind(now)
    .all();

  const results = {
    processed: 0,
    failed: 0,
    userIds: [],
  };

  for (const deletion of deletions.results || []) {
    try {
      // Perform hard delete
      await hardDeleteAccount(deletion.user_id, env, {
        anonymizeLogs: true,
        deleteFiles: true,
      });

      // Mark deletion as completed
      await env.DB
        .prepare(`
          UPDATE deletion_queue
          SET status = 'completed'
          WHERE id = ?
        `)
        .bind(deletion.id)
        .run();

      results.processed++;
      results.userIds.push(deletion.user_id);
    } catch (error) {
      console.error(`Failed to delete user ${deletion.user_id}:`, error);
      results.failed++;
    }
  }

  return results;
}

/**
 * Get deletion status for a user
 */
export async function getDeletionStatus(userId, env) {
  const deletion = await env.DB
    .prepare(`
      SELECT id, scheduled_at, delete_at, reason, status
      FROM deletion_queue
      WHERE user_id = ? AND status = 'scheduled'
    `)
    .bind(userId)
    .first();

  if (!deletion) {
    return { scheduled: false };
  }

  const now = Math.floor(Date.now() / 1000);
  const daysRemaining = Math.ceil((deletion.delete_at - now) / (24 * 60 * 60));

  return {
    scheduled: true,
    queueId: deletion.id,
    scheduledAt: deletion.scheduled_at,
    deleteAt: deletion.delete_at,
    daysRemaining,
    reason: deletion.reason,
    canCancel: deletion.delete_at > now,
  };
}
