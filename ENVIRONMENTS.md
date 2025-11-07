# Environment Setup Guide

This guide explains how to work with dev, test, and production environments for the CyberSmrt infrastructure.

## Overview

The CyberSmrt stack uses:
- **Cloudflare Workers** for API backends
- **Cloudflare Pages** for static sites
- **D1 Databases** for data storage
- **KV Namespaces** for caching
- **External APIs**: Stripe, Printify, Resend

## Environment Strategy

### 1. Workers (store-api, auth, api)

Workers use Wrangler's built-in environment system defined in `wrangler.toml`.

#### Available Environments

- **Production** (default): `npx wrangler deploy`
- **Development**: `npx wrangler deploy --env development`
- **Testing**: `npx wrangler deploy --env testing`

#### Example Usage

```bash
# Deploy to production
cd workers/store-api
npx wrangler deploy

# Deploy to development
npx wrangler deploy --env development

# Deploy to testing
npx wrangler deploy --env testing

# Run locally with dev environment
npx wrangler dev --env development
```

### 2. Pages (Main Site, Store)

Cloudflare Pages environments are managed through Git branches:

- **Production**: `main` branch → https://cybersmrt.org
- **Preview/Dev**: Any other branch → https://{branch}.cybersmrt.pages.dev

#### Workflow

```bash
# Work on a feature branch for development
git checkout -b feature/new-feature
git push origin feature/new-feature
# Automatically deploys to: https://feature-new-feature.cybersmrt.pages.dev

# Merge to main for production
git checkout main
git merge feature/new-feature
git push origin main
# Automatically deploys to: https://cybersmrt.org
```

### 3. Databases

#### D1 Databases

Create separate databases for each environment:

```bash
# Create development database
npx wrangler d1 create cybersmrt-store-dev

# Create testing database
npx wrangler d1 create cybersmrt-store-test

# Production database already exists: cybersmrt-store
```

**Update wrangler.toml** with separate database bindings per environment (see configuration below).

#### KV Namespaces

Create separate KV namespaces:

```bash
# Create dev KV namespace
npx wrangler kv:namespace create "PRODUCT_CACHE" --env development

# Create test KV namespace
npx wrangler kv:namespace create "PRODUCT_CACHE" --env testing

# Production KV already exists
```

### 4. Environment Variables & Secrets

Each environment has its own secrets:

```bash
# Set secrets for production
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put PRINTIFY_API_KEY
npx wrangler secret put RESEND_API_KEY

# Set secrets for development
npx wrangler secret put STRIPE_SECRET_KEY --env development
npx wrangler secret put PRINTIFY_API_KEY --env development
npx wrangler secret put RESEND_API_KEY --env development

# Set secrets for testing
npx wrangler secret put STRIPE_SECRET_KEY --env testing
npx wrangler secret put PRINTIFY_API_KEY --env testing
npx wrangler secret put RESEND_API_KEY --env testing
```

**Use Stripe test keys for dev/test:**
- Dev/Test: `sk_test_...` and `pk_test_...`
- Production: `sk_live_...` and `pk_live_...`

### 5. Custom Domains

| Environment | Worker Domain | Pages Domain |
|-------------|--------------|--------------|
| Production | `store.cybersmrt.org/api/*` | `cybersmrt.org` |
| Testing | `store-test.cybersmrt.org/api/*` | `test.cybersmrt.org` |
| Development | `*.workers.dev` | `*.pages.dev` |

**Production routes** are defined in `wrangler.toml` routes section.
**Dev/Test** use auto-generated `*.workers.dev` subdomains.

## Complete wrangler.toml Configuration

Here's how to structure your `workers/store-api/wrangler.toml`:

