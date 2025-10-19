# QR Code Security Tool - Operations Guide

## System Overview

**Live URLs:**
- Tool: https://cybersmrt.org/pages/tools/qr-tester.html
- Admin: https://cybersmrt.org/admin/qr-proxy.html
- Demo: https://cybersmrt.org/pages/qr-gotcha.html
- Health: https://cybersmrt.org/tools/qr_proxy/health

**Architecture:**
- Frontend: Static HTML/JS pages
- Backend: Cloudflare Worker (qr-proxy)
- Storage: KV namespace for blocked domains
- Threat Intel: VirusTotal API (500/day free tier)

## Daily Operations

### Check System Health
```bash
# Quick check
curl https://cybersmrt.org/tools/qr_proxy/health

# Full test suite
.github/scripts/test-qr-proxy.sh

# View metrics
# Cloudflare Dashboard → Workers → cybersmrt-qr-proxy → Metrics
```

### Monitor Usage
```bash
# Real-time logs
cd workers/qr-proxy
wrangler tail

# Run monitoring check
.github/scripts/monitor-qr-proxy.sh --once

# Generate report
.github/scripts/monitor-qr-proxy.sh --report
```

### Block a Domain
**Via Admin Dashboard:**
1. Visit https://cybersmrt.org/admin/qr-proxy.html
2. Enter admin token
3. Add domain and reason

**Via CLI:**
```bash
curl -X POST https://cybersmrt.org/tools/qr_proxy/block \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"malicious.com","reason":"Phishing campaign"}'
```

## Deployment

### Automatic (Recommended)
Push to main branch:
```bash
git add .
git commit -m "Update QR worker"
git push origin main
```

GitHub Actions automatically deploys if worker files changed.

### Manual Deployment
```bash
cd workers/qr-proxy
npm install
npm run deploy
```

### Rollback
```bash
cd workers/qr-proxy
wrangler rollback --message "Rolling back issue"
```

## Troubleshooting

### Worker Not Responding
```bash
# Check deployment status
wrangler deployments list

# View errors
wrangler tail --status error

# Verify route
# Should be: cybersmrt.org/tools/qr_proxy*
```

### VirusTotal Rate Limit Hit
- Free tier: 500/day, 4/min
- Results cached 1 hour
- Check usage: VirusTotal dashboard
- Worker still functions with heuristics only

### CORS Errors
- Verify corsHeaders in worker code
- Should allow: https://cybersmrt.org
- Clear browser cache

## Maintenance

### Rotate Admin Token (Every 90 Days)
```bash
# Generate new token
openssl rand -hex 32

# Update worker secret
cd workers/qr-proxy
wrangler secret put ADMIN_TOKEN

# Update GitHub secret
# Repository → Settings → Secrets → ADMIN_TOKEN

# Update local password manager
```

### Update VirusTotal Key (If Needed)
```bash
cd workers/qr-proxy
wrangler secret put VIRUSTOTAL_API_KEY
```

### Review Blocked Domains (Monthly)
```bash
# List all blocked domains
wrangler kv key list --namespace-id=f25bbd7dd5fb4ef98d44f1f60ee3d0c2

# Get specific domain info
wrangler kv key get --namespace-id=f25bbd7dd5fb4ef98d44f1f60ee3d0c2 "domain.com"

# Remove false positive
wrangler kv key delete --namespace-id=f25bbd7dd5fb4ef98d44f1f60ee3d0c2 "domain.com"
```

## Costs

**Current (all free tier):**
- Cloudflare Workers: 100k req/day → $0
- KV Storage: 1GB, 1k writes/day → $0
- Analytics: 10M events/month → $0
- VirusTotal: 500 req/day → $0

**Total: $0/month**

Set billing alert at Cloudflare dashboard if scaling beyond free tier.

## Support Contacts

**Internal:**
- Primary: tony@cybersmrt.org
- Repository: [link to your repo]

**External (if needed):**
- Cloudflare Support: Dashboard → Help
- VirusTotal: support@virustotal.com

## Emergency Procedures

### Complete Outage
1. Check Cloudflare status page
2. Verify GitHub Actions didn't fail
3. Check wrangler deployments
4. Review recent commits
5. Rollback if needed

### Security Incident
1. Rotate ADMIN_TOKEN immediately
2. Check Analytics for unusual patterns
3. Review blocked domains list
4. Check worker logs for suspicious activity
5. Update KV to block any compromised domains

### Data Loss
We don't store user data. Blocked domains can be re-added via admin dashboard.