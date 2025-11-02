# CyberSmrt Admin Worker

Administrative dashboard worker for managing the CyberSmrt platform.

## Overview

The admin worker provides a secure web interface for administrative tasks:

- **User Management**: View, edit, and manage user accounts
- **Analytics Dashboard**: Monitor platform usage and metrics
- **Security Logs**: Review authentication events and security incidents
- **Content Management**: Manage site content and configurations
- **System Monitoring**: Check system health and performance

## Deployment

The worker is deployed to: `https://admin.cybersmrt.org`

### Prerequisites

1. Cloudflare account with Workers enabled
2. JWT_SECRET configured (same as auth worker)
3. Admin role assigned to your user account

### Deploy Commands

```bash
# Deploy to production
cd workers/admin
npx wrangler deploy --env production

# View logs
npx wrangler tail --env production

# Rollback deployment
npx wrangler rollback --name cybersmrt-admin
```

## Authentication

The admin dashboard requires:

1. Valid user account with `role: 'admin'` in JWT payload
2. Active session with JWT token
3. Token stored in localStorage

### Setting Admin Role

To grant admin access to a user, update their JWT payload to include:

```json
{
  "userId": "user-id",
  "email": "admin@example.com",
  "role": "admin",
  "exp": 1234567890
}
```

## API Endpoints

### Public Endpoints

- `GET /` - Admin dashboard HTML interface
- `GET /health` - Health check endpoint
- `GET /robots.txt` - Search engine exclusion rules

### Protected API Endpoints (require admin JWT)

- `POST /api/verify` - Verify admin token validity
- `GET /api/stats` - Dashboard statistics
- `GET /api/users` - List all users (TODO)
- `GET /api/security-logs` - Security event logs (TODO)

## Configuration

### Environment Variables

Set in `wrangler.toml`:

- `FRONTEND_ORIGIN`: Main site URL (https://cybersmrt.org)
- `AUTH_API_URL`: Authentication API URL (https://auth.cybersmrt.org)

### Secrets

Set via Wrangler CLI:

```bash
# Set JWT secret (must match auth worker)
npx wrangler secret put JWT_SECRET --env production
```

## Security Features

- **JWT Verification**: All API endpoints verify admin role
- **CORS Protection**: Restricts origins to allowed domains
- **X-Robots-Tag**: Prevents search engine indexing
- **Session Management**: Secure token storage in localStorage
- **Role-Based Access**: Only admin role can access dashboard

## Development

### Local Development

```bash
# Start local development server
npx wrangler dev --env production

# Access at http://localhost:8787
```

### Testing

```bash
# Test health endpoint
curl https://admin.cybersmrt.org/health

# Test dashboard (should return HTML)
curl https://admin.cybersmrt.org/

# Test API with admin token
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     https://admin.cybersmrt.org/api/stats
```

## Future Enhancements

- [ ] Implement user management CRUD operations
- [ ] Add database queries for real-time statistics
- [ ] Build security logs viewer with filtering
- [ ] Create content management interface
- [ ] Add system monitoring dashboards
- [ ] Implement audit logging for admin actions
- [ ] Add role management interface
- [ ] Build analytics visualization charts
- [ ] Add email notification settings
- [ ] Create backup and restore tools

## Architecture

```
┌─────────────────┐
│  Admin Browser  │
└────────┬────────┘
         │ HTTPS
         │ JWT Token
         ▼
┌─────────────────┐
│  Admin Worker   │
│ admin.cybersmrt │
└────────┬────────┘
         │
         ├──────────► Auth Worker (verify token)
         │
         ├──────────► D1 Database (user data)
         │
         └──────────► R2 Storage (uploads)
```

## Monitoring

### Health Checks

The `/health` endpoint returns:

```json
{
  "success": true,
  "status": "healthy",
  "service": "admin",
  "timestamp": "2025-11-02T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Logging

View real-time logs:

```bash
npx wrangler tail --env production
```

## Troubleshooting

### Cannot Login

1. Verify user has `role: 'admin'` in JWT
2. Check JWT_SECRET matches auth worker
3. Clear localStorage and try again

### API Returns 401

1. Check Authorization header format: `Bearer TOKEN`
2. Verify token hasn't expired
3. Ensure JWT_SECRET is set correctly

### Dashboard Not Loading

1. Check worker deployment status
2. Verify DNS routing to admin.cybersmrt.org
3. Check browser console for errors

## License

Proprietary - CyberSmrt Organization
