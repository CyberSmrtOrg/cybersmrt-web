-- Migration: 0003_create_sessions_table
-- Description: Create sessions table for active user sessions
-- Created: 2025-10-19

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_activity_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Add trigger to update last_activity_at
CREATE TRIGGER update_session_activity
AFTER UPDATE ON sessions
BEGIN
    UPDATE sessions SET last_activity_at = unixepoch('now') WHERE id = NEW.id;
END;