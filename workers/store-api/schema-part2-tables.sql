-- Part 2: Orders table
-- Execute this second

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    stripe_checkout_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    printify_order_id TEXT,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    shipping_address TEXT NOT NULL,
    line_items TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    shipping_cost INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    tracking_number TEXT,
    tracking_url TEXT,
    printify_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
