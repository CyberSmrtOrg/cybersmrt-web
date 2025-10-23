# Email Verification System - Test Plan

## Deployment Status

✅ **Worker Deployed Successfully**
- Deployment ID: `2b06b569-6d12-4a78-a5a5-946b698942c8`
- Deployed at: 2025-10-23 20:51:45 UTC
- Routes: `auth.cybersmrt.org/*` and `cybersmrt-auth.cybersmrt.workers.dev`

## Pre-Testing Checklist

### 1. Production Secrets Configuration

Before testing, ensure all secrets are set in production:

```bash
cd workers/auth

# Required for email verification
wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted

# Already set (verify they exist)
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 2. DNS Configuration

Verify that `auth.cybersmrt.org` is properly configured:
- Check Cloudflare DNS has the correct worker route
- Test: `curl https://auth.cybersmrt.org/health`
- Expected: `{"success":true,"status":"healthy","timestamp":"..."}`

If auth.cybersmrt.org isn't working, use workers.dev URL for testing:
- `https://cybersmrt-auth.cybersmrt.workers.dev`

### 3. Database Migrations

Ensure all database migrations have been applied:

```bash
cd workers/auth/migrations
./apply-all.sh remote
```

## Test Scenarios

### Test 1: User Registration with Email Verification

**Endpoint:** `POST /register`

**Request:**
```bash
curl -X POST https://auth.cybersmrt.org/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "displayName": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "displayName": "Test User",
    "role": "user"
  },
  "session": {
    "id": "session-id",
    "expiresAt": 1234567890
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

**Expected Email:** Verification email sent to test@example.com

**Verify:**
- ✅ User created in database
- ✅ `email_verified = 0` initially
- ✅ Verification token created in `email_verification_tokens` table
- ✅ Email sent via Resend with verification link
- ✅ Security log entry created for registration

---

### Test 2: Email Verification

**Endpoint:** `POST /verify-email`

Get the token from the verification email link (`?token=xxx`), then:

```bash
curl -X POST https://auth.cybersmrt.org/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-from-email-here"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "userId": "uuid-here",
    "email": "test@example.com",
    "displayName": "Test User"
  }
}
```

**Expected Email:** Welcome email sent to user

**Verify:**
- ✅ `email_verified = 1` in database
- ✅ Verification token deleted from `email_verification_tokens`
- ✅ Welcome email sent via Resend
- ✅ Security log entry for `email_verified`

---

### Test 3: Resend Verification Email

**Endpoint:** `POST /resend-verification`

```bash
curl -X POST https://auth.cybersmrt.org/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If an unverified account exists with this email, a verification link has been sent"
}
```

**Verify:**
- ✅ Old verification token deleted
- ✅ New verification token created
- ✅ New verification email sent
- ✅ Security log entry for `email_verification_resent`

---

### Test 4: Expired Token

Wait 24+ hours or manually set token expiry in database:

```sql
UPDATE email_verification_tokens
SET expires_at = 0
WHERE token = 'your-token-here';
```

Then try to verify:

```bash
curl -X POST https://auth.cybersmrt.org/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "expired-token"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid or expired verification token"
}
```

---

### Test 5: Already Verified Account

Try to resend verification for an already verified account:

```bash
curl -X POST https://auth.cybersmrt.org/resend-verification \
  -H "Content-Type": application/json" \
  -d '{
    "email": "verified@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Email is already verified"
}
```

---

### Test 6: Email Enumeration Prevention

Try to resend verification for a non-existent account:

```bash
curl -X POST https://auth.cybersmrt.org/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If an unverified account exists with this email, a verification link has been sent"
}
```

**Verify:**
- ✅ No email sent
- ✅ Same response as successful resend (prevents email enumeration)
- ✅ Response timing similar to success case (~100ms)

---

### Test 7: Frontend Verification Flow

1. Open: `https://cybersmrt.org/verify-email.html?token=YOUR_TOKEN_HERE`

