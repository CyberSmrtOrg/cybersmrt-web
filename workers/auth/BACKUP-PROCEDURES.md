# CyberSmrt Auth Worker - Backup & Restore Procedures

## Overview

This document outlines manual backup and restore procedures for the CyberSmrt authentication system. While Cloudflare provides automatic backups, manual backups ensure additional data protection and enable point-in-time recovery.

**Components to Backup**:
1. D1 Database (user data, sessions, security logs)
2. KV Namespaces (sessions, rate limits, password resets)
3. R2 Buckets (user uploads, if applicable)
4. Worker Configuration & Secrets
5. DNS Configuration

**Backup Frequency**:
- **Daily**: Automatic Cloudflare backups
- **Weekly**: Manual backup verification
- **Monthly**: Full backup archive
- **Pre-deployment**: Before major changes

---

## 1. D1 Database Backup

### Export Full Database

```bash
# Navigate to auth worker directory
cd workers/auth

# Export all tables to SQL dump
npx wrangler d1 backup create cybersmrt-users --output cybersmrt-users-backup-$(date +%Y%m%d).sql

# Alternative: Export to local SQLite file
npx wrangler d1 export cybersmrt-users --output ./backups/db-$(date +%Y%m%d).sqlite
```

### Export Individual Tables

```bash
# Export users table
npx wrangler d1 execute cybersmrt-users --command "SELECT * FROM users" --output users-$(date +%Y%m%d).json

# Export sessions table
npx wrangler d1 execute cybersmrt-users --command "SELECT * FROM sessions" --output sessions-$(date +%Y%m%d).json

# Export security_events table
npx wrangler d1 execute cybersmrt-users --command "SELECT * FROM security_events" --output security-$(date +%Y%m%d).json
```

### Verify Backup

```bash
# Check backup file size
ls -lh ./backups/

# Verify SQL syntax
sqlite3 ./backups/db-$(date +%Y%m%d).sqlite ".schema"

# Count records
sqlite3 ./backups/db-$(date +%Y%m%d).sqlite "SELECT COUNT(*) FROM users;"
```

### Backup Script (Automated)

Create `backup-d1.sh`:

```bash
#!/bin/bash
##
# D1 Database Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup-d1.sh
##

set -e

# Configuration
BACKUP_DIR="./backups/d1"
DATABASE_NAME="cybersmrt-users"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Export database
echo "Starting D1 backup: $DATE"
npx wrangler d1 export "$DATABASE_NAME" --output "$BACKUP_DIR/db-$DATE.sqlite"

# Compress backup
gzip "$BACKUP_DIR/db-$DATE.sqlite"

# Verify backup
if [ -f "$BACKUP_DIR/db-$DATE.sqlite.gz" ]; then
  echo "✅ Backup successful: db-$DATE.sqlite.gz"
  FILESIZE=$(du -h "$BACKUP_DIR/db-$DATE.sqlite.gz" | cut -f1)
  echo "   Size: $FILESIZE"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Clean up old backups (keep last 30 days)
find "$BACKUP_DIR" -name "db-*.sqlite.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"

echo "Backup complete!"
```

---

## 2. KV Namespace Backup

Cloudflare KV does not have a native export command. Manual backup requires scripting.

### Backup KV Namespaces

Create `backup-kv.sh`:

```bash
#!/bin/bash
##
# KV Namespace Backup Script
# Exports all KV data to JSON files
##

set -e

BACKUP_DIR="./backups/kv"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Note: Cloudflare doesn't provide direct KV export
# This requires API calls to list and get all keys

echo "⚠️  KV backup requires Cloudflare API access"
echo "Manual steps:"
echo "1. Go to Cloudflare Dashboard"
echo "2. Navigate to Workers > KV"
echo "3. Select each namespace:"
echo "   - USERS"
echo "   - SESSIONS"
echo "   - PASSWORD_RESETS"
echo "   - RATE_LIMIT_KV"
echo "4. Manually export or use bulk operations API"

# Alternative: Use Cloudflare API (requires API token)
# This is a template - requires API credentials
cat > "$BACKUP_DIR/kv-backup-instructions.md" << 'EOF'
# KV Backup via API

## Prerequisites
- Cloudflare API Token with KV read access
- jq (JSON processor)

## Steps

1. Set API credentials:
```bash
export CF_API_TOKEN="your-api-token"
export CF_ACCOUNT_ID="your-account-id"
```

2. List namespaces:
```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/storage/kv/namespaces" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq
```

3. For each namespace, list keys:
```bash
NAMESPACE_ID="your-namespace-id"
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/keys" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq
```

4. Get each key value and save to file:
```bash
for key in $(curl ... | jq -r '.result[].name'); do
  curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/values/$key" \
    -H "Authorization: Bearer $CF_API_TOKEN" > "backup-$key.json"
done
```
EOF

echo "Created KV backup instructions at $BACKUP_DIR/kv-backup-instructions.md"
```

