#!/bin/bash
# CyberSmrt Workers Startup Script

BASE_DIR=~/projects/cybersmrt/cybersmrt-web/workers

echo "🚀 Starting all CyberSmrt workers..."

# Start each worker on different ports (both HTTP and inspector)
echo "Starting QR Proxy (8787)..."
cd $BASE_DIR/qr-proxy && npx wrangler dev --port 8787 --inspector-port 9229 > /tmp/qr-proxy.log 2>&1 &

echo "Starting Auth (8788)..."
cd $BASE_DIR/auth && npx wrangler dev --port 8788 --inspector-port 9230 > /tmp/auth.log 2>&1 &

echo "Starting API (8789)..."
cd $BASE_DIR/api && npx wrangler dev --port 8789 --inspector-port 9231 > /tmp/api.log 2>&1 &

echo "Starting Store API (8790)..."
cd $BASE_DIR/store-api && npx wrangler dev --port 8790 --inspector-port 9232 > /tmp/store-api.log 2>&1 &

echo "Starting Profile (8791)..."
cd $BASE_DIR/profile && npx wrangler dev --port 8791 --inspector-port 9233 > /tmp/profile.log 2>&1 &

echo "Starting Admin (8792)..."
cd $BASE_DIR/admin && npx wrangler dev --port 8792 --inspector-port 9234 > /tmp/admin.log 2>&1 &

sleep 5

echo ""
echo "✅ All workers started!"
echo ""
echo "📊 Worker Status:"
echo "  QR Proxy:   http://localhost:8787"
echo "  Auth:       http://localhost:8788"
echo "  API:        http://localhost:8789"
echo "  Store API:  http://localhost:8790"
echo "  Profile:    http://localhost:8791"
echo "  Admin:      http://localhost:8792"
echo ""
echo "📝 Check logs: tail -f /tmp/profile.log"
echo "🛑 Stop all: pkill -f wrangler"
