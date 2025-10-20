#!/bin/bash

# Apply all migrations to D1 database
# Usage: ./apply-all.sh [local|remote]

ENVIRONMENT=${1:-local}
DB_NAME="cybersmrt-users"

echo "🗄️  Applying migrations to D1 database: $DB_NAME ($ENVIRONMENT)"
echo "================================================"

# Array of migration files in order
MIGRATIONS=(
    "0001_create_users_table.sql"
    "0002_create_oauth_providers_table.sql"
    "0003_create_sessions_table.sql"
    "0004_create_verification_tables.sql"
    "0005_create_security_logs_table.sql"
    "0006_create_user_profiles_table.sql"
)

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Apply each migration
for migration in "${MIGRATIONS[@]}"; do
    echo ""
    echo "📝 Applying migration: $migration"

    if [ "$ENVIRONMENT" == "local" ]; then
        # Apply to local dev database
        npx wrangler d1 execute $DB_NAME --local --file="$SCRIPT_DIR/$migration"
    else
        # Apply to remote production database
        npx wrangler d1 execute $DB_NAME --remote --file="$SCRIPT_DIR/$migration"
    fi

    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully"
    else
        echo "❌ Migration failed!"
        exit 1
    fi
done

echo ""
echo "================================================"
echo "✅ All migrations applied successfully!"
echo ""
echo "📊 View database:"
if [ "$ENVIRONMENT" == "local" ]; then
    echo "   npx wrangler d1 execute $DB_NAME --local --command='SELECT name FROM sqlite_master WHERE type=\"table\"'"
else
    echo "   npx wrangler d1 execute $DB_NAME --remote --command='SELECT name FROM sqlite_master WHERE type=\"table\"'"
fi