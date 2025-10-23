-- Migration number: 0005 	 2025-10-23T21:30:00.000Z
-- Add 2FA event types to security_logs CHECK constraint

-- SQLite doesn't allow ALTER TABLE to modify CHECK constraints
-- So we need to recreate the table with the updated constraint

-- Create new table with updated CHECK constraint
CREATE TABLE security_logs_new (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'login',
            'logout',
            'failed_login',
            'password_change',
            'password_reset_request',
            'password_reset_complete',
            'email_verification_sent',
            'email_verified',
            'account_locked',
            'account_unlocked',
            'oauth_link',
            'oauth_unlink',
            'session_created',
            'session_expired',
            'suspicious_activity',
            '2fa_setup_started',
            '2fa_enabled',
            '2fa_enable_failed',
            '2fa_disabled',
            '2fa_disable_failed',
            '2fa_verified',
            '2fa_verification_failed',
            '2fa_backup_code_used',
            'backup_codes_regenerated',
            'backup_codes_regenerate_failed'
        )
    ),
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Copy existing data
INSERT INTO security_logs_new SELECT * FROM security_logs;

-- Drop old table
DROP TABLE security_logs;

-- Rename new table
ALTER TABLE security_logs_new RENAME TO security_logs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at);
