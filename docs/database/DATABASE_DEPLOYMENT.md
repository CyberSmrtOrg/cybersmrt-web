# D1 Database Deployment Guide

Complete guide to set up your CyberSmrt user database.

---

## 📋 Prerequisites

- Cloudflare account (free tier is fine)
- Wrangler CLI installed: `npm install -g wrangler`
- Logged in to Wrangler: `wrangler login`

---

## 🚀 Step-by-Step Deployment

### **Step 1: Create D1 Database**

```bash
cd /c/Users/antho/Git/cybersmrt-web

# Create the database
npx wrangler d1 create cybersmrt-users
```

**Output will look like:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "cybersmrt-users"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**⚠️ IMPORTANT:** Copy the `database_id` - you'll need it!

---

### **Step 2: Update wrangler.toml**

Add the D1 configuration to your `wrangler.toml`:

```toml
# At the bottom of your existing wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "cybersmrt-users"
database_id = "YOUR_ACTUAL_DATABASE_ID"  # Replace with ID from Step 1
```

---

### **Step 3: Create Migrations Directory**

```bash
mkdir -p migrations
cd migrations
```

Create the migration files (copy from artifacts above):
- `0001_create_users_table.sql`
- `0002_create_oauth_providers_table.sql`
- `0003_create_sessions_table.sql`
- `0004_create_verification_tables.sql`
- `0005_create_security_logs_table.sql`
- `0006_create_user_profiles_table.sql`
- `apply-all.sh`

---

### **Step 4: Make Migration Script Executable**

```bash
chmod +x migrations/apply-all.sh
```

---

### **Step 5: Apply Migrations Locally (Test)**

```bash
# Apply to local development database
./migrations/apply-all.sh local
```

Expected output:
```
🗄️  Applying migrations to D1 database: cybersmrt-users (local)
================================================

📝 Applying migration: 0001_create_users_table.sql
✅ Migration applied successfully

📝 Applying migration: 0002_create_oauth_providers_table.sql
✅ Migration applied successfully

...

================================================
✅ All migrations applied successfully!
```

---

### **Step 6: Verify Local Database**

```bash
# List all tables
npx wrangler d1 execute cybersmrt-users --local --command="SELECT name FROM sqlite_master WHERE type='table'"

# Should show:
# - users
# - oauth_providers
# - sessions
# - email_verification_tokens
# - password_reset_tokens
# - security_logs
# - user_profiles
```

---

### **Step 7: Test CRUD Operations Locally**

Create `test-db.js` (from artifact above) in your project root, then:

```bash
# Start local dev server
npx wrangler dev test-db.js

# In another terminal or browser, visit:
# http://localhost:8787/test-db
```

You should see all tests passing:
```
✅ ALL TESTS PASSED!
Your D1 database is working correctly.
```

---

### **Step 8: Deploy to Production**

Once local tests pass, deploy to production:

```bash
# Apply migrations to remote database
./migrations/apply-all.sh remote

# Verify remote database
npx wrangler d1 execute cybersmrt-users --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

## 🔍 Verification Checklist

After deployment, verify:

```bash
# ✅ Check tables exist
npx wrangler d1 execute cybersmrt-users --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# ✅ Check indexes exist
npx wrangler d1 execute cybersmrt-users --remote --command="SELECT name FROM sqlite_master WHERE type='index'"

# ✅ Check table structure
npx wrangler d1 execute cybersmrt-users --remote --command="PRAGMA table_info(users)"

# ✅ Verify foreign keys are enabled
npx wrangler d1 execute cybersmrt-users --remote --command="PRAGMA foreign_keys"
```

---

## 📊 Database Management Commands

### **Query Database**

```bash
# Local
npx wrangler d1 execute cybersmrt-users --local --command="SELECT * FROM users LIMIT 10"

# Remote
npx wrangler d1 execute cybersmrt-users --remote --command="SELECT * FROM users LIMIT 10"
```

### **Run SQL File**

```bash
# Local
npx wrangler d1 execute cybersmrt-users --local --file="path/to/query.sql"

# Remote
npx wrangler d1 execute cybersmrt-users --remote --file="path/to/query.sql"
```

### **Interactive SQL Console**

```bash
# Coming soon in Wrangler
# For now, use --command for each query
```

---

## 🔒 Security Best Practices

### **Password Hashing**

Never store plain passwords. Use bcrypt:

```javascript
import bcrypt from 'bcryptjs';

// Hash password (cost factor 10-12)
const hash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### **Token Generation**

Generate secure random tokens:

```javascript
// Secure random token
const token = crypto.randomUUID();

// Or for longer tokens
const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
```

### **SQL Injection Prevention**

Always use prepared statements:

```javascript
// ✅ SAFE - Uses prepared statement
await db.prepare('SELECT * FROM users WHERE email = ?')
  .bind(email)
  .first();

// ❌ UNSAFE - Direct string concatenation
await db.prepare(`SELECT * FROM users WHERE email = '${email}'`).first();
```

---

## 📈 Performance Tips

### **Batch Operations**

```javascript
// Insert multiple records efficiently
const stmt = db.prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)');

await db.batch([
  stmt.bind(id1, email1, timestamp, timestamp),
  stmt.bind(id2, email2, timestamp, timestamp),
  stmt.bind(id3, email3, timestamp, timestamp),
]);
```

### **Index Usage**

Check if queries use indexes:

```bash
npx wrangler d1 execute cybersmrt-users --local --command="EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com'"
```

Look for "USING INDEX" in the output.

---

## 🧹 Maintenance Tasks

### **Clean Up Expired Sessions**

```sql
DELETE FROM sessions WHERE expires_at < unixepoch('now');
```

### **Archive Old Security Logs**

```sql
-- Get logs older than 90 days
SELECT * FROM security_logs WHERE created_at < unixepoch('now') - (90 * 24 * 60 * 60);

-- Delete after archiving
DELETE FROM security_logs WHERE created_at < unixepoch('now') - (90 * 24 * 60 * 60);
```

### **Delete Used Tokens**

```sql
DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL;
DELETE FROM email_verification_tokens WHERE expires_at < unixepoch('now');
```

---

## 🚨 Troubleshooting

### **Migration Failed**

```bash
# Check what went wrong
npx wrangler d1 execute cybersmrt-users --local --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"

# Drop table and retry (⚠️ USE WITH CAUTION)
npx wrangler d1 execute cybersmrt-users --local --command="DROP TABLE IF EXISTS users"
```

### **Foreign Key Errors**

```bash
# Enable foreign keys (should be on by default)
npx wrangler d1 execute cybersmrt-users --local --command="PRAGMA foreign_keys = ON"

# Check integrity
npx wrangler d1 execute cybersmrt-users --local --command="PRAGMA foreign_key_check"
```

### **Database Locked**

D1 handles locking automatically, but if issues occur:
- Wait a moment and retry
- Check for long-running queries
- Ensure only one migration runs at a time

---

## 📚 Next Steps

Once your database is set up:

1. ✅ Create authentication worker
2. ✅ Implement user registration
3. ✅ Add OAuth providers
4. ✅ Build session management
5. ✅ Add email verification
6. ✅ Implement password reset

---

## 📞 Support

- **D1 Docs:** https://developers.cloudflare.com/d1/
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/
- **Community:** https://discord.gg/cloudflaredev

---

## ✅ Deployment Complete!

Your D1 database is now ready for production use! 🎉