```toml
# Base configuration (Production)
name = "cybersmrt-store-api"
main = "src/index.js"
compatibility_date = "2024-01-01"
workers_dev = true

# Production routes
routes = [
  { pattern = "store.cybersmrt.org/api/*", zone_name = "cybersmrt.org" },
  { pattern = "store.cybersmrt.org/webhooks/*", zone_name = "cybersmrt.org" },
  { pattern = "store.cybersmrt.org/checkout/*", zone_name = "cybersmrt.org" },
  { pattern = "store.cybersmrt.org/products", zone_name = "cybersmrt.org" },
  { pattern = "store.cybersmrt.org/products/*", zone_name = "cybersmrt.org" },
  { pattern = "store.cybersmrt.org/printify/*", zone_name = "cybersmrt.org" }
]

[vars]
ENVIRONMENT = "production"
STRIPE_PUBLISHABLE_KEY = "pk_live_..."

[[d1_databases]]
binding = "DB"
database_name = "cybersmrt-store"
database_id = "b6469b14-e613-44fc-aa9a-75d86c46a911"

[[kv_namespaces]]
binding = "PRODUCT_CACHE"
id = "89d8c4f59d794c36888770244e4bdbbf"

# Development Environment
[env.development]
name = "cybersmrt-store-api-dev"

[env.development.vars]
ENVIRONMENT = "development"
STRIPE_PUBLISHABLE_KEY = "pk_test_..."

[[env.development.d1_databases]]
binding = "DB"
database_name = "cybersmrt-store-dev"
database_id = "INSERT_DEV_DATABASE_ID"

[[env.development.kv_namespaces]]
binding = "PRODUCT_CACHE"
id = "INSERT_DEV_KV_ID"

# Testing Environment
[env.testing]
name = "cybersmrt-store-api-test"

[env.testing.vars]
ENVIRONMENT = "testing"
STRIPE_PUBLISHABLE_KEY = "pk_test_..."

[[env.testing.d1_databases]]
binding = "DB"
database_name = "cybersmrt-store-test"
database_id = "INSERT_TEST_DATABASE_ID"

[[env.testing.kv_namespaces]]
binding = "PRODUCT_CACHE"
id = "INSERT_TEST_KV_ID"
```

## External API Considerations

### Stripe

- **Production**: Use live keys (`sk_live_...`, `pk_live_...`)
- **Dev/Test**: Use test keys (`sk_test_...`, `pk_test_...`)
- **Webhooks**: Configure separate webhook endpoints for each environment

### Printify

- **Production**: Real Printify shop
- **Dev/Test**: Either mock the API or use a separate test shop

### Resend

- **All environments**: Can use the same Resend account, but set different "from" addresses:
  - Production: `noreply@cybersmrt.org`
  - Testing: `test@cybersmrt.org`
  - Development: `dev@cybersmrt.org`

## Database Migrations

Run migrations separately for each environment:

```bash
# Production
npx wrangler d1 execute cybersmrt-store --remote --file=./migrations/001_initial.sql

# Development
npx wrangler d1 execute cybersmrt-store-dev --file=./migrations/001_initial.sql

# Testing
npx wrangler d1 execute cybersmrt-store-test --file=./migrations/001_initial.sql
```

## Local Development

For local development, use `.dev.vars` file (not committed to git):

```bash
# workers/store-api/.dev.vars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
PRINTIFY_API_KEY=your_dev_key
RESEND_API_KEY=your_dev_key
PRINTIFY_SHOP_ID=your_dev_shop_id
```

Run locally:

```bash
npx wrangler dev
```

## CI/CD Pipeline (GitHub Actions)

Example workflow for automatic deployments:

```yaml
name: Deploy

on:
  push:
    branches:
      - main        # Production
      - develop     # Development
      - test        # Testing

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Development
        if: github.ref == 'refs/heads/develop'
        run: npx wrangler deploy --env development
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Testing
        if: github.ref == 'refs/heads/test'
        run: npx wrangler deploy --env testing
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Development Workflow: From Feature to Production

This section provides a step-by-step workflow for developing features and pushing them through dev → test → production.

### Workflow Overview

```
Local Development → Dev Environment → Test/Staging → Production
     ↓                    ↓                ↓              ↓
  Your machine      workers.dev      QA/Review    cybersmrt.org
  (wrangler dev)    (--env dev)    (--env test)   (main deploy)
```

### Step-by-Step Workflow

#### **Step 1: Start Local Development**

```bash
# Create a feature branch
git checkout -b feature/new-store-feature

# Make sure you have .dev.vars set up with test credentials
cd workers/store-api
cat .dev.vars  # Should contain STRIPE_SECRET_KEY=sk_test_..., etc.

# Run worker locally
npx wrangler dev

