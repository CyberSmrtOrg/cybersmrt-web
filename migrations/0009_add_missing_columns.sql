-- Add missing columns to users table
-- Run with: wrangler d1 execute cybersmrt-users --file=migrations/add-missing-columns.sql --remote

-- Note: These will error if the column already exists - that's OK and safe!
-- SQLite will just skip columns that already exist.
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN website TEXT;