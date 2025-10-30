#!/bin/bash
# Script to deploy secrets from .env to Cloudflare Workers
# Usage: ./scripts/deploy-secrets.sh

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

echo "🔐 Deploying secrets to Cloudflare Workers..."

# Auth Worker Secrets
echo ""
echo "📤 Setting Auth Worker secrets..."
cd workers/auth
echo "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY
echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
echo "$GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID
echo "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET
echo "$GITHUB_CLIENT_ID" | npx wrangler secret put GITHUB_CLIENT_ID
echo "$GITHUB_CLIENT_SECRET" | npx wrangler secret put GITHUB_CLIENT_SECRET
echo "$MICROSOFT_CLIENT_ID" | npx wrangler secret put MICROSOFT_CLIENT_ID
echo "$MICROSOFT_CLIENT_SECRET" | npx wrangler secret put MICROSOFT_CLIENT_SECRET
# Apple OAuth is optional - skip if not configured
if [ ! -z "$APPLE_CLIENT_ID" ] && [ "$APPLE_CLIENT_ID" != "your-apple-client-id" ]; then
  echo "$APPLE_CLIENT_ID" | npx wrangler secret put APPLE_CLIENT_ID
  echo "$APPLE_PRIVATE_KEY" | npx wrangler secret put APPLE_PRIVATE_KEY
  echo "  ✓ Apple OAuth configured"
else
  echo "  ⊘ Skipping Apple OAuth (not configured)"
fi
cd ../..

# Profile Worker Secrets
echo ""
echo "📤 Setting Profile Worker secrets..."
cd workers/profile
echo "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY
echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
cd ../..

# API Worker Secrets
echo ""
echo "📤 Setting API Worker secrets..."
cd workers/api
echo "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY
echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
echo "$CLOUDFLARE_IMAGES_TOKEN" | npx wrangler secret put CLOUDFLARE_IMAGES_TOKEN
echo "$TURNSTILE_SECRET_KEY" | npx wrangler secret put TURNSTILE_SECRET_KEY
cd ../..

# QR Proxy Worker Secrets
echo ""
echo "📤 Setting QR Proxy Worker secrets..."
cd workers/qr-proxy
echo "$VIRUSTOTAL_API_KEY" | npx wrangler secret put VIRUSTOTAL_API_KEY
echo "$ADMIN_TOKEN" | npx wrangler secret put ADMIN_TOKEN
cd ../..

echo ""
echo "✅ All secrets deployed successfully!"