# Test in browser at http://localhost:8787
```

**What to test locally:**
- Basic functionality works
- No syntax errors
- Database queries work (uses local D1 or --remote flag)
- API endpoints respond correctly

**Local testing tips:**
- Use Stripe test cards (4242 4242 4242 4242)
- Check browser console for errors
- Use `console.log()` - shows in terminal running wrangler dev
- Test with real Printify API or mock responses

---

#### **Step 2: Deploy to Development Environment**

```bash
# Still on feature/new-store-feature branch

# Deploy worker to dev environment
cd workers/store-api
npx wrangler deploy --env development

# Worker deploys to: cybersmrt-store-api-dev.workers.dev
```

**What happens:**
- Worker deployed with dev database (cybersmrt-store-dev)
- Uses Stripe test keys (sk_test_...)
- Gets dev KV namespace
- Accessible at `https://cybersmrt-store-api-dev.{your-subdomain}.workers.dev`

**Test in dev:**
```bash
# View live logs
npx wrangler tail --env development

# Test endpoints
curl https://cybersmrt-store-api-dev.{subdomain}.workers.dev/api/products

# Query dev database
npx wrangler d1 execute cybersmrt-store-dev --command "SELECT * FROM orders"

# Check for errors in logs
```

**For Pages changes (static site):**
```bash
# Push feature branch to GitHub
git add .
git commit -m "feat: add new store feature"
git push origin feature/new-store-feature

# Cloudflare Pages auto-deploys to:
# https://feature-new-store-feature.cybersmrt.pages.dev
```

**Dev environment testing checklist:**
- ✅ Worker endpoints respond correctly
- ✅ Database operations work
- ✅ External API integrations work (Stripe, Printify)
- ✅ No errors in wrangler tail logs
- ✅ Pages preview looks correct (if applicable)

---

#### **Step 3: Deploy to Test/Staging Environment**

Once dev testing passes, promote to testing environment for QA:

```bash
# Deploy worker to test environment
cd workers/store-api
npx wrangler deploy --env testing

# Worker deploys to: cybersmrt-store-api-test.workers.dev
```

**What happens:**
- Worker uses test database (cybersmrt-store-test)
- Uses Stripe test keys
- Uses test KV namespace
- Should mirror production configuration exactly (except for live keys)

**Test environment checklist:**
- ✅ Full end-to-end testing (checkout flow, webhooks, emails)
- ✅ Test with realistic data (seed test database if needed)
- ✅ Cross-browser testing
- ✅ Mobile responsive testing
- ✅ Load testing (if applicable)
- ✅ Security testing (SQL injection, XSS, etc.)
- ✅ QA team approval

**Monitor test environment:**
```bash
# View logs
npx wrangler tail --env testing

# Check database
npx wrangler d1 execute cybersmrt-store-test --command "SELECT * FROM orders ORDER BY created_at DESC LIMIT 10"

# Test webhook delivery (Stripe webhook testing)
# Go to Stripe Dashboard → Webhooks → Test your endpoint
```

**For database migrations:**
```bash
# Test migration in test environment FIRST
npx wrangler d1 execute cybersmrt-store-test --file=./migrations/002_add_new_field.sql

# Verify migration worked
npx wrangler d1 execute cybersmrt-store-test --command "DESCRIBE orders"
```

---

#### **Step 4: Merge to Main & Deploy to Production**

After testing environment approval:

```bash
# Ensure all tests pass
git status  # Clean working directory

# Switch to main branch
git checkout main
git pull origin main

# Merge feature branch
git merge feature/new-store-feature

# Push to GitHub
git push origin main
```

**What happens automatically (with Pages):**
- GitHub push to main triggers Cloudflare Pages build
- Static site deploys to https://cybersmrt.org
- Production deployment complete in ~1-2 minutes

**Deploy Worker to Production:**
```bash
# Deploy worker to production
cd workers/store-api
npx wrangler deploy  # No --env flag = production

# Worker deploys to routes defined in wrangler.toml:
# - store.cybersmrt.org/api/*
# - store.cybersmrt.org/webhooks/*
# etc.
```

**Production deployment checklist:**
- ✅ Run database migration (if needed)
- ✅ Monitor logs immediately after deployment
- ✅ Test critical paths (checkout, webhooks)
- ✅ Verify no errors in production logs
- ✅ Check Stripe webhook deliveries
- ✅ Verify email delivery (Resend)
- ✅ Monitor for 10-15 minutes post-deployment

