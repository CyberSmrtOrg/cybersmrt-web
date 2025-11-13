# Installation Guide - CyberSmrt Password Guardian

## Quick Start (5 minutes)

### Step 1: Get the Extension Files

**Option A: Download ZIP**
1. Go to the GitHub repository
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to a location you'll remember (e.g., `Documents/Extensions/`)

**Option B: Git Clone**
```bash
git clone https://github.com/CyberSmrtOrg/cybersmrt-web.git
cd cybersmrt-web/browser-extension/cybersmrt-password-guardian
```

### Step 2: Create Icon Files

The extension needs PNG icons. You can:

**Quick Option**: Use any 128x128 image temporarily:
1. Find any PNG image (or convert the SVG)
2. Resize to 128x128, 48x48, and 16x16 pixels
3. Save as `icon128.png`, `icon48.png`, `icon16.png` in the `icons/` folder

**Proper Option**: Convert the SVG to PNG:
```bash
# Using ImageMagick or online tools like:
# https://cloudconvert.com/svg-to-png

# Create all three sizes from icon.svg:
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### Step 3: Install in Your Browser

#### Chrome / Edge / Brave / Opera

1. **Open Extensions Page**
   - Chrome: Visit `chrome://extensions/`
   - Edge: Visit `edge://extensions/`
   - Brave: Visit `brave://extensions/`
   - Opera: Visit `opera://extensions/`

2. **Enable Developer Mode**
   - Look for a toggle in the top-right corner
   - Turn it ON

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to the `cybersmrt-password-guardian` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "CyberSmrt Password Guardian" in your extensions list
   - The shield icon should appear in your toolbar
   - Status should show "Enabled"

#### Firefox

1. **Open Debugging Page**
   - Visit `about:debugging#/runtime/this-firefox`

2. **Load Temporary Add-on**
   - Click "Load Temporary Add-on..."
   - Navigate to the `cybersmrt-password-guardian` folder
   - Select the `manifest.json` file
   - Click "Open"

3. **Verify Installation**
   - The extension should appear in the list
   - The shield icon should appear in your toolbar

**Note**: Firefox temporary installations are removed when you restart the browser. For permanent installation, you need to submit the extension to Mozilla Add-ons store (requires signing).

### Step 4: Test the Extension

1. **Visit a test site**:
   - Gmail signup: https://accounts.google.com/signup
   - Twitter signup: https://twitter.com/signup
   - Or our test page: https://cybersmrt.org/tools/password-checker.html

2. **Click a password field** and start typing

3. **You should see**:
   - A feedback widget appears below the password field
   - Real-time strength meter (colored bar)
   - Strength rating text
   - Breach check status

4. **Try these test passwords**:
   - `password123` - Should show as compromised
   - `MyS3cur3P@ssw0rd!2024` - Should show as strong and safe
   - `abc` - Should show as very weak

### Troubleshooting

#### Widget Not Appearing

**Check 1**: Is the extension enabled?
- Click the extension icon in your toolbar
- Verify the toggle is ON
- Check that "Fields Protected" counter is incrementing

**Check 2**: Console errors?
- Press F12 to open Developer Tools
- Look in the Console tab for `[CyberSmrt]` messages
- Should see: `[CyberSmrt] Password Guardian initialized`

**Check 3**: Is it a password field?
- The extension only works on `<input type="password">` fields
- Some sites use custom input elements - these may not be detected

#### API Errors

**Problem**: "Failed to check breach database"

**Solutions**:
1. Check your internet connection
2. Verify the API is accessible: https://api.pwnedpasswords.com/range/21BD1
3. Check if your firewall/antivirus is blocking API requests
4. Try disabling browser extensions that might interfere (ad blockers, privacy tools)

#### Positioning Issues

**Problem**: Widget appears in wrong location or off-screen

**Solutions**:
1. Scroll the page - the widget should reposition automatically
2. Some websites use complex CSS that may interfere
3. Try disabling other extensions that modify page layout

### Uninstallation

#### Chrome / Edge / Brave / Opera
1. Go to extensions page (`chrome://extensions/`)
2. Find "CyberSmrt Password Guardian"
3. Click "Remove"
4. Confirm removal

#### Firefox
1. Go to Add-ons page (`about:addons`)
2. Find "CyberSmrt Password Guardian"
3. Click the "..." menu
4. Select "Remove"

### Next Steps

Once installed, the extension works automatically. You can:

- **Customize settings**: Click the extension icon for options
- **View statistics**: See how many fields you've protected
- **Use the full tool**: Visit https://cybersmrt.org/tools/password-checker.html

### Getting Help

- **Issues**: https://github.com/CyberSmrtOrg/cybersmrt-web/issues
- **Email**: support@cybersmrt.org
- **Website**: https://cybersmrt.org

---

## Advanced: Publishing to Chrome Web Store

If you want to publish this extension officially:

1. **Prepare for submission**:
   - Create high-quality PNG icons (all sizes)
   - Add screenshots and promotional images
   - Write detailed description
   - Set up privacy policy page

2. **Chrome Web Store**:
   - Create developer account ($5 one-time fee)
   - Visit: https://chrome.google.com/webstore/devconsole
   - Click "New Item"
   - Upload ZIP of extension folder
   - Fill out store listing
   - Submit for review (typically 1-3 days)

3. **Firefox Add-ons**:
   - Create developer account (free)
   - Visit: https://addons.mozilla.org/developers/
   - Submit new add-on
   - Upload ZIP and fill out details
   - Submit for review (typically 1-7 days)

4. **Edge Add-ons**:
   - Create developer account ($9 one-time fee)
   - Visit: https://partner.microsoft.com/dashboard/microsoftedge/overview
   - Submit new extension
   - Similar process to Chrome

---

🛡️ **Enjoy safer passwords with CyberSmrt Password Guardian!**
