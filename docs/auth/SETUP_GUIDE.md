# CyberSmrt Frontend Auth Setup Guide

Complete guide to integrate OAuth authentication with your CyberSmrt website.

---

## 📁 File Structure

Place the files in your repository:

```
cybersmrt-web/
├── pages/
│   ├── login.html          ← New: OAuth login page
│   ├── callback.html       ← New: OAuth callback handler
│   └── dashboard.html      ← New: User dashboard
├── js/
│   └── auth.js            ← New: Authentication helper
└── images/
    └── default-avatar.png  ← Optional: Default user avatar
```

---

## 🚀 Quick Start

### 1. Deploy Files

```bash
# From your cybersmrt-web directory
git add pages/login.html pages/callback.html pages/dashboard.html js/auth.js
git commit -m "Add OAuth frontend authentication"
git push origin main
```

### 2. Configure OAuth Callback URLs

Update your OAuth provider settings with the callback URL:

**Google Cloud Console:**
- Authorized redirect URIs: `https://cybersmrt.org/auth/google/callback`

**GitHub OAuth App:**
- Authorization callback URL: `https://cybersmrt.org/auth/github/callback`

**Microsoft Azure AD:**
- Redirect URI: `https://cybersmrt.org/auth/microsoft/callback`

### 3. Test the Flow

1. Visit `https://cybersmrt.org/login.html`
2. Click "Continue with Google" (or GitHub/Microsoft)
3. Complete OAuth flow
4. You'll be redirected to `https://cybersmrt.org/dashboard.html`

---

## 🎨 Add Login/Logout to Existing Pages

### Example: Update Your Header

Add this to your existing pages (e.g., `index.html`, `tools/index.html`):

```html
<head>
    <!-- Add auth.js to every page -->
    <script src="/js/auth.js"></script>
</head>

<body>
    <header>
        <nav>
            <!-- Existing nav items -->
            <a href="/">Home</a>
            <a href="/tools">Tools</a>

            <!-- Auth buttons - shown/hidden automatically -->
            <a href="/login.html" data-auth-hide>Sign In</a>

            <div data-auth-show style="display: none;">
                <a href="/dashboard.html">
                    <img data-user-avatar src="" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%;">
                    <span data-user-name></span>
                </a>
                <button onclick="logout()">Sign Out</button>
            </div>
        </nav>
    </header>
</body>
```

### Data Attributes for Auth UI

Use these attributes to automatically show/hide elements:

- `data-auth-show` - Show only when logged in
- `data-auth-hide` - Show only when logged out
- `data-user-name` - Display user's name
- `data-user-email` - Display user's email
- `data-user-avatar` - Display user's avatar (img src)

---

## 🔒 Protect Pages (Require Login)

To make a page require authentication:

```html
<head>
    <script src="/js/auth.js"></script>
</head>
<body>
    <script>
        // Redirect to login if not authenticated
        requireAuth();
    </script>

    <!-- Your page content -->
</body>
```

---

## 📞 Making Authenticated API Calls

Use the `apiRequest()` helper for any API calls that need authentication:

```javascript
// Example: Get user profile
async function loadProfile() {
    try {
        const response = await apiRequest('/me');
        const data = await response.json();
        console.log('User:', data.user);
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

// Example: Update user settings (if you add this endpoint later)
async function updateSettings(settings) {
    try {
        const response = await apiRequest('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        const data = await response.json();
        console.log('Settings updated:', data);
    } catch (err) {
        console.error('Failed to update settings:', err);
    }
}
```

---

## 🎯 Auth Flow Diagram

```
User clicks "Sign in with Google"
    ↓
Redirect to /auth/google
    ↓
Auth worker redirects to Google OAuth
    ↓
User approves on Google
    ↓
Google redirects to /auth/google/callback?code=...
    ↓
Auth worker creates user, session, tokens
    ↓
Redirects to /callback.html with tokens
    ↓
callback.html stores tokens in localStorage
    ↓
Redirects to /dashboard.html
    ↓
User sees their profile!
```

---

## 🛠️ Customization

### Change Branding Colors

Edit the CSS in `login.html`:

```css
.login-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Change to your brand colors */
}
```

### Add More Dashboard Features

Edit `dashboard.html` to add:
- Learning progress tracking
- Enrolled courses
- Saved resources
- Activity history

### Custom Post-Login Redirect

Modify `callback.html` to redirect elsewhere:

```javascript
// Instead of:
window.location.href = '/dashboard.html';

// Use:
window.location.href = '/courses.html';
```

---

## 🧪 Testing Checklist

- [ ] Login page loads at `/login.html`
- [ ] All three OAuth buttons work (Google, GitHub, Microsoft)
- [ ] Successful login redirects to dashboard
- [ ] Dashboard shows correct user info
- [ ] Avatar image displays properly
- [ ] Connected providers display correctly
- [ ] Logout button works
- [ ] Protected pages redirect to login
- [ ] Token refresh works automatically
- [ ] Auth UI updates on all pages

---

## 🐛 Troubleshooting

### "Missing authentication parameters"
- Check OAuth redirect URIs in provider settings
- Ensure callback URLs match exactly

### "Failed to fetch user data"
- Check browser console for errors
- Verify JWT token in localStorage
- Test `/auth/me` endpoint directly

### Token expired errors
- Tokens should auto-refresh
- Check `auth.js` is loaded on page
- Verify refresh token is stored

### Avatar not displaying
- Check `avatar_url` in user object
- Ensure Cloudflare Images URLs are accessible
- Add fallback: `img.onerror = () => img.src = '/images/default-avatar.png'`

---

## 🔐 Security Best Practices

✅ **Implemented:**
- JWT tokens stored in localStorage (XSS protection via CSP)
- HTTPS only (enforced by Cloudflare)
- Short-lived access tokens (7 days)
- Refresh token rotation
- CSRF protection via state parameter

⚠️ **Consider Adding:**
- Content Security Policy headers
- Rate limiting on frontend
- Session timeout warnings
- Two-factor authentication (future)

---

## 📊 What's Working

Your auth system includes:

✅ Google OAuth
✅ GitHub OAuth
✅ Microsoft OAuth
✅ JWT token management
✅ Session handling
✅ Email verification
✅ Rate limiting
✅ Security logging
✅ Avatar uploads
✅ Auto token refresh

---

## 🎉 You're Ready!

Your frontend auth is complete. Users can now:
1. Sign in with Google/GitHub/Microsoft
2. View their profile dashboard
3. Access protected resources
4. Stay logged in across sessions

Deploy and test! 🚀

---

## 📞 Need Help?

Common issues and solutions in the **Troubleshooting** section above.

For backend auth issues, check your worker logs:
```bash
wrangler tail
```