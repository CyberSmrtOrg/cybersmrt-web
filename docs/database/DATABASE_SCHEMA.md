# CyberSmrt Database Schema

## Overview

D1 SQLite database for managing user accounts, authentication, and security logging.

## Tables

### 1. users
Primary user account table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| email | TEXT | UNIQUE, NOT NULL | User email (lowercase) |
| password_hash | TEXT | NULL | Bcrypt hash (null for OAuth-only) |
| display_name | TEXT | NULL | User's display name |
| avatar_url | TEXT | NULL | Profile picture URL |
| role | TEXT | DEFAULT 'user' | user, admin, moderator |
| email_verified | INTEGER | DEFAULT 0 | 0 = false, 1 = true |
| is_active | INTEGER | DEFAULT 1 | 0 = disabled, 1 = active |
| created_at | INTEGER | NOT NULL | Unix timestamp |
| updated_at | INTEGER | NOT NULL | Unix timestamp |
| last_login_at | INTEGER | NULL | Unix timestamp |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_role` on `role`
- `idx_users_created_at` on `created_at`

---

### 2. oauth_providers
OAuth provider connections (Google, GitHub, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| user_id | TEXT | NOT NULL | FK to users.id |
| provider | TEXT | NOT NULL | google, github, microsoft, apple |
| provider_user_id | TEXT | NOT NULL | Provider's user ID |
| access_token | TEXT | NULL | Encrypted OAuth token |
| refresh_token | TEXT | NULL | Encrypted refresh token |
| token_expires_at | INTEGER | NULL | Unix timestamp |
| profile_data | TEXT | NULL | JSON profile data |
| created_at | INTEGER | NOT NULL | Unix timestamp |
| updated_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `idx_oauth_user_id` on `user_id`
- `idx_oauth_provider_user` on `(provider, provider_user_id)` UNIQUE

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

---

### 3. sessions
Active user sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 (session token) |
| user_id | TEXT | NOT NULL | FK to users.id |
| ip_address | TEXT | NULL | Client IP |
| user_agent | TEXT | NULL | Browser/device info |
| expires_at | INTEGER | NOT NULL | Unix timestamp |
| created_at | INTEGER | NOT NULL | Unix timestamp |
| last_activity_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_expires_at` on `expires_at`

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

---

### 4. email_verification_tokens
Email verification tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| user_id | TEXT | NOT NULL | FK to users.id |
| token | TEXT | UNIQUE, NOT NULL | Verification token |
| expires_at | INTEGER | NOT NULL | Unix timestamp |
| created_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `idx_email_verify_token` on `token`
- `idx_email_verify_user` on `user_id`

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

---

### 5. password_reset_tokens
Password reset tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| user_id | TEXT | NOT NULL | FK to users.id |
| token | TEXT | UNIQUE, NOT NULL | Reset token (hashed) |
| expires_at | INTEGER | NOT NULL | Unix timestamp |
| used_at | INTEGER | NULL | Unix timestamp (null = unused) |
| created_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `idx_password_reset_token` on `token`
- `idx_password_reset_user` on `user_id`

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

---

### 6. security_logs
Security event logging (login attempts, suspicious activity).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| user_id | TEXT | NULL | FK to users.id (null for failed attempts) |
| event_type | TEXT | NOT NULL | login, logout, failed_login, password_change, etc. |
| ip_address | TEXT | NULL | Client IP |
| user_agent | TEXT | NULL | Browser/device info |
| details | TEXT | NULL | JSON additional details |
| created_at | INTEGER | NOT NULL | Unix timestamp |

**Indexes:**
- `idx_security_logs_user_id` on `user_id`
- `idx_security_logs_event_type` on `event_type`
- `idx_security_logs_created_at` on `created_at`
- `idx_security_logs_ip` on `ip_address`

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE SET NULL

---

### 7. user_profiles
Extended user profile information (optional).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | TEXT | PRIMARY KEY | FK to users.id |
| bio | TEXT | NULL | User biography |
| location | TEXT | NULL | User location |
| website | TEXT | NULL | Personal website |
| organization | TEXT | NULL | Organization name |
| phone | TEXT | NULL | Phone number |
| preferences | TEXT | NULL | JSON user preferences |
| updated_at | INTEGER | NOT NULL | Unix timestamp |

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

---

## Data Types & Standards

### Timestamps
- All timestamps stored as **INTEGER** (Unix epoch seconds)
- Use `Math.floor(Date.now() / 1000)` in JavaScript

### UUIDs
- Use crypto.randomUUID() for all IDs
- Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

### Booleans
- Stored as **INTEGER**: 0 = false, 1 = true
- SQLite doesn't have native boolean type

### JSON Data
- Stored as **TEXT** (stringified JSON)
- Parse with `JSON.parse()` when reading

### Email Addresses
- Always store lowercase: `email.toLowerCase()`
- Validate format before insert

### Password Hashing
- Use bcrypt with cost factor 10-12
- Never store plain text passwords
- Null for OAuth-only accounts

---

## Security Considerations

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Session Management
- Sessions expire after 7 days of inactivity
- Cleanup expired sessions daily
- Invalidate all sessions on password change

### Rate Limiting
- Track failed login attempts in security_logs
- Lock account after 5 failed attempts in 15 minutes
- Require CAPTCHA after 3 failed attempts

### Token Security
- Email verification tokens: 24-hour expiry
- Password reset tokens: 1-hour expiry
- All tokens hashed before storage
- Single-use tokens (mark used_at)

---

## Free Tier Limits

**Cloudflare D1 Free Tier:**
- 5 GB storage
- 5 million reads/day
- 100,000 writes/day
- 25 databases

**Sufficient for:**
- ~500,000 users (10 KB per user)
- ~1 million sessions
- Extensive logging

---

## Migration Strategy

**Version Control:**
- Each migration has a version number
- Migrations run in order
- Track applied migrations in `migrations` table

**Rollback Plan:**
- All migrations include DOWN scripts
- Test migrations locally before production
- Backup before major schema changes

---

## Performance Optimization

### Indexes
- Add indexes on frequently queried columns
- Composite indexes for multi-column queries
- Monitor query performance with EXPLAIN

### Data Cleanup
- Archive old security_logs (>90 days)
- Delete expired sessions daily
- Delete used/expired tokens weekly

### Query Optimization
- Use prepared statements
- Batch inserts when possible
- Limit result sets with LIMIT/OFFSET