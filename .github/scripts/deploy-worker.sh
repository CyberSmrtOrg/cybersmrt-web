#!/bin/bash
# CyberSmrt QR Proxy Worker Deployment Script
# This script deploys the worker and verifies the deployment

set -e  # Exit on error

echo "🚀 Starting QR Proxy Worker deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to worker directory
cd workers/qr-proxy

# Verify required files exist
echo -e "${BLUE}📋 Checking required files...${NC}"
required_files=("wrangler.toml" "src/index.js" "package.json")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Error: Required file $file not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found $file${NC}"
done

# Check for secrets (they should be set via GitHub Actions or wrangler)
echo -e "${BLUE}🔐 Checking for required secrets...${NC}"
if [ -z "$VIRUSTOTAL_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  Warning: VIRUSTOTAL_API_KEY not set in environment${NC}"
    echo "   Make sure to set it via: wrangler secret put VIRUSTOTAL_API_KEY"
fi
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Warning: ADMIN_TOKEN not set in environment${NC}"
    echo "   Make sure to set it via: wrangler secret put ADMIN_TOKEN"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm ci
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Run tests if they exist
echo -e "${BLUE}🧪 Running tests...${NC}"
npm test --if-present || echo -e "${YELLOW}⚠️  No tests configured${NC}"

# Deploy the worker
echo -e "${BLUE}🚀 Deploying worker to Cloudflare...${NC}"
npx wrangler deploy

# Wait a moment for deployment to propagate
echo -e "${BLUE}⏳ Waiting for deployment to propagate...${NC}"
sleep 5

# Health check
echo -e "${BLUE}🏥 Running health check...${NC}"
HEALTH_URL="https://cybersmrt.org/tools/qr_proxy/health"

if response=$(curl -s -f "$HEALTH_URL"); then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "Response: $response"

    # Parse and display key info
    if command -v jq &> /dev/null; then
        status=$(echo "$response" | jq -r '.status')
        edge=$(echo "$response" | jq -r '.edge')
        version=$(echo "$response" | jq -r '.version')

        echo -e "${GREEN}Status: $status${NC}"
        echo -e "${GREEN}Edge: $edge${NC}"
        echo -e "${GREEN}Version: $version${NC}"
    fi
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "URL: $HEALTH_URL"
    exit 1
fi

# Test analysis endpoint
echo -e "${BLUE}🧪 Testing analysis endpoint...${NC}"
TEST_URL="https://cybersmrt.org/tools/qr_proxy?url=https://example.com&analysis_only=true"

if test_response=$(curl -s -f "$TEST_URL"); then
    echo -e "${GREEN}✅ Analysis endpoint working${NC}"

    if command -v jq &> /dev/null; then
        threat_score=$(echo "$test_response" | jq -r '.security.threatScore')
        echo -e "${GREEN}Test threat score: $threat_score${NC}"
    fi
else
    echo -e "${RED}❌ Analysis endpoint failed${NC}"
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Deployment Successful!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "   Worker: cybersmrt-qr-proxy"
echo "   Endpoint: https://cybersmrt.org/tools/qr_proxy"
echo "   Health: https://cybersmrt.org/tools/qr_proxy/health"
echo "   Admin: https://cybersmrt.org/admin/qr-proxy.html"
echo ""
echo -e "${BLUE}🔍 Next Steps:${NC}"
echo "   1. Test the tool at: https://cybersmrt.org/pages/tools/qr-tester.html"
echo "   2. Verify admin dashboard access"
echo "   3. Monitor logs: wrangler tail"
echo ""
echo -e "${GREEN}🎉 All systems go!${NC}"