-- Part 1: Create Tables
-- Execute this first

-- Products table (cache of Printify catalog with our pricing)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    printify_blueprint_id INTEGER NOT NULL,
    printify_print_provider_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL,
    markup_price INTEGER NOT NULL,
    images TEXT,
    variants TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
