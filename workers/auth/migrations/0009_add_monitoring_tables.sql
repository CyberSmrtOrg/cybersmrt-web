-- Migration 0009: Add Monitoring and Alerting Tables
-- Created: 2025-10-23
-- Purpose: Support error tracking, performance monitoring, and alerting

-- Error logs table for tracking all errors
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT,
  context TEXT, -- JSON blob for additional context
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);

-- Alerts table for system alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  condition_type TEXT NOT NULL CHECK(condition_type IN (
    'high_error_rate',
    'database_slow',
    'many_locked_accounts',
    'credential_stuffing',
    'system_unhealthy',
    'alert_check_failed'
  )),
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  details TEXT, -- JSON blob for alert details
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_condition_type ON alerts(condition_type);

-- Performance metrics table (optional - we're using KV for real-time metrics)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  avg_duration_ms INTEGER NOT NULL,
  min_duration_ms INTEGER NOT NULL,
  max_duration_ms INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_start, period_end);
