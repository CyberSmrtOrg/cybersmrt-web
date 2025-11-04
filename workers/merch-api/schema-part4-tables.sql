-- Part 4: Printify blueprints and webhook events tables
-- Execute this fourth

CREATE TABLE IF NOT EXISTS printify_blueprints (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    images TEXT,
    print_provider_id INTEGER,
    variants TEXT,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE,
    payload TEXT NOT NULL,
    processed BOOLEAN DEFAULT 0,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
