#!/bin/bash

# Sync store header from main header with URL updates
# This script copies partials/header.html to store/partials/header.html
# and updates relative URLs to point to the main site (https://cybersmrt.org)

set -e

echo "🔄 Syncing store header from main header..."

# Source and destination files
SOURCE_HEADER="partials/header.html"
DEST_HEADER="store/partials/header.html"

# Check if source file exists
if [ ! -f "$SOURCE_HEADER" ]; then
  echo "❌ Error: Source header file not found: $SOURCE_HEADER"
  exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$(dirname "$DEST_HEADER")"

# Copy the header
cp "$SOURCE_HEADER" "$DEST_HEADER"
echo "✅ Copied header to store/partials/"

# Update URLs using sed
echo "🔧 Updating URLs to point to main site..."

# Update relative URLs to absolute URLs for main site
# Keep store-specific URLs (like /my-purchases, /order-lookup) as relative
sed -i 's|href="/"|href="https://cybersmrt.org/"|g' "$DEST_HEADER"
sed -i 's|href="/programs"|href="https://cybersmrt.org/programs"|g' "$DEST_HEADER"
sed -i 's|href="/blog"|href="https://cybersmrt.org/blog"|g' "$DEST_HEADER"
sed -i 's|href="/tools"|href="https://cybersmrt.org/tools"|g' "$DEST_HEADER"
sed -i 's|href="/about"|href="https://cybersmrt.org/about"|g' "$DEST_HEADER"
sed -i 's|href="/pages/|href="https://cybersmrt.org/pages/|g' "$DEST_HEADER"
sed -i 's|href="/profile"|href="https://cybersmrt.org/profile"|g' "$DEST_HEADER"
sed -i 's|href="/progress"|href="https://cybersmrt.org/progress"|g' "$DEST_HEADER"
sed -i 's|href="/certificates"|href="https://cybersmrt.org/certificates"|g' "$DEST_HEADER"
sed -i 's|href="/activity"|href="https://cybersmrt.org/activity"|g' "$DEST_HEADER"
sed -i 's|href="/achievements"|href="https://cybersmrt.org/achievements"|g' "$DEST_HEADER"
sed -i 's|href="/#|href="https://cybersmrt.org/#|g' "$DEST_HEADER"

# Keep these as relative URLs (store-specific)
# /my-purchases, /order-lookup - these should stay as-is

# Store link should point to store subdomain
sed -i 's|href="https://cybersmrt.org/store"|href="https://store.cybersmrt.org"|g' "$DEST_HEADER"

echo "✅ URLs updated successfully"
echo "🎉 Store header sync complete!"
