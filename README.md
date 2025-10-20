# CyberSmrt Website

**Internal Development Repository**

Official website and infrastructure for CyberSmrt - A Service-Disabled Veteran-Owned 501(c)(3) Cybersecurity Nonprofit dedicated to securing the underserved.

**⚠️ PRIVATE REPOSITORY** - For internal team use only. Do not share access or credentials.

## 🛡️ Mission

CyberSmrt bridges the cybersecurity equity gap by delivering accessible, high-quality education and affordable cybersecurity services to nonprofits, schools, and small businesses.

## 🌐 Public Website

The public-facing website is at: [https://cybersmrt.pages.dev](https://cybersmrt.pages.dev)

This repository contains the internal development source code, infrastructure, and documentation.

## 📁 Repository Structure

```
cybersmrt-web/
├── assets/              # Static assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── pages/               # Website pages
│   ├── about/
│   ├── programs/
│   ├── blog/
│   ├── news/
│   ├── resources/
│   ├── tools/           # Interactive security tools (QR scanner, etc.)
│   ├── legal/           # Privacy Policy, Terms of Service
│   └── get-involved/
├── downloads/           # Downloadable resources
├── partials/            # Reusable components (header, footer)
├── workers/             # Cloudflare Workers (serverless backend)
│   ├── qr-proxy/        # QR code security scanner API
│   └── auth/            # User authentication service
├── migrations/          # D1 database schema migrations
├── tests/               # Load testing infrastructure
├── docs/                # Documentation
│   └── database/        # Database documentation
└── README.md
```

## 🚀 Development

### Prerequisites

- Node.js and npm (for Cloudflare Workers development)
- Wrangler CLI: `npm install -g wrangler`
- Git
- Python (for local static server) or Live Server extension for VS Code

### Local Development

**For CyberSmrt team members only.**

1. Ensure you have repository access (contact tony@cybersmrt.org)

2. Clone the repository:

```bash
git clone https://github.com/CyberSmrtOrg/cybersmrt-web.git
cd cybersmrt-web
```

2. Start local development server:

**Option A: Python**
```bash
python -m http.server 8000
# Open http://localhost:8000
```

**Option B: VS Code Live Server**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

3. For Workers development:

```bash
cd workers/qr-proxy
npx wrangler dev
# Worker available at http://localhost:8787
```

### Deployment

- **Frontend:** Auto-deploys to Cloudflare Pages on every push to `main` branch
- **Workers:** Deploy with `npx wrangler deploy` from worker directory
- **Database:** Migrations applied via `./migrations/apply-all.sh remote`

## 🗄️ Database

User authentication and data storage using Cloudflare D1 (SQLite).

### Setup Database

```bash
# Create D1 database
npx wrangler d1 create cybersmrt-users

# Apply migrations locally
./migrations/apply-all.sh local

# Apply migrations to production
./migrations/apply-all.sh remote
```

### Database Schema

7 tables for complete user management:
- **users** - Core user accounts
- **oauth_providers** - OAuth connections (Google, GitHub, etc.)
- **sessions** - Active user sessions
- **email_verification_tokens** - Email confirmation
- **password_reset_tokens** - Password recovery
- **security_logs** - Security event audit trail
- **user_profiles** - Extended user information

See [docs/database/DATABASE_SCHEMA.md](docs/database/DATABASE_SCHEMA.md) for complete schema documentation.

See [docs/database/DATABASE_DEPLOYMENT.md](docs/database/DATABASE_DEPLOYMENT.md) for deployment guide.

## 🧪 Testing

Automated load testing validates performance and security controls.

### Quick Start

```bash
cd tests
./run-tests.sh
```

### Test Scenarios

- **Normal Load** - Baseline performance validation (100 req/min)
- **Burst Traffic** - Spike testing (1000 req/min)
- **DDoS Simulation** - Stress testing under extreme load

### What Gets Tested

- ✅ Response times and performance under load
- ✅ Rate limiting effectiveness
- ✅ SSRF protection and security controls
- ✅ System stability and reliability

### Database Testing

```bash
# Test D1 CRUD operations
npx wrangler dev tests/test-db.js
# Visit: http://localhost:8787/test-db
```

See [tests/README.md](tests/README.md) for complete testing documentation.

## 🛠️ Tech Stack

### Frontend
- **HTML/CSS/JavaScript** - Vanilla, no frameworks
- **Orbitron Font** - Brand typography
- **Responsive Design** - Mobile-first approach

### Backend & Infrastructure
- **Cloudflare Pages** - Static site hosting
- **Cloudflare Workers** - Serverless edge computing
- **Cloudflare D1** - SQLite database at the edge
- **Cloudflare KV** - Key-value storage for rate limiting
- **Cloudflare Analytics** - Usage tracking

### Security & APIs
- **VirusTotal API** - URL/file threat intelligence
- **Custom SSRF Protection** - Prevent server-side request forgery
- **Rate Limiting** - DDoS and abuse prevention
- **bcrypt** - Password hashing
- **OAuth 2.0** - Third-party authentication (planned)

### Development & Testing
- **Wrangler** - Cloudflare Workers CLI
- **k6** - Load testing framework
- **jq** - JSON processing for test results
- **Git** - Version control

## 📚 Documentation

### Database
- [Schema Design](docs/database/DATABASE_SCHEMA.md) - Complete database schema
- [Deployment Guide](docs/database/DATABASE_DEPLOYMENT.md) - Setup and deployment

### Testing
- [Load Testing Guide](tests/README.md) - Performance testing documentation
- [Test History](tests/HISTORY.md) - Automated test results tracking

### Legal
- [Privacy Policy](pages/legal/privacy-policy.html) - GDPR/CCPA compliant
- [Terms of Service](pages/legal/terms-of-service.html) - Usage terms and conditions

## 🔒 Security Features

### QR Code Scanner
- SSRF protection with DNS validation
- Rate limiting (20 requests/minute per IP)
- VirusTotal integration for threat detection
- Sandbox preview for suspicious URLs
- No data storage - privacy by design

### User Authentication (Planned)
- Bcrypt password hashing (cost factor 10)
- Email verification tokens (24-hour expiry)
- Password reset tokens (1-hour expiry)
- Session management with automatic expiration
- Security event logging
- Rate limiting on login attempts

### Infrastructure
- TLS/SSL encryption for all traffic
- Content Security Policy headers
- DDoS protection via Cloudflare
- Automated security monitoring

## 👥 Team & Access

**This is a private repository for CyberSmrt internal development only.**

### Team Members

Access is limited to CyberSmrt staff and authorized contractors. Contact tony@cybersmrt.org for access requests.

### Development Guidelines

- Follow existing code patterns and structure
- Test all changes locally before pushing
- Run load tests after significant changes: `cd tests && ./run-tests.sh`
- Document new features in relevant `/docs` files
- Update this README when adding new major components

### Deployment Access

- **Cloudflare Dashboard:** Contact admin for account access
- **GitHub Repository:** Invite-only access
- **Production Deployment:** Auto-deploys from `main` branch

### Security & Credentials

**⚠️ CRITICAL:** Never commit sensitive data to this repository:
- API keys, tokens, or secrets
- Database credentials
- OAuth client secrets
- User data or PII

Use environment variables and `.env` files (already in `.gitignore`).

**Always in `.gitignore`:**
```
.env
.dev.vars
.wrangler/
node_modules/
tests/results/
tests/HISTORY.md
*.log
```

## 📊 Project Status

### ✅ Completed
- [x] Static website with responsive design
- [x] QR code security scanner with VirusTotal integration
- [x] Rate limiting and SSRF protection
- [x] Load testing infrastructure
- [x] Privacy Policy and Terms of Service
- [x] D1 database schema and migrations
- [x] Security event logging

### 🚧 In Progress
- [ ] User authentication system
- [ ] OAuth provider integration
- [ ] User dashboard
- [ ] Email verification system

### 📋 Planned
- [ ] Mobile app (React Native)
- [ ] Password strength checker tool
- [ ] Breach notification system
- [ ] Educational content management system

## 📞 Contact

**For CyberSmrt Staff & Authorized Contractors:**
- **Internal Questions:** tony@cybersmrt.org
- **Repository Access:** Contact admin

**For General Public:**
- **Website:** [www.cybersmrt.org](https://www.cybersmrt.org)
- **General Email:** info@cybersmrt.org
- **LinkedIn:** [CyberSmrt](https://www.linkedin.com/company/cybersmrt)

## 📄 License

© 2025 CyberSmrt. All rights reserved.

**EIN:** 33-3117801
**Status:** Service-Disabled Veteran-Owned 501(c)(3) Nonprofit

---

**🛡️ Securing the underserved, one community at a time.**