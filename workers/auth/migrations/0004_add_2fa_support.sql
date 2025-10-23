-- Migration number: 0004 	 2025-10-23T21:00:00.000Z
-- Add Two-Factor Authentication (2FA) support

-- Add TOTP secret column to users table
-- This will store the encrypted TOTP secret for authenticator apps
ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL;

-- Add 2FA enabled flag
ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;

-- Create backup codes table for 2FA recovery
CREATE TABLE IF NOT EXISTS backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  used_at INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_used ON backup_codes(used);
