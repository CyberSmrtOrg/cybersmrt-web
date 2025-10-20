-- Migration: 0005_create_security_logs_table
-- Description: Create security event logging table
-- Created: 2025-10-19

CREATE TABLE IF NOT EXISTS security_logs (
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
            'suspicious_activity'
        )
    ),
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address);