# How to Promote a User to Admin

Your auth worker now includes the `role` field in JWT tokens, enabling role-based access control for the admin dashboard at `https://admin.cybersmrt.org`.

## Option 1: Via Cloudflare D1 Dashboard (Recommended)

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **D1**
3. Click on your `cybersmrt-users` database
4. Click the **Console** tab
5. Run this SQL query (replace with your email):

```sql
-- Promote user to admin role
UPDATE users
SET role = 'admin',
    promoted_at = strftime('%s', 'now'),
    updated_at = strftime('%s', 'now')
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, display_name, role, promoted_at
FROM users
WHERE email = 'your-email@example.com';
```

## Option 2: Via Wrangler CLI

```bash
# Navigate to auth worker directory
cd workers/auth

# Execute SQL using Wrangler
npx wrangler d1 execute cybersmrt-users --remote --command="UPDATE users SET role = 'admin', promoted_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now') WHERE email = 'your-email@example.com';"

# Verify the change
npx wrangler d1 execute cybersmrt-users --remote --command="SELECT id, email, display_name, role FROM users WHERE email = 'your-email@example.com';"
```

## Option 3: Via Admin API (Coming Soon)

Once you have at least one admin user, you can use the admin API endpoints to promote other users:

```bash
# Promote another user (requires admin JWT token)
curl -X POST https://auth.cybersmrt.org/admin/users/{userId}/promote \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

## Available Roles

- `user` - Default role for all new users
- `admin` - Full administrative access
- `super_admin` - Super admin with all permissions (future use)

## After Promoting to Admin

1. **Log out** of your account completely
2. **Log back in** to get a new JWT with the `admin` role
3. Visit `https://admin.cybersmrt.org`
4. You should now have full access to the admin dashboard!

## Verify JWT Contains Role

You can decode your JWT at [jwt.io](https://jwt.io) to verify it contains the role field:

```json
{
  "sub": "user-id",
  "email": "your-email@example.com",
  "role": "admin",
  "type": "access",
  "iat": 1234567890,
  "iss": "cybersmrt.org",
  "aud": "cybersmrt-users",
  "exp": 1234567890
}
```

## Troubleshooting

### "Access denied - admin privileges required"

1. Make sure you logged out and logged back in after the SQL update
2. Check your JWT payload at jwt.io - it should contain `"role": "admin"`
3. If the role isn't in the JWT, try clearing all cookies and sessions, then log in again

### "User not found" in database

Make sure you're using the exact email address you registered with. The query is case-sensitive for the email.

### Role reverts to 'user' after login

Check if the database column was updated successfully:

```sql
SELECT id, email, role, promoted_at, updated_at
FROM users
WHERE email = 'your-email@example.com';
```

If `role` is still `NULL` or `'user'`, the UPDATE didn't work. Make sure you're running it on the correct database.

## Demote from Admin

To remove admin access:

```sql
UPDATE users
SET role = 'user',
    promoted_at = NULL,
    promoted_by = NULL,
    updated_at = strftime('%s', 'now')
WHERE email = 'user-email@example.com';
```

## Security Notes

- Admin role grants full access to the admin dashboard
- Only promote trusted users to admin
- All admin actions should be logged (logging system already in place)
- Consider using 2FA for admin accounts
- Regularly audit admin users: `SELECT email, role, promoted_at FROM users WHERE role IN ('admin', 'super_admin');`
