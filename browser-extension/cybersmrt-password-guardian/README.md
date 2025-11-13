# CyberSmrt Password Guardian

A browser extension that provides real-time password security analysis and breach checking on any website. Helps you create strong, secure passwords with privacy-preserving technology.

## Features

- **Real-Time Strength Analysis**: Instant feedback as you type with visual strength meter
- **Breach Database Checking**: Checks against 613+ million compromised passwords from Have I Been Pwned
- **Privacy-Preserving**: Uses k-Anonymity model - your password never leaves your device
- **Smart Visual Feedback**: Color-coded strength indicators and breach warnings
- **Universal Compatibility**: Works on any website with password fields
- **Non-Intrusive**: Clean, minimal design that doesn't interfere with website functionality
- **Dark Mode Support**: Automatically adapts to your browser's theme

## How It Works

1. **Automatic Detection**: The extension automatically detects password fields on any webpage
2. **Strength Analysis**: As you type, it analyzes password strength based on:
   - Length (12+ characters recommended)
   - Character variety (uppercase, lowercase, numbers, special characters)
   - Common patterns (detects weak patterns like "password123")
3. **Breach Checking**: After a short delay, it checks if the password appears in known data breaches using the k-Anonymity model:
   - Your password is hashed locally using SHA-1
   - Only the first 5 characters of the hash are sent to the API
   - The service returns ~800-1000 possible matches
   - Your browser compares locally to find matches
   - **Result**: Nobody ever knows which specific password you checked

## Installation

### Chrome/Edge (Developer Mode)

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `cybersmrt-password-guardian` folder
6. The extension is now installed!

### Firefox (Temporary Installation)

1. Download or clone this repository
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `cybersmrt-password-guardian` folder and select `manifest.json`
5. The extension is now installed temporarily (will persist until Firefox restart)

**Note**: For permanent Firefox installation, the extension needs to be signed by Mozilla.

## Usage

### Automatic Mode

Once installed, the extension works automatically:

1. Visit any website with a password field (signup forms, password change pages, etc.)
2. Click on the password field and start typing
3. A feedback widget will appear below the field showing:
   - Visual strength meter (red to green)
   - Strength rating (Very Weak to Very Strong)
   - Breach status (checking, safe, or compromised)
4. The widget disappears when you click away

### Extension Popup

Click the extension icon in your browser toolbar to:

- Enable/disable the extension
- View statistics (fields protected, breaches detected)
- Access the full password checker tool on CyberSmrt.org

## Privacy & Security

- ✅ **Zero data collection**: We don't collect, store, or transmit your passwords
- ✅ **Client-side only**: All password hashing happens in your browser
- ✅ **k-Anonymity model**: Only 5 characters of your password hash are sent to the API
- ✅ **HTTPS only**: All API requests use secure connections
- ✅ **No tracking**: No analytics, cookies, or user tracking
- ✅ **Open source**: Review the code yourself

## Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 89+ (with minor modifications)
- ✅ Brave (Chromium-based)
- ✅ Opera (Chromium-based)

## Screenshots

### In-Action Example
When you type in a password field, the extension shows real-time feedback:

```
┌──────────────────────────────────────┐
│ Password Strength: Strong            │
│ ████████████████░░░░ 80%            │
│ ✅ Not found in breach databases     │
│ 🛡️ CyberSmrt Guardian               │
└──────────────────────────────────────┘
```

### Breach Detection Example
If a password has been compromised:

```
┌──────────────────────────────────────┐
│ Password Strength: Fair              │
│ ████████░░░░░░░░░░░░ 40%            │
│ ⚠️ Found in 12,453 breaches -       │
│    DO NOT USE                        │
│ 🛡️ CyberSmrt Guardian               │
└──────────────────────────────────────┘
```

## Development

### File Structure

```
cybersmrt-password-guardian/
├── manifest.json           # Extension configuration
├── popup.html             # Extension popup UI
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── css/
│   └── password-guardian.css  # Widget styles
└── js/
    ├── content.js         # Main content script
    ├── background.js      # Background service worker
    └── popup.js          # Popup interactions
```

### Building from Source

No build process required! This is a pure JavaScript extension with no dependencies.

### Testing

1. Install the extension in developer mode
2. Visit test sites with password fields:
   - Gmail signup: https://accounts.google.com/signup
   - Twitter signup: https://twitter.com/signup
   - Any site with password reset forms
3. Check console logs for debugging: `[CyberSmrt]` prefix

## Roadmap

- [ ] Password generator with one-click insertion
- [ ] Sync settings across devices
- [ ] Custom strength requirements per-site
- [ ] Passwordless authentication suggestions
- [ ] Password health dashboard
- [ ] Browser password manager integration
- [ ] Multi-language support
- [ ] Firefox Add-ons store submission
- [ ] Chrome Web Store submission

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- Website: https://cybersmrt.org
- Issues: https://github.com/CyberSmrtOrg/cybersmrt-web/issues
- Email: support@cybersmrt.org

## Credits

- Built by CyberSmrt
- Breach data provided by [Have I Been Pwned](https://haveibeenpwned.com/)
- k-Anonymity model designed by Troy Hunt

## Disclaimer

This extension is provided as-is for educational and security purposes. While we take security seriously and use industry-standard practices, no system is 100% secure. Always use unique passwords and enable two-factor authentication where available.

---

🛡️ **Stay safe online with CyberSmrt Password Guardian**