**Expected UI Flow:**
1. Loading spinner displays
2. API call to `/verify-email` made automatically
3. On success:
   - Green checkmark displayed
   - Success message shown
   - "Go to Dashboard" button visible
4. On error:
   - Red X displayed
   - Error message shown
   - "Request new verification email" link visible
   - "Go to Login" button visible

**Test Resend Form:**
1. Click "Request a new verification email"
2. Enter email address
3. Click "Send Verification Email"
4. Verify success/error message displays

---

### Test 8: Scheduled Token Cleanup

**Trigger:** Runs daily at 2 AM UTC (or trigger manually)

```bash
cd workers/auth
npx wrangler dev --test-scheduled
```

Then in the console:
```bash
curl "http://localhost:8787/__scheduled?cron=0+2+*+*+*"
```

**Expected:**
- ✅ Expired verification tokens deleted
- ✅ Expired password reset tokens deleted
- ✅ Expired sessions deleted
- ✅ Console logs show counts

---

## Database Verification Queries

Connect to D1 database and run:

```sql
-- Check user was created
SELECT id, email, email_verified, created_at
FROM users
WHERE email = 'test@example.com';

-- Check verification token
SELECT token, expires_at, created_at
FROM email_verification_tokens
WHERE user_id = 'user-id-here';

-- Check security logs
SELECT event_type, metadata, created_at
FROM security_logs
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC;
```

---

## Email Verification Checklist

### Verification Email
- [ ] Subject: "Verify Your CyberSmrt Email"
- [ ] From: "CyberSmrt <noreply@cybersmrt.org>"
- [ ] Contains "Welcome to CyberSmrt!" header
- [ ] Contains "Verify Email Address" button
- [ ] Link format: `https://cybersmrt.org/verify-email?token=...`
- [ ] States "This link will expire in 24 hours"
- [ ] Has proper branding and styling

### Welcome Email
- [ ] Subject: "Welcome to CyberSmrt - Let's Secure Your Digital Life!"
- [ ] From: "CyberSmrt <noreply@cybersmrt.org>"
- [ ] Contains user's display name
- [ ] Lists all 4 features (QR Scanner, Password Checker, Phishing Detector, Learning)
- [ ] Contains "Go to Dashboard" button
- [ ] Has CyberSmrt nonprofit status footer

---

## Security Testing

### Rate Limiting
Test registration endpoint rate limiting:

```bash
for i in {1..25}; do
  curl -X POST https://auth.cybersmrt.org/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"Test123!@#\"}"
  echo ""
done
```

Expected: Rate limit error after 20 requests

### Password Validation
Test password strength requirements:

```bash
# Too short
curl -X POST https://auth.cybersmrt.org/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1!"}'

# No uppercase
curl -X POST https://auth.cybersmrt.org/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123!@#"}'

# No special char
curl -X POST https://auth.cybersmrt.org/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

Expected: All should fail with specific error messages

---

## Rollback Plan

If issues are found:

```bash
cd workers/auth

# Roll back to previous version
wrangler deployments list
wrangler rollback <version-id>
```

---

## Success Criteria

- [ ] User can register and receive verification email
- [ ] Verification link works and marks email as verified
- [ ] Welcome email sent after verification
- [ ] Resend verification works for unverified accounts
- [ ] Expired tokens are rejected
- [ ] Already verified accounts show appropriate message
- [ ] Email enumeration is prevented
- [ ] Frontend verification page works correctly
- [ ] Scheduled cleanup removes expired tokens
- [ ] Rate limiting works
- [ ] Password validation works
- [ ] Security logs are created
- [ ] No secrets exposed in responses
- [ ] CORS headers properly set

---

## Next Steps After Testing

Once all tests pass:

1. Update login.html to show verification reminder
2. Update dashboard.html to show unverified warning banner
3. Add email verification requirement to protected routes
4. Document API endpoints
5. Move to Task 1.2: Two-Factor Authentication (2FA)
