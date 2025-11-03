-- Migration: 0011_add_social_media_connections
-- Description: Create social media connections table for content posting
-- Created: 2025-11-02

CREATE TABLE IF NOT EXISTS social_media_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok', 'bluesky', 'twitter')),
    platform_user_id TEXT NOT NULL,
    platform_username TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at INTEGER,
    scope TEXT, -- Comma-separated list of granted permissions
    profile_data TEXT, -- JSON with profile info (avatar, display name, etc.)
    is_active INTEGER DEFAULT 1, -- 1 = active, 0 = disconnected/revoked
    last_used_at INTEGER, -- Last time this connection was used to post
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_social_user_id ON social_media_connections(user_id);
CREATE INDEX idx_social_platform ON social_media_connections(platform);
CREATE UNIQUE INDEX idx_social_platform_user ON social_media_connections(platform, platform_user_id);
CREATE INDEX idx_social_active ON social_media_connections(is_active);

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_social_timestamp
AFTER UPDATE ON social_media_connections
BEGIN
    UPDATE social_media_connections SET updated_at = unixepoch('now') WHERE id = NEW.id;
END;

-- Table for tracking social media posts
CREATE TABLE IF NOT EXISTS social_media_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok', 'bluesky', 'twitter')),
    content TEXT NOT NULL,
    media_urls TEXT, -- JSON array of media URLs
    platform_post_id TEXT, -- ID returned by the platform
    platform_post_url TEXT, -- Direct URL to the post
    status TEXT NOT NULL CHECK (status IN ('pending', 'published', 'failed', 'deleted')),
    error_message TEXT, -- Error details if status is 'failed'
    scheduled_for INTEGER, -- Unix timestamp for scheduled posts
    published_at INTEGER, -- Unix timestamp when actually published
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES social_media_connections(id) ON DELETE CASCADE
);

-- Create indexes for posts
CREATE INDEX idx_posts_user_id ON social_media_posts(user_id);
CREATE INDEX idx_posts_connection_id ON social_media_posts(connection_id);
CREATE INDEX idx_posts_platform ON social_media_posts(platform);
CREATE INDEX idx_posts_status ON social_media_posts(status);
CREATE INDEX idx_posts_scheduled ON social_media_posts(scheduled_for);
CREATE INDEX idx_posts_published ON social_media_posts(published_at);

-- Add trigger to automatically update updated_at for posts
CREATE TRIGGER update_posts_timestamp
AFTER UPDATE ON social_media_posts
BEGIN
    UPDATE social_media_posts SET updated_at = unixepoch('now') WHERE id = NEW.id;
END;