**Monitor production:**
```bash
# Watch live production logs
npx wrangler tail

# Check recent orders
npx wrangler d1 execute cybersmrt-store --remote --command "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"

# Check Cloudflare Analytics dashboard
# https://dash.cloudflare.com → Workers & Pages → cybersmrt-store-api
```

---

#### **Step 5: Post-Deployment Verification**

**Immediately after production deployment:**

1. **Smoke test critical paths:**
   ```bash
   # Test product listing
   curl https://store.cybersmrt.org/api/products

   # Test checkout (use Stripe test card in production test mode)
   # Or manually verify on site
   ```

2. **Check external integrations:**
   - Go to Stripe Dashboard → Webhooks → Check recent deliveries
   - Check Resend dashboard for email deliveries
   - Check Printify for order creation (if applicable)

3. **Monitor error rates:**
   - Check Cloudflare Workers analytics for error rate spikes
   - Watch `wrangler tail` for exceptions
   - Check browser console on live site

4. **Database sanity check:**
   ```bash
   # Verify database is healthy
   npx wrangler d1 execute cybersmrt-store --remote --command "SELECT COUNT(*) FROM orders"
   ```

5. **Rollback plan (if issues found):**
   ```bash
   # Option 1: Revert git commit
   git revert HEAD
   git push origin main

   # Option 2: Redeploy previous version
   git checkout <previous-commit-sha>
   cd workers/store-api
   npx wrangler deploy
   git checkout main
   ```

---

### Database Migration Workflow

**ALWAYS test migrations in dev → test → prod order:**

```bash
# 1. Create migration file
cat > workers/store-api/migrations/002_add_user_preferences.sql << 'EOF'
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';
CREATE INDEX idx_users_preferences ON users(preferences);
EOF

# 2. Test in dev
npx wrangler d1 execute cybersmrt-store-dev --file=./migrations/002_add_user_preferences.sql
# Verify it worked
npx wrangler d1 execute cybersmrt-store-dev --command "SELECT * FROM users LIMIT 1"

# 3. Test in testing
npx wrangler d1 execute cybersmrt-store-test --file=./migrations/002_add_user_preferences.sql
# Verify it worked

# 4. BACKUP production database first
npx wrangler d1 export cybersmrt-store --remote --output=./backups/backup-$(date +%Y%m%d-%H%M%S).sql

# 5. Run in production
npx wrangler d1 execute cybersmrt-store --remote --file=./migrations/002_add_user_preferences.sql

# 6. Verify production
npx wrangler d1 execute cybersmrt-store --remote --command "SELECT * FROM users LIMIT 1"
```

---

### Hotfix Workflow (Emergency Production Fixes)

For critical production bugs that can't wait:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-checkout-bug

# 2. Make minimal fix
# Edit only what's necessary to fix the bug

# 3. Test locally
cd workers/store-api
npx wrangler dev
# Verify fix works

# 4. Deploy directly to production (skip dev/test for emergencies)
npx wrangler deploy

# 5. Verify fix in production
npx wrangler tail
# Test the fixed functionality

# 6. Commit and merge
git add .
git commit -m "hotfix: fix critical checkout bug"
git push origin hotfix/critical-checkout-bug

# Create PR and merge to main immediately
git checkout main
git merge hotfix/critical-checkout-bug
git push origin main

