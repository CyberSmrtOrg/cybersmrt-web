# QR Proxy Worker

## Endpoints
- `GET /tools/qr_proxy/health` - Health check
- `GET /tools/qr_proxy?url={url}&analysis_only=true` - Analyze URL
- `POST /tools/qr_proxy/block` - Block domain (requires admin token)

## Deployment
```bash
# Auto: Push to main branch
git push origin main

# Manual:
cd workers/qr-proxy
npm run deploy
```

## Monitoring
```bash
# Real-time logs
wrangler tail

# Health check
curl https://cybersmrt.org/tools/qr_proxy/health

# Run tests
../../.github/scripts/test-qr-proxy.sh

# Monitor
../../.github/scripts/monitor-qr-proxy.sh --once
```

## Environment Variables
Set via `wrangler secret put`:
- `VIRUSTOTAL_API_KEY` - VirusTotal API key
- `ADMIN_TOKEN` - Admin dashboard authentication

## KV Namespace
- Binding: `BLOCKED_DOMAINS`
- ID: f25bbd7dd5fb4ef98d44f1f60ee3d0c2

## Version
Current: 2.0