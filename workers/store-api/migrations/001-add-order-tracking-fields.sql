-- Migration: Add order tracking fields for user purchases
-- Created: 2025-01-06

-- Add user_id column to orders table (nullable for guest checkouts)
ALTER TABLE orders ADD COLUMN user_id TEXT;

-- Add order_number column for easy lookup (format: CS-YYYYMMDD-XXXXX)
ALTER TABLE orders ADD COLUMN order_number TEXT;

-- Add index for user_id to speed up "My Purchases" queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Add unique index for order_number to speed up order lookup and enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Update existing orders to generate order_numbers (if any exist)
-- Format: CS-YYYYMMDD-{5 digit random}
-- This will be handled by the application code for existing orders
