"""
Create ClickUp task for Dev/Test/Prod Environment Setup
"""

import requests
import json
import os
import sys

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ClickUp API Configuration
API_KEY = os.getenv('CLICKUP_PERSONAL_TOKEN', 'pk_138096830_H7Z1UH3LE4E9QR8E598ZJQGPJZJYSC0D')
LIST_ID = '901321762908'  # Website & App Development list in Technology & Infrastructure space
BASE_URL = 'https://api.clickup.com/api/v2'

headers = {
    'Authorization': API_KEY,
    'Content-Type': 'application/json'
}

# Task description with full documentation
description = """## Overview

Set up proper development, testing, and production environments for the CyberSmrt store API to enable safe feature development and deployment.

## Current State

We have production environment working, but need dev and test environments to follow proper deployment workflow:

```
Local Development → Dev Environment → Test/Staging → Production
     ↓                    ↓                ↓              ↓
  Your machine      workers.dev      QA/Review    cybersmrt.org
  (wrangler dev)    (--env dev)    (--env test)   (main deploy)
```

## Tasks

### 1. Create Development Database
```bash
cd workers/store-api
npx wrangler d1 create cybersmrt-store-dev
```
- Copy the database_id from output
- Update `wrangler.toml` line 44-47 with the database ID

### 2. Create Testing Database
```bash
npx wrangler d1 create cybersmrt-store-test
```
- Copy the database_id from output
- Update `wrangler.toml` line 63-66 with the database ID

### 3. Create Development KV Namespace
```bash
cd workers/store-api
npx wrangler kv:namespace create PRODUCT_CACHE --env development
```
- Copy the id from output
- Update `wrangler.toml` line 50-52 with the KV ID

### 4. Create Testing KV Namespace
```bash
npx wrangler kv:namespace create PRODUCT_CACHE --env testing
```
- Copy the id from output
- Update `wrangler.toml` line 69-71 with the KV ID

### 5. Run Database Migrations
```bash
# Dev environment
npx wrangler d1 execute cybersmrt-store-dev --file=migrations/001_initial.sql

# Test environment
npx wrangler d1 execute cybersmrt-store-test --file=migrations/001_initial.sql
```

### 6. Set Up Secrets - Development
```bash
cd workers/store-api
npx wrangler secret put STRIPE_SECRET_KEY --env development
# Use: sk_test_... (Stripe test mode key)

npx wrangler secret put PRINTIFY_API_KEY --env development
npx wrangler secret put RESEND_API_KEY --env development
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env development
```

### 7. Set Up Secrets - Testing
```bash
npx wrangler secret put STRIPE_SECRET_KEY --env testing
# Use: sk_test_... (Stripe test mode key)

npx wrangler secret put PRINTIFY_API_KEY --env testing
npx wrangler secret put RESEND_API_KEY --env testing
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env testing
```

### 8. Test Deployments
```bash
# Deploy to dev
npx wrangler deploy --env development
# Should deploy to: cybersmrt-store-api-dev.workers.dev

# Deploy to test
npx wrangler deploy --env testing
# Should deploy to: cybersmrt-store-api-test.workers.dev

# Test endpoints
curl https://cybersmrt-store-api-dev.{subdomain}.workers.dev/health
curl https://cybersmrt-store-api-test.{subdomain}.workers.dev/health
```

## Standard Development Workflow

Once environments are set up, follow this workflow for all feature development:

### Step 1: Local Development
```bash
git checkout -b feature/new-feature
cd workers/store-api
npx wrangler dev
# Test at http://localhost:8787
```

### Step 2: Deploy to Dev
```bash
npx wrangler deploy --env development
npx wrangler tail --env development
# Test thoroughly
```

### Step 3: Deploy to Test/Staging
```bash
npx wrangler deploy --env testing
npx wrangler tail --env testing
# QA testing, cross-browser, mobile
```

### Step 4: Deploy to Production
```bash
git checkout main
git merge feature/new-feature
git push origin main

cd workers/store-api
npx wrangler deploy  # No --env flag = production

# Monitor for 15 minutes
npx wrangler tail
```

## Database Migration Workflow

ALWAYS test migrations in dev → test → prod order:

```bash
# 1. Create migration file
cat > migrations/002_add_field.sql << 'EOF'
ALTER TABLE orders ADD COLUMN notes TEXT;
EOF

# 2. Test in dev
npx wrangler d1 execute cybersmrt-store-dev --file=migrations/002_add_field.sql

# 3. Test in testing
npx wrangler d1 execute cybersmrt-store-test --file=migrations/002_add_field.sql

# 4. BACKUP production first
npx wrangler d1 export cybersmrt-store --remote --output=backup-$(date +%Y%m%d).sql

# 5. Run in production
npx wrangler d1 execute cybersmrt-store --remote --file=migrations/002_add_field.sql
```

## Testing Checklist

### Development Environment
- [ ] Worker endpoints respond
- [ ] Database operations work
- [ ] Stripe test payments work
- [ ] No errors in logs

### Testing Environment
- [ ] Full end-to-end testing
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Security testing
- [ ] QA team approval

### Production Deployment
- [ ] Run database migration (if needed)
- [ ] Monitor logs immediately
- [ ] Test critical paths
- [ ] Verify no errors
- [ ] Check Stripe webhooks
- [ ] Verify email delivery
- [ ] Monitor for 15 minutes

## Key Principles

1. **Always flow: Local → Dev → Test → Prod**
2. **Never skip testing environment** (except true emergencies)
3. **Always backup before production migrations**
4. **Monitor production for 15 minutes after deployment**
5. **Use Stripe test mode** everywhere except production
6. **Test webhooks in test environment** before production
7. **Have a rollback plan** before every production deployment

## Resources

- Full documentation: `ENVIRONMENTS.md` in project root
- Automation script: `scripts/setup-environments.sh`
- Configuration: `workers/store-api/wrangler.toml`

## Acceptance Criteria

- [ ] Dev database created and configured
- [ ] Test database created and configured
- [ ] Dev KV namespace created and configured
- [ ] Test KV namespace created and configured
- [ ] All migrations run in dev and test
- [ ] All secrets configured for dev and test
- [ ] Successful test deployment to dev environment
- [ ] Successful test deployment to test environment
- [ ] Health checks pass for both environments
- [ ] Team trained on new workflow
"""

# Create the task
task_data = {
    'name': 'Set Up Dev/Test/Prod Environments for Store API',
    'description': description,
    'priority': 1,  # 1 = Urgent (highest priority)
    'status': 'planning',
    'tags': ['infrastructure', 'DevOps', 'high-priority']
}

url = f'{BASE_URL}/list/{LIST_ID}/task'

try:
    response = requests.post(url, headers=headers, json=task_data)

    if response.status_code in [200, 201]:
        task = response.json()
        print(f"✅ Task created successfully!")
        print(f"   Task ID: {task['id']}")
        print(f"   Task URL: {task['url']}")
        print(f"   Title: {task['name']}")
        sys.exit(0)
    else:
        print(f"❌ Failed to create task")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)

except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)
