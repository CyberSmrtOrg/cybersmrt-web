#!/bin/bash
# Sync assets from root to store directory
# Run this before deploying to Cloudflare Pages

echo "Syncing assets to store directory..."
mkdir -p store/assets
cp -r assets/* store/assets/
echo "✅ Assets synced successfully"
