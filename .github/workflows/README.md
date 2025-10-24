# GitHub Actions CI/CD Workflows

## Overview

This directory contains GitHub Actions workflows for automated testing and deployment of the CyberSmrt platform.

## Workflows

### Authentication & Profile Workers

#### `deploy-auth-worker.yml`
- **Triggers**: Push to `main` branch affecting `workers/auth/**`
- **Manual**: Via workflow_dispatch
- **Steps**:
  1. Run tests and linting
  2. Security audit (npm audit)
  3. Deploy to Cloudflare Workers
  4. Health check verification
  5. Test critical endpoints

#### `deploy-profile-worker.yml`
- **Triggers**: Push to `main` branch affecting `workers/profile/**`
- **Manual**: Via workflow_dispatch
- **Steps**:
  1. Run tests and linting
  2. Security audit
  3. Deploy to Cloudflare Workers
  4. Health check verification

### Other Workers

#### `deploy-qr-worker.yml`
- Deploys QR Proxy Worker
- Includes SSRF protection testing

### Maintenance

#### `update-sitemap.yml`
- Automatically updates site sitemap
- Scheduled and on-demand

#### `update-blog-data.yml`
- Updates blog metadata index
- Runs on content changes

#### `lint.yml`
- Code quality checks
- Runs on pull requests

---

## Required GitHub Secrets

### Cloudflare Configuration

Add these secrets in GitHub repository settings:
`Settings → Secrets and variables → Actions → New repository secret`

#### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token for Wrangler deployments | Cloudflare Dashboard → My Profile → API Tokens → Create Token (Use template: "Edit Cloudflare Workers") |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard → Workers → Overview (right sidebar) |
| `JWT_SECRET` | Secret for JWT signing (HS256) | Generate with: `openssl rand -hex 32` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console → APIs & Services → Credentials |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | GitHub Settings → Developer settings → OAuth Apps |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth app secret | Azure Portal → App registrations |

#### Optional Secrets (For QR Worker)

| Secret Name | Description |
|-------------|-------------|
| `VIRUSTOTAL_API_KEY` | VirusTotal API key for malware scanning |
| `ADMIN_TOKEN` | Admin authentication token for QR proxy |

### Setting Up Secrets

```bash
# Example: Add Cloudflare API token
# 1. Go to GitHub repository
# 2. Settings → Secrets and variables → Actions
# 3. Click "New repository secret"
# 4. Name: CLOUDFLARE_API_TOKEN
# 5. Value: <your-token>
# 6. Click "Add secret"

# Repeat for each secret listed above
```

---

## Manual Deployment

### Deploy via GitHub Actions UI

1. Go to GitHub repository
2. Click "Actions" tab
3. Select workflow (e.g., "Deploy Auth Worker")
4. Click "Run workflow" dropdown
5. Select `main` branch
6. Click "Run workflow" button

### Deploy via GitHub CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from: https://cli.github.com/

# Authenticate
gh auth login

# Trigger auth worker deployment
gh workflow run deploy-auth-worker.yml --ref main

# Trigger profile worker deployment
gh workflow run deploy-profile-worker.yml --ref main

# Check status
gh run list --workflow=deploy-auth-worker.yml
```

### Deploy via API

```bash
# Get your GitHub Personal Access Token
# Settings → Developer settings → Personal access tokens → Generate new token
# Scope required: workflow

curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/CyberSmrtOrg/cybersmrt-web/actions/workflows/deploy-auth-worker.yml/dispatches \
  -d '{"ref":"main"}'
```

---

## Workflow Features

### Test Stage
- **Linting**: Code style and syntax checks
- **Unit Tests**: Run test suites (if present)
- **Security Audit**: Dependency vulnerability scanning
- **Parallel Execution**: Tests run before deployment

### Deploy Stage
- **Dependency Installation**: Clean install via `npm ci`
- **Secret Management**: Securely injects secrets into Wrangler
- **Deployment**: Publishes worker to Cloudflare
- **Health Verification**: Automated health checks post-deployment

### Notifications
- **Success**: Green checkmark, endpoint URLs displayed
- **Failure**: Red X, rollback instructions provided
- **Logs**: Full deployment logs available in Actions tab

---

## Deployment Monitoring

### View Deployment Status

```bash
# GitHub CLI
gh run list --workflow=deploy-auth-worker.yml --limit 5

# Or visit:
# https://github.com/CyberSmrtOrg/cybersmrt-web/actions
```

### Deployment Logs

1. Go to Actions tab
2. Click on workflow run
3. Click on job name (e.g., "Deploy Auth Worker")
4. View step-by-step logs

### Post-Deployment Verification

```bash
# Check auth worker
curl https://auth.cybersmrt.org/health

# Check profile worker
curl https://profile.cybersmrt.org/health

# View live logs
npx wrangler tail --name cybersmrt-auth
```

---

## Rollback Procedures

### Automatic Rollback

If health checks fail, workflow will:
1. Report failure
2. Display rollback command
3. Exit with error code

### Manual Rollback

```bash
# Via Wrangler CLI
cd workers/auth
npx wrangler rollback

