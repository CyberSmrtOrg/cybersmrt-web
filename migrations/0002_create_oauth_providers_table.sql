-- Migration: 0002_create_oauth_providers_table
-- Description: Create OAuth provider connections table
-- Created: 2025-10-19

CREATE TABLE IF NOT EXISTS oauth_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'microsoft', 'apple')),
    provider_user_id TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    token_expires_at INTEGER,
    profile_data TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_oauth_user_id ON oauth_providers(user_id);
CREATE UNIQUE INDEX idx_oauth_provider_user ON oauth_providers(provider, provider_user_id);

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_oauth_timestamp
AFTER UPDATE ON oauth_providers
BEGIN
    UPDATE oauth_providers SET updated_at = unixepoch('now') WHERE id = NEW.id;
END;