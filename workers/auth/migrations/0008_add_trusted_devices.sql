-- Migration 0008: Add Trusted Devices and Device Management
-- Enables device recognition, trusted device tracking, and device-based security

-- Create trusted_devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  is_trusted INTEGER NOT NULL DEFAULT 0,
  trust_granted_at INTEGER,
  last_used_at INTEGER NOT NULL,
  first_seen_at INTEGER NOT NULL,
  ip_address TEXT,
  location_city TEXT,
  location_country TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX idx_trusted_devices_user_fingerprint ON trusted_devices(user_id, device_fingerprint);
CREATE INDEX idx_trusted_devices_last_used ON trusted_devices(last_used_at);

-- Create device_verification_challenges table
-- For sending "Was this you?" challenges when unknown device is detected
CREATE TABLE IF NOT EXISTS device_verification_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK(challenge_type IN ('email', 'totp', 'sms')),
  challenge_code TEXT NOT NULL,
  ip_address TEXT,
  location_city TEXT,
  location_country TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied', 'expired')),
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_device_challenges_user_id ON device_verification_challenges(user_id);
CREATE INDEX idx_device_challenges_status ON device_verification_challenges(status);
CREATE INDEX idx_device_challenges_expires ON device_verification_challenges(expires_at);

-- Create login_attempts table for brute force protection
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  device_fingerprint TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_email_created ON login_attempts(email, created_at);

-- Add account lockout fields to users table
ALTER TABLE users ADD COLUMN locked_until INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN failed_login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_failed_login_at INTEGER DEFAULT NULL;
