#!/bin/bash
# Script to safely add missing columns and tables to CyberSmrt database
# This checks what exists before adding anything

echo "🔍 Checking current database schema..."

# Check current users table structure
echo ""
echo "Current users table columns:"
wrangler d1 execute cybersmrt-users --command="PRAGMA table_info(users);" --remote

# Check if user_settings table exists
echo ""
echo "Checking for user_settings table:"
wrangler d1 execute cybersmrt-users --command="SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings';" --remote

# Check if sessions table exists
echo ""
echo "Checking for sessions table:"
wrangler d1 execute cybersmrt-users --command="SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';" --remote

echo ""
echo "======================================"
echo "Based on the output above, we need to add:"
echo "1. user_settings table (if not present)"
echo "2. sessions table (if not present)"
echo "3. Missing columns in users table:"
echo "   - two_factor_enabled"
echo "   - two_factor_secret"
echo "   - two_factor_backup_codes"
echo "   - bio"
echo "   - location"
echo "   - website"
echo "======================================"
echo ""
echo "Run the complete-schema.sql migration to add these:"
echo "wrangler d1 execute cybersmrt-users --file=migrations/complete-schema.sql --remote"