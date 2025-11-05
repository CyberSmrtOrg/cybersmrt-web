# Cloudflare Pages Configuration for store.cybersmrt.org

## Current Setup Issue
The store subdomain currently has duplicate asset files that need to be manually synced with root assets, which is maintenance-heavy and error-prone.

## Required Configuration Change

To fix this, you need to update the Cloudflare Pages project settings in the dashboard:

### Steps:

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → Select your Pages project for `store.cybersmrt.org`

2. Go to **Settings** → **Build configuration**

3. Update these settings:
   - **Build output directory**: Change from `/store` to `.` (root directory)
   - This allows Pages to serve from the entire repository root

4. The `_redirects` file in `/store` will handle routing:
   - Routes `/` to `/store/index.html`
   - Routes `/success.html` to `/store/success.html`
   - Allows `/assets/*` to be served from the root `/assets` directory

5. The `_headers` file ensures proper MIME types for all assets

## Benefits

✅ **Single source of truth**: Assets only exist in `/assets` at root level
✅ **No duplication**: Changes to CSS/JS only need to be made once
✅ **Automatic updates**: Store automatically gets latest asset versions
✅ **Easier maintenance**: No manual copying or syncing required

## Alternative: If You Can't Change Build Directory

If you need to keep the build directory as `/store`, you have two options:

### Option A: Manual Sync Script
Create a build script that copies assets before deployment:
```bash
#!/bin/bash
mkdir -p store/assets
cp -r assets/* store/assets/
```

### Option B: Symbolic Links (Git doesn't support well)
Not recommended as Git doesn't handle symlinks consistently across platforms.

## Recommended: Use Root Build Directory
The root build directory approach (described above) is the cleanest and most maintainable solution.
