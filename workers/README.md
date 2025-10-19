# CyberSmrt QR Code Security Tester

Free QR code security analysis tool for underserved communities, schools, and nonprofits.

## What It Does
- Scans QR codes via camera or upload
- Analyzes URLs for phishing/malware (VirusTotal + heuristics)
- Provides sandboxed preview
- Blocks known malicious domains
- Educational content included

## Live URLs
- **Tool:** https://cybersmrt.org/pages/tools/qr-tester.html
- **Admin:** https://cybersmrt.org/admin/qr-proxy.html
- **Demo:** https://cybersmrt.org/pages/qr-gotcha.html

## Architecture
- **Frontend:** Static HTML/JS (camera scanning, image upload)
- **Backend:** Cloudflare Worker (security analysis)
- **Threat Intel:** VirusTotal API + heuristic patterns
- **Storage:** Cloudflare KV (blocked domains)
- **Deployment:** GitHub Actions

## For CyberSmrt Staff
See `docs/QR-TOOL-OPERATIONS.md` for:
- Daily operations
- Monitoring
- Deployment
- Troubleshooting
- Maintenance schedules

## Project Structure
```
├── pages/tools/qr-tester.html       # Main tool interface
├── admin/qr-proxy.html               # Admin dashboard
├── workers/qr-proxy/                 # Cloudflare Worker
│   ├── src/index.js                  # Worker code
│   └── wrangler.toml                 # Configuration
└── .github/
    ├── workflows/deploy-qr-worker.yml  # Auto deployment
    └── scripts/                        # Ops scripts
```

## Tech Stack
- Cloudflare Workers (serverless backend)
- VirusTotal API (threat intelligence)
- jsQR (QR code decoding)
- Vanilla JavaScript (no frameworks)

## Cost
**$0/month** - All free tiers

## License
MIT - CyberSmrt 2025
```

## 📁 Final File Structure
```
cybersmrt-website/
├── README.md                          ← Update (see above)
├── CHANGELOG.md                       ← Fix (see above)
├── .gitignore                         ✅ Keep
│
├── docs/
│   └── QR-TOOL-OPERATIONS.md         ← Create (internal ops)
│
├── pages/
│   ├── tools/qr-tester.html          ✅ Keep
│   └── qr-gotcha.html                 ✅ Keep
│
├── admin/
│   └── qr-proxy.html                  ✅ Keep
│
├── workers/qr-proxy/
│   ├── README.md                      ← Simplify (see above)
│   ├── src/index.js                   ✅ Keep
│   ├── wrangler.toml                  ✅ Keep
│   ├── package.json                   ✅ Keep
│   ├── package-lock.json              ✅ Keep
│   └── .gitignore                     ✅ Keep
│
└── .github/
    ├── workflows/
    │   └── deploy-qr-worker.yml       ✅ Keep
    └── scripts/
        ├── deploy-worker.sh           ✅ Keep
        ├── test-qr-proxy.sh           ✅ Keep
        └── monitor-qr-proxy.sh        ✅ Keep