# 7. Backport to dev/test environments
npx wrangler deploy --env development
npx wrangler deploy --env testing
```

---

### Environment Testing Matrix

| What to Test | Local | Dev | Test | Prod |
|--------------|-------|-----|------|------|
| Code syntax | ✅ | ✅ | ✅ | ✅ |
| Basic functionality | ✅ | ✅ | ✅ | ✅ |
| Database queries | ✅ | ✅ | ✅ | ✅ |
| Stripe test payments | ✅ | ✅ | ✅ | ❌ |
| Stripe live payments | ❌ | ❌ | ❌ | ✅ |
| Email delivery | ⚠️ | ✅ | ✅ | ✅ |
| Printify orders | ⚠️ | ⚠️ | ✅ | ✅ |
| Load testing | ❌ | ❌ | ✅ | ❌ |
| Cross-browser | ⚠️ | ⚠️ | ✅ | ✅ |
| Mobile testing | ⚠️ | ⚠️ | ✅ | ✅ |
| Security testing | ❌ | ❌ | ✅ | ❌ |

✅ = Required
⚠️ = Optional/Limited
❌ = Not applicable

---

### Common Scenarios

#### **Scenario 1: Simple Bug Fix**
```bash
# Local → Dev → Test → Prod
git checkout -b fix/button-alignment
# Make fix
npx wrangler dev  # Test locally
git commit && git push
npx wrangler deploy --env development  # Test in dev
npx wrangler deploy --env testing      # QA in test
git checkout main && git merge fix/button-alignment
npx wrangler deploy  # Deploy to prod
```

#### **Scenario 2: New Feature with Database Changes**
```bash
# Create migration + feature code
git checkout -b feature/user-preferences
# Write migration + code
npx wrangler dev  # Local test
npx wrangler d1 execute cybersmrt-store-dev --file=./migrations/002_prefs.sql
npx wrangler deploy --env development
# Test thoroughly in dev
npx wrangler d1 execute cybersmrt-store-test --file=./migrations/002_prefs.sql
npx wrangler deploy --env testing
# QA approval
git checkout main && git merge feature/user-preferences
npx wrangler d1 export cybersmrt-store --remote --output=backup.sql  # BACKUP!
npx wrangler d1 execute cybersmrt-store --remote --file=./migrations/002_prefs.sql
npx wrangler deploy
```

#### **Scenario 3: Pages-Only Change (No Worker)**
```bash
# Just HTML/CSS/JS changes
git checkout -b feature/new-landing-page
# Make changes to /pages or /assets
git commit && git push origin feature/new-landing-page
# Preview at: https://feature-new-landing-page.cybersmrt.pages.dev
# After approval:
git checkout main && git merge feature/new-landing-page
git push origin main
# Auto-deploys to cybersmrt.org
```

---

### Key Principles

1. **Always flow: Local → Dev → Test → Prod**
2. **Never skip testing environment** (except true emergencies)
3. **Always backup before production migrations**
4. **Monitor production for 15 minutes after deployment**
5. **Keep dev/test data realistic** but not real user data
6. **Use Stripe test mode** everywhere except production
7. **Test webhooks in test environment** before production
8. **Have a rollback plan** before every production deployment

## Testing Strategy

### Development Environment
- Use for active feature development
- Connected to Stripe test mode
- Local D1 database or dev remote database
- Can break things without consequences

### Testing Environment
- Use for QA and staging
- Connected to Stripe test mode
- Separate test database with realistic data
- Should mirror production configuration

### Production Environment
- Live site with real users
- Real Stripe payments
- Production database
- Only deploy tested, stable code

## Quick Reference

| Task | Command |
|------|---------|
| Deploy to prod | `npx wrangler deploy` |
| Deploy to dev | `npx wrangler deploy --env development` |
| Deploy to test | `npx wrangler deploy --env testing` |
| Run locally | `npx wrangler dev` |
| View prod logs | `npx wrangler tail` |
| View dev logs | `npx wrangler tail --env development` |
| Run DB query (prod) | `npx wrangler d1 execute cybersmrt-store --remote --command "SELECT * FROM orders"` |
| Run DB query (dev) | `npx wrangler d1 execute cybersmrt-store-dev --command "SELECT * FROM orders"` |

## Best Practices

1. **Never test payments in production** - Always use Stripe test mode in dev/test
2. **Keep secrets separate** - Use different API keys for each environment
3. **Use feature branches** - Develop in branches, merge to main for production
4. **Test migrations** - Run migrations in dev/test before production
5. **Monitor production** - Use `wrangler tail` and Cloudflare analytics
6. **Backup production data** - Regularly export D1 database
7. **Use environment variables** - Never hardcode environment-specific values

## Troubleshooting

### Worker not updating after deploy
```bash
# Clear cache and redeploy
npx wrangler deploy --env development --force
```

### Database binding not found
```bash
# Check database ID matches wrangler.toml
npx wrangler d1 list
```

### Secrets not available
```bash
# List secrets for environment
npx wrangler secret list --env development
```

## Next Steps

1. Create dev and test databases
2. Update wrangler.toml with new database IDs
3. Set up dev/test secrets
4. Configure Stripe test webhooks
5. Test deployment to each environment
6. Set up CI/CD pipeline (optional)