### Important KV Backup Notes

**Sessions (SESSIONS KV)**:
- Ephemeral data (7-day TTL)
- Loss is non-critical (users just need to re-login)
- Backup priority: LOW

**Rate Limits (RATE_LIMIT_KV)**:
- Temporary data (1-hour TTL)
- Loss is non-critical (limits reset)
- Backup priority: LOW

**Password Resets (PASSWORD_RESETS)**:
- Short-lived tokens (1-hour TTL)
- Loss is acceptable (users can re-request)
- Backup priority: LOW

**User Cache (USERS)**:
- Cached from D1 database
- Can be regenerated from D1
- Backup priority: MEDIUM (D1 backup sufficient)

---

## 3. R2 Bucket Backup

### Export R2 Objects

```bash
# List all objects
npx wrangler r2 object list cybersmrt-uploads

# Download all objects (if small dataset)
mkdir -p ./backups/r2
npx wrangler r2 object download cybersmrt-uploads --output ./backups/r2/

# For large datasets, use rclone or AWS S3 CLI
# Configure rclone with Cloudflare R2 credentials
rclone sync cloudflare-r2:cybersmrt-uploads ./backups/r2/
```

### R2 Backup Script

```bash
#!/bin/bash
##
# R2 Bucket Backup Script
##

set -e

BACKUP_DIR="./backups/r2"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR/$DATE"

echo "Starting R2 backup: $DATE"

# Download all objects
npx wrangler r2 object list cybersmrt-uploads --json | \
  jq -r '.objects[].key' | \
  while read -r key; do
    echo "Downloading: $key"
    npx wrangler r2 object get cybersmrt-uploads "$key" --file "$BACKUP_DIR/$DATE/$key"
  done

echo "✅ R2 backup complete!"
```

---

## 4. Worker Configuration Backup

### Export Worker Code

```bash
# Backup worker source code
cd workers/auth
tar -czf ../backups/auth-worker-$(date +%Y%m%d).tar.gz src/ wrangler.toml package.json

# Backup profile worker
cd ../profile
tar -czf ../backups/profile-worker-$(date +%Y%m%d).tar.gz src/ wrangler.toml package.json
```

### Export Secrets (Manual - Secure Process)

```bash
# List secrets (values are hidden)
npx wrangler secret list

# Document which secrets exist
npx wrangler secret list > ./backups/secrets-list-$(date +%Y%m%d).txt

# ⚠️  IMPORTANT: Store secret values in secure password manager
# Never commit secrets to git or store in plain text
```

**Secrets to Backup**:
1. `JWT_SECRET` - JWT signing key
2. `GOOGLE_CLIENT_SECRET` - Google OAuth
3. `GITHUB_CLIENT_SECRET` - GitHub OAuth
4. `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth
5. Any other secrets added

**Secure Storage**:
- Use 1Password, LastPass, or similar
- Store in encrypted vault
- Document retrieval procedure
- Maintain offline encrypted backup

### Export Environment Variables

```bash
# From wrangler.toml (already in git)
cat wrangler.toml | grep -A 50 "\[vars\]" > ./backups/env-vars-$(date +%Y%m%d).txt
```

---

## 5. DNS Configuration Backup

### Export DNS Records

```bash
# Via Cloudflare Dashboard:
# 1. Go to DNS tab for cybersmrt.org
# 2. Click "Export" to download DNS zone file
# 3. Save as: backups/dns-cybersmrt-org-$(date +%Y%m%d).txt

# Critical records to document:
# - auth.cybersmrt.org → Workers route
# - profile.cybersmrt.org → Workers route
# - www.cybersmrt.org → Pages deployment
```

---

## Restore Procedures

### 1. Restore D1 Database

```bash
# From SQL dump
npx wrangler d1 execute cybersmrt-users --file ./backups/db-YYYYMMDD.sql

# From SQLite file
npx wrangler d1 restore cybersmrt-users --input ./backups/db-YYYYMMDD.sqlite

# Verify restoration
npx wrangler d1 execute cybersmrt-users --command "SELECT COUNT(*) FROM users;"
```

### 2. Restore KV Namespace

```bash
# Requires Cloudflare API
# For each backed up key-value pair:

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/storage/kv/namespaces/$NAMESPACE_ID/values/$KEY" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @backup-key.json
```

### 3. Restore R2 Bucket

```bash
# Upload all backed up objects
cd ./backups/r2/YYYYMMDD
for file in *; do
  npx wrangler r2 object put cybersmrt-uploads "$file" --file "$file"
done
```

### 4. Restore Worker Configuration

```bash
# Extract worker code
tar -xzf ./backups/auth-worker-YYYYMMDD.tar.gz

# Deploy worker
npx wrangler deploy

