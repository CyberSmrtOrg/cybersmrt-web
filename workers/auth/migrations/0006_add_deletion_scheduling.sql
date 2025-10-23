-- Add deletion scheduling support
-- Allows users to schedule account deletion with grace period

ALTER TABLE users ADD COLUMN deletion_scheduled_at INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN deletion_scheduled_by TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN deletion_reason TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN deleted_at INTEGER DEFAULT NULL;

-- Create deletion queue table
CREATE TABLE IF NOT EXISTS deletion_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  delete_at INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'cancelled', 'completed')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_deletion_queue_delete_at ON deletion_queue(delete_at);
CREATE INDEX idx_deletion_queue_status ON deletion_queue(status);
CREATE INDEX idx_deletion_queue_user_id ON deletion_queue(user_id);
