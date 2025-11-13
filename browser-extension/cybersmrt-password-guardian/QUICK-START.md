# Quick Start - CyberSmrt Password Guardian

## Generate PNG Icons (Required)

### Option 1: Use the HTML Generator (Easiest)

1. Open `icons/generate-icons.html` in your browser
2. Click each download button to save:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)
3. Save all three files in the `icons/` folder

### Option 2: Use Online Converter

1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icons/icon.svg`
3. Convert to PNG at sizes: 16x16, 48x48, 128x128
4. Download and rename as: `icon16.png`, `icon48.png`, `icon128.png`

### Option 3: Command Line (ImageMagick)

```bash
cd icons/
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

---

## Install Extension

### Chrome / Edge / Brave

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `cybersmrt-password-guardian` folder
5. Done! The extension is now active

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the extension folder
4. Done! (Note: Will be removed on Firefox restart)

---

## Test the Extension

### Quick Test

1. Visit https://accounts.google.com/signup
2. Click the password field
3. Type: `password123`
4. You should see:
   ```
   ┌─────────────────────────────────┐
   │ ████░░░░░░░░░░░░ 20%           │
   │ Password Strength: Weak        │
   │ ⚠️ Found in 2,417,386 breaches │
   │ 🛡️ CyberSmrt Guardian          │
   └─────────────────────────────────┘
   ```

### Test Strong Password

1. Type: `MyS3cur3P@ssw0rd!2024XYZ`
2. You should see:
   ```
   ┌─────────────────────────────────┐
   │ ████████████████████ 100%      │
   │ Password Strength: Very Strong │
   │ ✅ Not found in breaches       │
   │ 🛡️ CyberSmrt Guardian          │
   └─────────────────────────────────┘
   ```

---

## Verify It's Working

**Check Extension Popup:**
- Click the extension icon in your toolbar
- Should show "Extension Enabled" toggle
- Should show "Fields Protected: X" counter incrementing

**Check Console:**
- Press F12 on any page with password fields
- Look for: `[CyberSmrt] Password Guardian initialized`
- Look for: `[CyberSmrt] Monitoring password field:`

---

## Troubleshooting

### Widget Not Appearing?

1. Verify extension is enabled in `chrome://extensions/`
2. Check that PNG icons exist in `icons/` folder
3. Refresh the page you're testing on
4. Check browser console for errors (F12)

### "Extension failed to load"?

- **Missing icons**: Make sure all three PNG files exist
- **Wrong folder**: Select the folder containing `manifest.json`
- **Browser compatibility**: Use Chrome 88+, Edge 88+, or Firefox 89+

### API Errors?

- Check internet connection
- Visit https://api.pwnedpasswords.com/range/21BD1 to verify API is accessible
- Disable ad blockers/privacy tools that might block API requests

---

## Features to Try

1. **Real-time Strength**: Type slowly and watch strength meter update
2. **Breach Checking**: Wait 1 second after typing to see breach results
3. **Common Passwords**: Try "password", "123456", "qwerty" - all compromised
4. **Strong Passwords**: Use 16+ chars with mixed case, numbers, symbols
5. **Multiple Fields**: Open multiple tabs - extension monitors all password fields

---

## Next Steps

- Read full [README.md](README.md) for detailed documentation
- See [INSTALL.md](INSTALL.md) for advanced installation options
- Test on various websites (Gmail, Twitter, GitHub, banking sites)
- Check statistics in extension popup
- Consider publishing to Chrome Web Store (see README)

---

## Support

- **Issues**: https://github.com/CyberSmrtOrg/cybersmrt-web/issues
- **Email**: support@cybersmrt.org
- **Website**: https://cybersmrt.org

---

🛡️ **Stay safe online with CyberSmrt Password Guardian!**
