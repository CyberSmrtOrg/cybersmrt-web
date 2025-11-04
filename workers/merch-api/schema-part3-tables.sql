-- Part 3: Order items table
-- Execute this third

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
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    print_areas TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