# Or deploy specific version
git checkout <previous-commit>
npx wrangler deploy
git checkout main

# Via GitHub Actions
# 1. Find last successful commit
# 2. Manually trigger workflow at that commit
# 3. Or revert commit and push
```

---

## Workflow Customization

### Modify Triggers

Edit workflow file to change when it runs:

```yaml
on:
  push:
    branches: [main, develop]  # Add develop branch
  pull_request:
    branches: [main]  # Run on PRs
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday 2 AM UTC
```

### Add Environment Variables

```yaml
- name: Deploy to Cloudflare Workers
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    environment: 'production'  # Add environment
  env:
    NODE_ENV: production
    LOG_LEVEL: info
```

### Add Notification Integrations

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Deployment failed for ${{ github.repository }}"
      }
```

---

## Troubleshooting

### Common Issues

#### Error: "Missing required secret"

**Solution**:
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is added to repository (not organization)
3. Re-add secret if corrupted

#### Error: "Deployment failed: unauthorized"

**Solution**:
1. Verify `CLOUDFLARE_API_TOKEN` has correct permissions
2. Token needs: `Workers Scripts:Edit` permission
3. Regenerate token if expired

#### Error: "Health check failed"

**Solution**:
1. Check worker logs: `npx wrangler tail`
2. Verify deployment completed successfully
3. Check Cloudflare dashboard for errors
4. May need to increase wait time in workflow

#### Error: "npm ci failed"

**Solution**:
1. Verify `package-lock.json` is committed
2. Check for dependency conflicts
3. Run `npm install` locally to update lock file

### Debug Mode

Enable debug logging in GitHub Actions:

1. Repository Settings → Secrets → Add:
   - Name: `ACTIONS_STEP_DEBUG`
   - Value: `true`

2. Repository Settings → Secrets → Add:
   - Name: `ACTIONS_RUNNER_DEBUG`
   - Value: `true`

3. Re-run workflow to see verbose logs

---

## Best Practices

### Branch Strategy

```
main (production)
  ↑
  Pull Request (with tests)
  ↑
develop (staging)
  ↑
feature/* (development)
```

**Recommended**:
- Deploy to staging from `develop` branch
- Deploy to production from `main` branch
- Require PR approval before merging to `main`

### Secret Rotation

Rotate secrets quarterly:

```bash
# Generate new JWT secret
openssl rand -hex 32

# Update in GitHub Secrets
# Update in Cloudflare Workers via workflow
# Or manual: echo "new-secret" | npx wrangler secret put JWT_SECRET
```

### Deployment Windows

Configure deployment restrictions:

```yaml
- name: Check deployment window
  run: |
    HOUR=$(date -u +%H)
    if [ $HOUR -ge 22 ] || [ $HOUR -le 6 ]; then
      echo "❌ Deployments blocked during off-hours (22:00-06:00 UTC)"
      exit 1
    fi
```

### Approval Gates (For Production)

Require manual approval for production deployments:

1. Repository Settings → Environments → New environment
2. Name: `production`
3. Enable "Required reviewers"
4. Add team members who can approve

Then update workflow:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires approval
```

---

## Performance Optimization

### Cache Node Modules

Already configured:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Caches node_modules between runs
    cache-dependency-path: 'workers/auth/package.json'
```

### Conditional Execution

Only run when relevant files change:

```yaml
on:
  push:
    paths:
      - 'workers/auth/**'
      - '.github/workflows/deploy-auth-worker.yml'
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

---

## Monitoring & Alerts

### GitHub Status Badges

Add to README.md:

```markdown
![Deploy Auth Worker](https://github.com/CyberSmrtOrg/cybersmrt-web/actions/workflows/deploy-auth-worker.yml/badge.svg)
![Deploy Profile Worker](https://github.com/CyberSmrtOrg/cybersmrt-web/actions/workflows/deploy-profile-worker.yml/badge.svg)
```

### Email Notifications

GitHub automatically sends emails for:
- Workflow failures (if you initiated the run)
- Scheduled workflow failures
- Manual workflow results

Configure in: `Settings → Notifications → Actions`

---

## Security

### Secret Scanning

GitHub automatically scans for:
- Exposed API tokens
- Private keys
- OAuth tokens
- Other secrets

If detected, you'll receive an alert.

### Dependency Scanning

Workflows include `npm audit`:

```yaml
- name: Security audit
  run: npm audit --audit-level=high
  continue-on-error: true  # Won't block deployment
```

Set to `false` to block on vulnerabilities.

---

## Workflow Metrics

Track deployment metrics:

- **Deployment Frequency**: Check Actions tab
- **Lead Time**: Time from commit to production
- **Mean Time to Recovery (MTTR)**: Rollback time
- **Change Failure Rate**: Failed vs successful deployments

---

## Resources

- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Wrangler Action**: https://github.com/cloudflare/wrangler-action
- **Cloudflare Workers**: https://workers.cloudflare.com/
- **GitHub CLI**: https://cli.github.com/

---

**Last Updated**: October 23, 2025
**Maintained By**: CyberSmrt DevOps Team
