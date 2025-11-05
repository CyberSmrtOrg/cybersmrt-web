# Cloudflare Pages Configuration for store.cybersmrt.org

## ✅ Current Setup (Completed)

The store subdomain is now properly configured to serve from the repository root with shared assets.

### Configuration Details

**Cloudflare Pages Settings:**
- **Build output directory**: `.` (repository root)
- **Custom domain**: `store.cybersmrt.org`

**Repository Structure:**
```
cybersmrt-web/
├── _redirects          # Routes store.cybersmrt.org to /store/*
├── _headers            # Sets proper MIME types for assets
├── assets/             # Shared assets for all sites
│   ├── css/
│   ├── js/
│   └── images/
└── store/              # Store HTML pages
    ├── index.html
    └── success.html
```

**Redirect Configuration (`_redirects`):**
```
/success.html /store/success.html 200
/ /store/index.html 200
```

**Headers Configuration (`_headers`):**
```
/assets/css/*.css
  Content-Type: text/css

/assets/js/*.js
  Content-Type: application/javascript
```

## Benefits Achieved

✅ **Single source of truth**: Assets only exist in `/assets` at root level
✅ **No duplication**: Changes to CSS/JS only need to be made once
✅ **Automatic updates**: Store automatically gets latest asset versions
✅ **Easier maintenance**: No manual copying or syncing required
✅ **Proper MIME types**: All assets served with correct Content-Type headers

## How It Works

1. **User visits** `store.cybersmrt.org/`
2. **Cloudflare Pages** serves from repository root (build directory: `.`)
3. **`_redirects` file** routes `/` → `/store/index.html`
4. **HTML page loads** assets from `/assets/*`
5. **`_headers` file** ensures assets have correct MIME types
6. **Store displays** with full functionality

## Maintenance

When updating CSS, JavaScript, or other assets:
1. Edit files in `/assets/` directory only
2. Commit and push changes
3. Cloudflare Pages automatically rebuilds
4. Store receives updates immediately - no manual syncing needed!

## Future Considerations

If you want to migrate the main site (cybersmrt.org) to use similar routing:
- Could use the same approach with a root `index.html` redirect
- Keep all shared assets in `/assets`
- Use `_redirects` to route different subdomains to different directories
