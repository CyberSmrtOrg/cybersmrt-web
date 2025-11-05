-- CyberSmrt Merch Store Database Schema

-- Products table (cache of Printify catalog with our pricing)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    printify_blueprint_id INTEGER NOT NULL,
    printify_print_provider_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL, -- Price in cents
    markup_price INTEGER NOT NULL, -- Selling price in cents
    images TEXT, -- JSON array of image URLs
    variants TEXT, -- JSON array of variant data
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    stripe_checkout_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    printify_order_id TEXT,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    shipping_address TEXT NOT NULL, -- JSON
    line_items TEXT NOT NULL, -- JSON array
    subtotal INTEGER NOT NULL, -- In cents
    shipping_cost INTEGER NOT NULL, -- In cents
    total_amount INTEGER NOT NULL, -- In cents
    status TEXT DEFAULT 'pending', -- pending, paid, processing, fulfilled, shipped, cancelled
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, refunded
    tracking_number TEXT,
    tracking_url TEXT,
    printify_response TEXT, -- JSON of Printify API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order line items (for easier querying)
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT,
    printify_blueprint_id INTEGER NOT NULL,
    printify_print_provider_id INTEGER NOT NULL,
    printify_variant_id INTEGER NOT NULL,
    product_title TEXT NOT NULL,
    variant_title TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL, -- In cents
    total_price INTEGER NOT NULL, -- In cents
    print_areas TEXT, -- JSON of print area data
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Printify blueprints cache
CREATE TABLE IF NOT EXISTS printify_blueprints (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    images TEXT, -- JSON array
    print_provider_id INTEGER,
    variants TEXT, -- JSON array of variants
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL, -- 'stripe' or 'printify'
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE,
    payload TEXT NOT NULL, -- JSON
    processed BOOLEAN DEFAULT 0,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
