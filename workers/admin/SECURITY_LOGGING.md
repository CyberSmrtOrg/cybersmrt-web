# Admin Dashboard Security Logging & Alerting

Comprehensive security monitoring and real-time alerting for the CyberSmrt admin dashboard.

## Overview

The admin dashboard implements granular security logging with real-time alerts for potential security incidents. All events are logged with full context, and critical events trigger immediate notifications to Slack and email.

## Features

### Granular Logging
- **Every admin access attempt** is logged with full context
- **IP address, user agent, country, referer** captured for all requests
- **Structured JSON logging** for easy parsing and analysis
- **30-day retention** in Cloudflare KV for audit trail
- **Severity levels**: INFO, WARNING, CRITICAL, EMERGENCY

### Real-Time Alerts
- **Slack notifications** to #security-alerts channel
- **Email alerts** to security-alerts@cybersmrt.org
- **Triggered automatically** for CRITICAL and EMERGENCY events
- **Rich context** including user email, IP, reason, timestamp

### Rate Limiting & Attack Detection
- **Repeated failure detection** tracks failed access attempts
- **Automatic alerting** when threshold exceeded (5 attempts in 15 minutes)
- **IP-based tracking** to identify potential attackers

## Security Events Logged

### Access Events (INFO)
- `admin_login_success` - Successful admin dashboard login
- `admin_logout` - User logged out
- `api_access_success` - Successful API endpoint access
- `api_stats_viewed` - Dashboard statistics viewed
- `api_users_viewed` - User management interface accessed

### Failed Access Attempts (WARNING → CRITICAL)
- `admin_login_failed_invalid_email` - Non-@cybersmrt.org email attempt (CRITICAL)
- `admin_login_failed_invalid_role` - User without admin role attempt (CRITICAL)
- `admin_login_failed_token_invalid` - Invalid/expired JWT token (WARNING)
- `api_access_denied` - Failed API authentication (WARNING)

### Suspicious Activity (CRITICAL)
- `unauthorized_email_attempt` - Repeated unauthorized email attempts
- `unauthorized_role_attempt` - Repeated unauthorized role attempts
- `multiple_failed_attempts` - 5+ failed attempts in 15 minutes
- `token_tampering_detected` - JWT parsing/validation errors

### Attack Detection (EMERGENCY)
- Reserved for active attacks or breaches

## Setup Instructions

### 1. Create KV Namespace for Security Logs

```bash
# Create KV namespace for security logs
npx wrangler kv:namespace create "SECURITY_LOGS" --preview false

# Update wrangler.toml with the returned ID
# Replace "REPLACE_WITH_ACTUAL_KV_ID" with actual KV namespace ID
```

### 2. Set Slack Webhook

```bash
cd workers/admin

# Create incoming webhook in Slack
# 1. Go to https://api.slack.com/apps
# 2. Create new app or select existing
# 3. Enable "Incoming Webhooks"
# 4. Add webhook to #security-alerts channel
# 5. Copy webhook URL

# Set as Cloudflare secret
npx wrangler secret put SLACK_SECURITY_WEBHOOK --env production
# Paste: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Set Resend API Key (Email Alerts)

```bash
cd workers/admin

# Get Resend API key
# 1. Go to https://resend.com/api-keys
# 2. Create API key for security alerts
# 3. Copy API key

# Set as Cloudflare secret
npx wrangler secret put RESEND_API_KEY --env production
# Paste: re_xxxxxxxxxxxxx
```

### 4. Verify Configuration

```bash
# Check secrets are set
npx wrangler secret list --env production

# Should show:
# - JWT_SECRET
# - SLACK_SECURITY_WEBHOOK
# - RESEND_API_KEY
```

## Log Format

All security events are logged in structured JSON format:

```json
{
  "timestamp": "2025-11-02T01:23:45.678Z",
  "eventType": "admin_login_failed_invalid_email",
  "severity": "critical",
  "service": "admin-dashboard",
  "email": "attacker@example.com",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0 ...",
  "country": "US",
  "referer": "https://google.com",
  "reason": "Non-@cybersmrt.org email attempted admin access"
}
```

## Alert Examples

### Slack Alert Format

```
⚠️ ADMIN LOGIN FAILED INVALID EMAIL

Severity: CRITICAL
Timestamp: 2025-11-02T01:23:45.678Z
Service: Admin Dashboard
Email: attacker@example.com
IP Address: 192.168.1.1
User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
Reason: Non-@cybersmrt.org email attempted admin access

