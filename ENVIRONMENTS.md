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
