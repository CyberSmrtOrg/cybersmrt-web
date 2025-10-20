-- Migration: 0006_create_user_profiles_table
-- Description: Create extended user profile information table
-- Created: 2025-10-19

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    bio TEXT,
    location TEXT,
    website TEXT,
    organization TEXT,
    phone TEXT,
    preferences TEXT,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_profile_timestamp
AFTER UPDATE ON user_profiles
BEGIN
    UPDATE user_profiles SET updated_at = unixepoch('now') WHERE user_id = NEW.user_id;
END;