CyberSmrt Security | Icon
```

### Email Alert Format

Rich HTML email with:
- Red/orange header based on severity
- All event details in structured format
- CyberSmrt branding
- Direct link context

## Viewing Logs

### Via Cloudflare Dashboard

1. Go to Workers & Pages > KV
2. Select `SECURITY_LOGS` namespace
3. Browse or search by key pattern: `admin:2025-11-02*`

### Via Wrangler CLI

```bash
# List recent logs
npx wrangler kv:key list --binding=SECURITY_LOGS --preview false

# Get specific log entry
npx wrangler kv:key get "admin:2025-11-02T01:23:45.678Z:uuid" --binding=SECURITY_LOGS --preview false
```

### Via Worker Logs (Console)

```bash
# Tail worker logs in real-time
npx wrangler tail --env production

# Filter for security events
npx wrangler tail --env production | grep "ADMIN SECURITY"
```

## Event Severity Guidelines

**INFO**: Normal operations, audit trail
- Successful logins
- Dashboard views
- API access

**WARNING**: Suspicious but not immediately critical
- Invalid tokens
- Single failed authentication

**CRITICAL**: Security incident requiring attention
- Non-@cybersmrt.org email attempts
- Missing admin role attempts
- Multiple failed attempts (5+ in 15 min)
- Token tampering detected

**EMERGENCY**: Active attack or breach
- Reserved for severe incidents
- Triggers immediate escalation

## Rate Limiting

The system automatically detects and flags repeated failed access attempts:

- **Threshold**: 5 failed attempts
- **Window**: 15 minutes
- **Action**: CRITICAL alert sent
- **Storage**: Cloudflare KV (shared RATE_LIMIT_KV)

## Monitoring Best Practices

1. **Monitor #security-alerts** Slack channel regularly
2. **Review security-alerts@cybersmrt.org** email daily
3. **Check logs weekly** for patterns
4. **Investigate all CRITICAL/EMERGENCY** events immediately
5. **Adjust thresholds** if too many false positives

## Incident Response

When a security alert is received:

1. **Assess severity** - Is this a real threat?
2. **Check context** - IP address, user agent, timing
3. **Investigate user** - Is this legitimate user with wrong credentials?
4. **Take action** - Block IP, revoke access, escalate if needed
5. **Document** - Log investigation and resolution

## Testing Alerts

To test the alerting system:

```bash
# 1. Attempt login with non-@cybersmrt.org email
# Visit https://admin.cybersmrt.org and use OAuth with personal email

# 2. Check Slack #security-alerts for alert
# 3. Check security-alerts@cybersmrt.org for email

# 4. Verify log entry created
npx wrangler kv:key list --binding=SECURITY_LOGS --preview false | head -5
```

## Troubleshooting

### Logs not appearing in KV
- Check KV namespace ID in wrangler.toml matches created namespace
- Verify worker has write permissions to KV
- Check worker logs for errors: `npx wrangler tail --env production`

### Slack alerts not sending
- Verify webhook URL is correct: `npx wrangler secret list --env production`
- Test webhook manually: `curl -X POST -H 'Content-Type: application/json' -d '{"text":"Test"}' YOUR_WEBHOOK_URL`
- Check Slack app permissions

### Email alerts not sending
- Verify Resend API key: `npx wrangler secret list --env production`
- Check Resend dashboard for sending errors
- Verify sending domain is configured in Resend

### Too many alerts
- Adjust thresholds in security-logger.js
- Filter by severity (only CRITICAL+ alerts)
- Review and tune event classification

## Security Considerations

- **Secrets stored securely** in Cloudflare Workers environment
- **Logs retained 30 days** then auto-deleted
- **No sensitive data** (passwords, tokens) stored in logs
- **IP addresses logged** for forensics but consider GDPR implications
- **Rate limiting** prevents log flooding attacks

## Future Enhancements

- [ ] Geographic anomaly detection (unusual country access)
- [ ] Time-based anomaly detection (off-hours access)
- [ ] Machine learning for attack pattern recognition
- [ ] Integration with SIEM systems
- [ ] Automated IP blocking for severe threats
- [ ] Dashboard for viewing logs in admin UI
- [ ] Export logs to S3/CloudFlare R2 for long-term storage
- [ ] Compliance reporting (SOC 2, ISO 27001)