# Restore secrets (from secure storage)
echo "secret-value" | npx wrangler secret put JWT_SECRET
echo "secret-value" | npx wrangler secret put GOOGLE_CLIENT_SECRET
# ... repeat for all secrets
```

---

## Backup Schedule

### Daily (Automated - 02:00 UTC)

```bash
# Add to crontab:
0 2 * * * /path/to/backup-d1.sh >> /var/log/backups/d1-backup.log 2>&1
```

- D1 database export
- Verify backup size
- Email notification if backup fails

### Weekly (Manual - Every Sunday)

- Verify automated backups succeeded
- Test one random backup restore
- Review backup storage usage
- Clean up old backups (keep 30 days)

### Monthly (Manual - First of month)

- Full system backup archive
- Test complete disaster recovery procedure
- Update backup procedures documentation
- Review and rotate encryption keys

### Pre-Deployment (Manual - Before releases)

- Create named backup: `backup-pre-v2.1.0`
- Tag in version control
- Document current state
- Keep deployment backups for 90 days

---

## Backup Storage

### Local Storage

- **Location**: `./backups/`
- **Retention**: 30 days
- **Security**: Encrypted disk (if sensitive)

### Cloud Storage (Recommended)

```bash
# Example: Sync to AWS S3
aws s3 sync ./backups/ s3://cybersmrt-backups/auth/ --storage-class GLACIER

# Example: Sync to Google Cloud Storage
gsutil rsync -r ./backups/ gs://cybersmrt-backups/auth/
```

### Offline Storage (Critical Backups)

- Monthly encrypted archives to external drive
- Store off-site (different physical location)
- Test restoration annually

---

## Backup Verification

### Weekly Verification Checklist

```bash
# 1. Check latest backup exists
ls -lh ./backups/d1/ | head

# 2. Verify backup file size (should be > 0)
LATEST_BACKUP=$(ls -t ./backups/d1/*.sqlite.gz | head -1)
du -h "$LATEST_BACKUP"

# 3. Test database integrity
gunzip -c "$LATEST_BACKUP" | sqlite3 - "PRAGMA integrity_check;"

# 4. Count records (compare to production)
gunzip -c "$LATEST_BACKUP" | sqlite3 - "SELECT COUNT(*) FROM users;"
```

### Monthly Disaster Recovery Test

1. Create test D1 database
2. Restore from backup
3. Deploy worker to test environment
4. Verify authentication flows work
5. Document test results
6. Clean up test resources

---

## Encryption

### Encrypt Backups (Recommended)

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 ./backups/db-$(date +%Y%m%d).sqlite

# Decrypt when needed
gpg --decrypt ./backups/db-YYYYMMDD.sqlite.gpg > db-restored.sqlite
```

### Store Encryption Keys

- Use password manager (1Password, LastPass)
- Maintain secure offline copy
- Document key rotation schedule
- Test decryption quarterly

---

## Monitoring & Alerts

### Backup Success Monitoring

```bash
# Add to backup scripts:
if [ $? -eq 0 ]; then
  curl -X POST "https://your-monitoring-service.com/backup-success"
else
  curl -X POST "https://your-monitoring-service.com/backup-failure"
  # Send alert email
  echo "Backup failed!" | mail -s "ALERT: Backup Failure" admin@cybersmrt.org
fi
```

### Backup Size Monitoring

```bash
# Alert if backup size suddenly changes
CURRENT_SIZE=$(du -b "$LATEST_BACKUP" | cut -f1)
EXPECTED_MIN=1000000  # 1MB minimum

if [ "$CURRENT_SIZE" -lt "$EXPECTED_MIN" ]; then
  echo "⚠️  WARNING: Backup size unexpectedly small!"
  # Send alert
fi
```

---

## Recovery Time Objectives (RTO)

| Component | RTO | Notes |
|-----------|-----|-------|
| D1 Database | < 1 hour | Full restore from daily backup |
| Workers | < 15 minutes | Redeploy from git |
| KV Namespaces | < 2 hours | Manual API restore if needed |
| R2 Buckets | < 4 hours | Re-upload from backup |
| DNS Configuration | < 30 minutes | Cloudflare API or dashboard |
| **Total System** | **< 4 hours** | Complete disaster recovery |

---

## Recovery Point Objectives (RPO)

| Component | RPO | Data Loss |
|-----------|-----|-----------|
| D1 Database | < 24 hours | Last daily backup |
| Workers | 0 | Git version control |
| KV Namespaces | < 24 hours | Acceptable (ephemeral data) |
| R2 Buckets | < 24 hours | User uploads |

---

## Contact Information

**Backup Administrator**: [Your team contact]
**Escalation**: [Manager/On-call contact]
**Emergency**: [24/7 contact]

**Cloudflare Support**: https://dash.cloudflare.com/support
**Account ID**: [Document in secure location]

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-23 | 1.0 | Initial documentation |

---

**Status**: Ready for implementation ✅
**Next Review**: November 23, 2025
