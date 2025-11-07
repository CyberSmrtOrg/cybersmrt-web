#!/bin/bash

# Setup Development and Testing Environments for CyberSmrt
# This script creates the necessary databases and KV namespaces for dev/test environments

set -e

echo "🚀 Setting up CyberSmrt Development and Testing Environments"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Creating Development Database${NC}"
echo "Running: npx wrangler d1 create cybersmrt-store-dev"
DEV_DB_OUTPUT=$(npx wrangler d1 create cybersmrt-store-dev 2>&1)
echo "$DEV_DB_OUTPUT"

# Extract database ID from output
DEV_DB_ID=$(echo "$DEV_DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -z "$DEV_DB_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-extract dev database ID. Please copy it manually from output above.${NC}"
else
    echo -e "${GREEN}✅ Dev Database ID: $DEV_DB_ID${NC}"
fi

echo ""
echo -e "${BLUE}📦 Step 2: Creating Testing Database${NC}"
echo "Running: npx wrangler d1 create cybersmrt-store-test"
TEST_DB_OUTPUT=$(npx wrangler d1 create cybersmrt-store-test 2>&1)
echo "$TEST_DB_OUTPUT"

# Extract database ID from output
TEST_DB_ID=$(echo "$TEST_DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -z "$TEST_DB_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-extract test database ID. Please copy it manually from output above.${NC}"
else
    echo -e "${GREEN}✅ Test Database ID: $TEST_DB_ID${NC}"
fi

echo ""
echo -e "${BLUE}📦 Step 3: Creating Development KV Namespace${NC}"
echo "Running: npx wrangler kv:namespace create PRODUCT_CACHE --env development"
cd workers/store-api
DEV_KV_OUTPUT=$(npx wrangler kv:namespace create PRODUCT_CACHE --env development 2>&1)
echo "$DEV_KV_OUTPUT"

# Extract KV ID from output
DEV_KV_ID=$(echo "$DEV_KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -z "$DEV_KV_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-extract dev KV ID. Please copy it manually from output above.${NC}"
else
    echo -e "${GREEN}✅ Dev KV ID: $DEV_KV_ID${NC}"
fi

echo ""
echo -e "${BLUE}📦 Step 4: Creating Testing KV Namespace${NC}"
echo "Running: npx wrangler kv:namespace create PRODUCT_CACHE --env testing"
TEST_KV_OUTPUT=$(npx wrangler kv:namespace create PRODUCT_CACHE --env testing 2>&1)
echo "$TEST_KV_OUTPUT"

# Extract KV ID from output
TEST_KV_ID=$(echo "$TEST_KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -z "$TEST_KV_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-extract test KV ID. Please copy it manually from output above.${NC}"
else
    echo -e "${GREEN}✅ Test KV ID: $TEST_KV_ID${NC}"
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Resource creation complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Update workers/store-api/wrangler.toml with the IDs above:"
echo ""

if [ -n "$DEV_DB_ID" ]; then
    echo "   # Development Database"
    echo "   [[env.development.d1_databases]]"
    echo "   binding = \"DB\""
    echo "   database_name = \"cybersmrt-store-dev\""
    echo "   database_id = \"$DEV_DB_ID\""
    echo ""
fi

if [ -n "$DEV_KV_ID" ]; then
    echo "   # Development KV"
    echo "   [[env.development.kv_namespaces]]"
    echo "   binding = \"PRODUCT_CACHE\""
    echo "   id = \"$DEV_KV_ID\""
    echo ""
fi

if [ -n "$TEST_DB_ID" ]; then
    echo "   # Testing Database"
    echo "   [[env.testing.d1_databases]]"
    echo "   binding = \"DB\""
    echo "   database_name = \"cybersmrt-store-test\""
    echo "   database_id = \"$TEST_DB_ID\""
    echo ""
fi

if [ -n "$TEST_KV_ID" ]; then
    echo "   # Testing KV"
    echo "   [[env.testing.kv_namespaces]]"
    echo "   binding = \"PRODUCT_CACHE\""
    echo "   id = \"$TEST_KV_ID\""
    echo ""
fi

echo "2. Run database migrations for each environment:"
echo "   npx wrangler d1 execute cybersmrt-store-dev --file=migrations/001_initial.sql"
echo "   npx wrangler d1 execute cybersmrt-store-test --file=migrations/001_initial.sql"
echo ""

echo "3. Set up secrets for dev environment:"
echo "   cd workers/store-api"
echo "   npx wrangler secret put STRIPE_SECRET_KEY --env development"
echo "   npx wrangler secret put PRINTIFY_API_KEY --env development"
echo "   npx wrangler secret put RESEND_API_KEY --env development"
echo "   npx wrangler secret put STRIPE_WEBHOOK_SECRET --env development"
echo ""

echo "4. Set up secrets for test environment:"
echo "   npx wrangler secret put STRIPE_SECRET_KEY --env testing"
echo "   npx wrangler secret put PRINTIFY_API_KEY --env testing"
echo "   npx wrangler secret put RESEND_API_KEY --env testing"
echo "   npx wrangler secret put STRIPE_WEBHOOK_SECRET --env testing"
echo ""

echo "5. Test deployment:"
echo "   npx wrangler deploy --env development"
echo "   npx wrangler deploy --env testing"
echo ""

echo -e "${GREEN}🎉 Setup complete! See ENVIRONMENTS.md for full documentation.${NC}"
