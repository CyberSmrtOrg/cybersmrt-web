-- Migration 0007: Add Admin Roles and Permissions System
-- Adds role-based access control (RBAC) for admin functionality

-- Role column already exists, just add admin-specific tracking fields
-- Note: The role column was added in an earlier migration
-- Valid roles: 'user', 'admin', 'super_admin'

-- Add admin promotion tracking fields
ALTER TABLE users ADD COLUMN promoted_at INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN promoted_by TEXT DEFAULT NULL;

-- Create admin_actions audit log table
CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);

-- Create admin_settings table for system configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin settings
INSERT OR IGNORE INTO admin_settings (key, value, description, updated_at) VALUES
  ('max_failed_logins', '5', 'Maximum failed login attempts before account lockout', strftime('%s', 'now')),
  ('session_timeout_minutes', '60', 'Default session timeout in minutes', strftime('%s', 'now')),
  ('require_email_verification', 'true', 'Require email verification for new accounts', strftime('%s', 'now')),
  ('allow_registration', 'true', 'Allow new user registrations', strftime('%s', 'now')),
  ('maintenance_mode', 'false', 'Enable maintenance mode (blocks all non-admin access)', strftime('%s', 'now'));
