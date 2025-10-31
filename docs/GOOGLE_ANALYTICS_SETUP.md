# Google Analytics Setup Guide

This guide explains how to configure Google Analytics (GA4) for the CyberSmrt website.

## 1. Create Google Analytics Account

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Start measuring" or "Admin" (gear icon)
3. Create an Account with these settings:

### Account Details:
- **Account Name**: "CyberSmrt"
- **Account Data Sharing Settings** (recommended for privacy-focused education site):
  - ✓ **Google products & services** - Required for basic functionality, helps improve Google's tools. Google will NOT use your data for ad personalization or targeting.
  - ✓ **Modeling contributions & business insights** (Optional) - Enables predictions, modeled data, and benchmarking. Your data is aggregated and de-identified before use.
  - ✓ **Technical support** (Recommended) - Allows Google support to access your data when you need help with technical issues.
  - ✗ **Recommendations for your business** (Optional) - Gives Google access to provide insights and recommendations. Not necessary unless you want proactive suggestions.

### Property Setup:
- **Property Name**: "CyberSmrt Website"
- **Reporting Time Zone**: Your timezone
- **Currency**: USD (or your preference)

### Business Information:
- **Industry Category**: "Education" or "Technology"
- **Business Size**: Select appropriate size

### Data Stream (Web):
- **Website URL**: `https://cybersmrt.org`
- **Stream Name**: "CyberSmrt Web"
- **Enhanced Measurement**: ✓ Enable all options:
  - Page views
  - Scrolls
  - Outbound clicks
  - Site search
  - Video engagement
  - File downloads

## 2. Get Your Measurement ID

After creating the data stream, you'll receive a **Measurement ID** in the format: `G-XXXXXXXXXX`

Copy this ID - you'll need it in the next step.

## 3. Configure Environment Variable

1. Open your `.env` file in the project root
2. Find the `GOOGLE_ANALYTICS_ID` line
3. Paste your Measurement ID:

```bash
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

4. Save the file

## 4. Generate Configuration

Run the generation script to create the analytics config file:

```bash
npm run generate:analytics
```

This will create `/assets/js/analytics-config.js` with your Measurement ID.

## 5. Add Analytics to Your HTML Pages

Add these two script tags to the `<head>` section of your HTML pages, **just before the closing `</head>` tag**:

```html
<!-- Google Analytics Configuration (auto-generated from .env) -->
<script src="/assets/js/analytics-config.js"></script>
<script src="/assets/js/analytics.js" defer></script>
```

### Example Integration:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>

  <!-- Your other CSS and meta tags -->

  <!-- Google Analytics (add before closing </head>) -->
  <script src="/assets/js/analytics-config.js"></script>
  <script src="/assets/js/analytics.js" defer></script>
</head>
<body>
  <!-- Page content -->
</body>
</html>
```

## 6. Privacy & Compliance Features

The analytics configuration includes privacy-first features:

- ✓ **IP Anonymization**: All IP addresses are anonymized
- ✓ **Cookie Consent Integration**: Respects cookie consent choices
- ✓ **Do Not Track**: Respects browser DNT settings
- ✓ **Secure Cookies**: SameSite=None;Secure flags
- ✓ **User Privacy**: No tracking without consent

## 7. Custom Event Tracking

You can track custom events using the global `analytics` object:

```javascript
// Track a custom event
window.analytics.trackEvent('button_click', {
  button_name: 'sign_up',
  location: 'hero_section'
});

// Track a page view (useful for SPAs)
window.analytics.trackPageView('/virtual-page', 'Virtual Page Title');

// Set user properties
window.analytics.setUserProperties({
  user_type: 'student',
  program: 'cybersecurity_101'
});
```

## 8. Testing Your Setup

1. After adding the scripts to your HTML, open your website
2. Open browser DevTools (F12) → Console
3. You should see: `Google Analytics: Loaded with ID G-XXXXXXXXXX`
4. Go to Google Analytics → Reports → Realtime
5. You should see your visit appear within a few seconds

## 9. Deployment

### For GitHub Pages or Static Hosting:

Before deploying, always regenerate the config:

```bash
npm run generate:analytics
git add assets/js/analytics-config.js
git commit -m "Update analytics configuration"
git push
```

### For Cloudflare Pages:

Add the `GOOGLE_ANALYTICS_ID` as an environment variable:

1. Go to Cloudflare Pages → Settings → Environment variables
2. Add: `GOOGLE_ANALYTICS_ID` = `G-XXXXXXXXXX`
3. Set up a build command: `npm run build`

## 10. Recommended GA4 Settings

In Google Analytics, configure these settings for optimal privacy and data collection:

### Data Retention:
- Admin → Property Settings → Data Retention
- Set to **14 months** (or 26 months if needed)

### User-ID Feature:
- Admin → Property Settings → Data Collection
- Enable if tracking logged-in users

### Google Signals:
- Admin → Property Settings → Data Collection
- Enable for cross-device tracking (respects user privacy)

### Privacy Settings:
- Admin → Property Settings → Data Settings
- ✓ Enable all recommended privacy settings

## 11. Maintenance

### Updating Your Measurement ID:

1. Edit `.env` file with new ID
2. Run `npm run generate:analytics`
3. Commit and deploy

### Disabling Analytics:

1. Remove the Measurement ID from `.env`:
   ```bash
   GOOGLE_ANALYTICS_ID=
   ```
2. Run `npm run generate:analytics`
3. Analytics will be automatically disabled

## 12. Troubleshooting

### Analytics not loading?

Check browser console for:
- "Google Analytics: No measurement ID configured" - Add ID to `.env`
- "Google Analytics: Disabled due to Do Not Track" - User has DNT enabled
- "Google Analytics: Waiting for cookie consent" - User hasn't accepted cookies

### Not seeing data in GA4?

- Wait 24-48 hours for initial data processing
- Check Realtime reports for immediate validation
- Verify Measurement ID is correct
- Check browser console for errors

## 13. Security Notes

- **Never commit** your `.env` file to git (already in `.gitignore`)
- The `analytics-config.js` file is auto-generated and **should not be committed**
- Measurement IDs are public and safe to expose in client-side code
- All analytics tracking respects user privacy and consent
