# CyberSmrt Auth Worker - Disaster Recovery Plan

## Overview

This document outlines the disaster recovery (DR) plan for the CyberSmrt authentication system. It covers complete system failure scenarios, recovery procedures, and business continuity strategies.

**Document Version**: 1.0
**Last Updated**: October 23, 2025
**Next Review**: January 23, 2026

---

## Executive Summary

**Recovery Time Objective (RTO)**: < 4 hours
**Recovery Point Objective (RPO)**: < 24 hours
**Availability Target**: 99.9% uptime
**Data Loss Tolerance**: Maximum 24 hours of data

---

## Disaster Scenarios

### Scenario 1: Single Worker Failure
**Probability**: Low (Cloudflare auto-healing)
**Impact**: None (automatic failover)
**Recovery**: Automatic

### Scenario 2: Database Corruption
**Probability**: Very Low
**Impact**: Critical - All authentication fails
**Recovery**: < 1 hour

### Scenario 3: Account Compromise
**Probability**: Medium
**Impact**: High - Security breach
**Recovery**: < 2 hours

### Scenario 4: Complete Account Deletion
**Probability**: Very Low
**Impact**: Critical - Total service loss
**Recovery**: < 4 hours

### Scenario 5: Regional Outage (Cloudflare)
**Probability**: Very Low
**Impact**: Low - Auto-failover to other regions
**Recovery**: Automatic

### Scenario 6: DNS Hijacking
**Probability**: Low
**Impact**: Critical - Service unreachable
**Recovery**: < 1 hour

### Scenario 7: Code Deployment Failure
**Probability**: Medium
**Impact**: Medium - Service degradation
**Recovery**: < 15 minutes

---

## Recovery Procedures

## Scenario 1: Single Worker Failure

### Detection
- Health check failures
- Increased error rates in Cloudflare Dashboard
- User reports of service unavailability

### Automatic Recovery
Cloudflare Workers automatically:
1. Detect failed instance
2. Route traffic to healthy instances
3. Spawn new instance if needed

### Manual Steps (If Automatic Fails)
```bash
# 1. Check worker status
npx wrangler tail --status

# 2. Redeploy worker
npx wrangler deploy

# 3. Verify health
curl https://auth.cybersmrt.org/health
```

**Expected Duration**: 5-10 minutes
**User Impact**: Minimal (automatic failover)

---

## Scenario 2: Database Corruption

### Detection
- Database query errors in logs
- Failed login attempts
- Admin dashboard alerts
- Error rate spike

### Recovery Steps

```bash
# 1. STOP: Prevent further damage
# Deploy maintenance mode worker (optional)

# 2. Assess damage
npx wrangler d1 execute cybersmrt-users --command "PRAGMA integrity_check;"

# 3. Restore from latest backup
cd backups/d1
LATEST=$(ls -t db-*.sqlite.gz | head -1)
gunzip -c "$LATEST" > temp-restore.sqlite

# 4. Verify backup integrity
sqlite3 temp-restore.sqlite "PRAGMA integrity_check;"
sqlite3 temp-restore.sqlite "SELECT COUNT(*) FROM users;"

# 5. Create new D1 database (if corruption total)
npx wrangler d1 create cybersmrt-users-recovery

# 6. Restore data
npx wrangler d1 restore cybersmrt-users --input temp-restore.sqlite

# 7. Update worker binding if new database
# Edit wrangler.toml, update database_id

# 8. Deploy updated worker
npx wrangler deploy

# 9. Verify functionality
curl https://auth.cybersmrt.org/health

# 10. Monitor for 24 hours
npx wrangler tail --format pretty
```

**Expected Duration**: 45-60 minutes
**User Impact**: Service outage during restoration
**Data Loss**: Up to 24 hours (last backup)

### Post-Recovery Actions
- [ ] Investigate corruption cause
- [ ] Review backup procedures
- [ ] Notify affected users
- [ ] Document incident
- [ ] Implement preventive measures

---

## Scenario 3: Account Compromise

### Detection
- Unusual admin activity
- Unexpected configuration changes
- Security alerts from Cloudflare
- Suspicious worker deployments

### Immediate Actions (Within 5 minutes)

```bash
# 1. REVOKE all access immediately
# Change Cloudflare account password
# Enable 2FA if not already enabled
# Revoke all API tokens

# 2. Rotate ALL secrets
echo "new-jwt-secret-$(openssl rand -hex 32)" | npx wrangler secret put JWT_SECRET
echo "new-oauth-secret" | npx wrangler secret put GOOGLE_CLIENT_SECRET
echo "new-oauth-secret" | npx wrangler secret put GITHUB_CLIENT_SECRET
echo "new-oauth-secret" | npx wrangler secret put MICROSOFT_CLIENT_SECRET

# 3. Review recent changes
git log --since="24 hours ago" --all --oneline

# 4. Check for unauthorized deployments
npx wrangler deployments list

# 5. Audit database for unauthorized changes
npx wrangler d1 execute cybersmrt-users --command \
  "SELECT * FROM users WHERE role = 'admin' ORDER BY created_at DESC LIMIT 10;"
```

### Investigation (Within 1 hour)

```bash
# Review all admin actions
npx wrangler d1 execute cybersmrt-users --command \
  "SELECT * FROM admin_audit_log WHERE created_at > datetime('now', '-24 hours');"

# Check security events
npx wrangler d1 execute cybersmrt-users --command \
  "SELECT * FROM security_events WHERE event_type = 'admin_action'
   AND created_at > datetime('now', '-24 hours');"

# Review worker logs
npx wrangler tail --since 24h | grep -i "admin\|error\|unauthorized"
```

### Remediation

1. **Restore from clean backup** (if data modified)
2. **Reset all user passwords** (if user table compromised)
3. **Invalidate all sessions** (clear SESSIONS KV namespace)
4. **Review and fix security gaps**
5. **Notify affected users**
6. **File incident report**

**Expected Duration**: 2-4 hours
**User Impact**: Forced re-authentication
**Compliance**: May trigger breach notification requirements

---

## Scenario 4: Complete Account Deletion

### Detection
- Workers no longer accessible
- Cloudflare dashboard access denied
- DNS resolution fails
- Complete service outage

### Recovery Steps

**Prerequisites**:
- Backup Cloudflare account credentials in secure location
- Offline backup of all data (monthly archives)
- DNS registrar access
- Git repository access

```bash
# 1. Assess situation
# - Can you access Cloudflare dashboard?
# - Can you access DNS registrar?
# - Do you have recent backups?

# 2. Create new Cloudflare account
# - Sign up at cloudflare.com
# - Add cybersmrt.org domain
# - Verify domain ownership

# 3. Recreate infrastructure

# Create D1 database
npx wrangler d1 create cybersmrt-users

# Create KV namespaces
npx wrangler kv:namespace create "USERS"
npx wrangler kv:namespace create "SESSIONS"
npx wrangler kv:namespace create "PASSWORD_RESETS"
npx wrangler kv:namespace create "RATE_LIMIT_KV"

# Create R2 bucket (if needed)
npx wrangler r2 bucket create cybersmrt-uploads

# 4. Update wrangler.toml with new IDs
# Edit workers/auth/wrangler.toml
# Update database_id, kv_namespaces, r2_buckets

# 5. Restore data from backups
# Restore D1 database
cd backups/
LATEST_DB=$(ls -t d1/db-*.sqlite.gz | head -1)
gunzip -c "$LATEST_DB" | npx wrangler d1 execute cybersmrt-users

# Restore R2 objects (if applicable)
cd r2/
for file in *; do
  npx wrangler r2 object put cybersmrt-uploads "$file" --file "$file"
done

# 6. Restore secrets
# From secure password manager
echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
echo "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET
echo "$GITHUB_CLIENT_SECRET" | npx wrangler secret put GITHUB_CLIENT_SECRET
echo "$MICROSOFT_CLIENT_SECRET" | npx wrangler secret put MICROSOFT_CLIENT_SECRET

# 7. Deploy workers
cd workers/auth
npx wrangler deploy

cd workers/profile
npx wrangler deploy

# 8. Configure DNS
# In Cloudflare dashboard or via API:
# - auth.cybersmrt.org → Worker route
# - profile.cybersmrt.org → Worker route
# - www.cybersmrt.org → Pages

# 9. Configure Pages deployment
# Connect GitHub repository
# Set build settings
# Deploy

# 10. Verify complete system
curl https://auth.cybersmrt.org/health
curl https://profile.cybersmrt.org/health
curl https://www.cybersmrt.org
```

**Expected Duration**: 3-4 hours
**User Impact**: Complete service outage
**Data Loss**: Up to 24 hours (last backup)

---

## Scenario 5: Regional Outage

### Detection
- Partial service degradation
- Increased latency from specific regions
- Cloudflare status page alerts

### Response
**NO ACTION REQUIRED** - Cloudflare Workers automatically:
- Route traffic to healthy regions
- Maintain service availability
- Handle failover transparently

### Monitoring
```bash
# Watch for increased latency
npx wrangler tail --format pretty | grep "duration"

# Check Cloudflare status
# Visit: https://www.cloudflarestatus.com/
```

**Expected Duration**: Automatic (0 minutes)
**User Impact**: Possible slight latency increase
**Data Loss**: None

---

## Scenario 6: DNS Hijacking

### Detection
- DNS queries resolving to wrong IP
- SSL certificate errors
- User reports of suspicious redirects
- DNS monitoring alerts

### Immediate Actions (Within 15 minutes)

```bash
# 1. Verify DNS hijacking
dig auth.cybersmrt.org
nslookup auth.cybersmrt.org

# 2. Access DNS registrar
# Log in to domain registrar (e.g., Namecheap, GoDaddy)

# 3. Verify nameservers
# Ensure pointing to Cloudflare nameservers:
# - ns1.cloudflare.com
# - ns2.cloudflare.com

# 4. Lock domain transfer
# Enable registrar lock
# Enable DNSSEC if available

# 5. Reset registrar credentials
# Change registrar password
# Enable 2FA

# 6. Restore correct DNS records
# In Cloudflare dashboard or via API
```

**Expected Duration**: 30-60 minutes (DNS propagation)
**User Impact**: Service unavailable during attack
**Follow-up**: Security review, enable additional protections

---

## Scenario 7: Code Deployment Failure

### Detection
- Deployment errors in wrangler output
- Health check failures after deployment
- Error rate spike
- User reports after deployment

### Recovery Steps

```bash
# 1. IMMEDIATE: Rollback to previous version
npx wrangler rollback

# Or deploy specific previous version
git log --oneline | head -5
git checkout <previous-commit>
npx wrangler deploy
git checkout main

# 2. Verify rollback successful
curl https://auth.cybersmrt.org/health

# 3. Investigate deployment failure
# Review deployment logs
# Test changes locally
# Run wrangler dev to debug

# 4. Fix issues
# Correct code problems
# Test thoroughly

# 5. Redeploy when ready
npx wrangler deploy

# 6. Verify deployment
curl https://auth.cybersmrt.org/health
npx wrangler tail --format pretty
```

**Expected Duration**: 10-15 minutes
**User Impact**: Brief service degradation
**Prevention**: Implement CI/CD with automated testing

---

## Communication Plan

### Internal Communication

**Incident Severity Levels**:
- **P0 (Critical)**: Complete service outage → Notify all immediately
- **P1 (High)**: Partial outage, security breach → Notify team within 15min
- **P2 (Medium)**: Degraded performance → Notify team within 1 hour
- **P3 (Low)**: Minor issues → Notify during business hours

**Communication Channels**:
1. Slack/Discord #incidents channel
2. Email: team@cybersmrt.org
3. SMS for P0 incidents
4. On-call escalation for after-hours

### External Communication

**User Notification Template**:
```
Subject: [RESOLVED] CyberSmrt Authentication Service Incident

We experienced a brief service disruption on [DATE] at [TIME] UTC affecting
user authentication. The issue has been resolved.

Timeline:
- [TIME]: Issue detected
- [TIME]: Team notified
- [TIME]: Recovery initiated
- [TIME]: Service restored

Impact: Users may have experienced [DESCRIPTION] for approximately [DURATION].

Action Required: [IF ANY - e.g., "Please log in again"]

We apologize for the inconvenience. If you have questions, contact support@cybersmrt.org.
```

**Status Page Updates**:
- Update https://status.cybersmrt.org (if exists)
- Twitter/social media
- In-app banner notification

---

## Recovery Team Roles

### Incident Commander
- **Responsibilities**: Overall coordination, decision making
- **Contact**: Primary on-call engineer
- **Backup**: Engineering lead

### Technical Lead
- **Responsibilities**: Execute recovery procedures
- **Contact**: Senior backend engineer
- **Backup**: DevOps engineer

### Communications Lead
- **Responsibilities**: User and stakeholder communication
- **Contact**: Product manager
- **Backup**: Customer support lead

### Documentation Lead
- **Responsibilities**: Document timeline and actions
- **Contact**: Any available team member

---

## DR Testing Schedule

### Quarterly DR Drill (Every 3 months)

**Test Scenarios**:
1. Q1: Database corruption recovery
2. Q2: Complete account rebuild
3. Q3: Security breach response
4. Q4: Multi-component failure

**Testing Procedure**:
1. Schedule 2-hour testing window (off-peak hours)
2. Announce test to team
3. Use staging/test environment
4. Execute recovery procedures
5. Document duration and issues
6. Update DR plan based on learnings

### Annual Full DR Test

- Complete system rebuild from backups
- Test all recovery scenarios
- Involve entire team
- Update all documentation
- Review and update RTO/RPO targets

---

## Post-Incident Review

### Within 24 Hours

- [ ] Create incident timeline
- [ ] Document all actions taken
- [ ] Calculate actual RTO/RPO
- [ ] Identify root cause
- [ ] List affected users/data

### Within 3 Days

- [ ] Conduct post-mortem meeting
- [ ] Create action items for prevention
- [ ] Update DR procedures if needed
- [ ] Communicate findings to team
- [ ] Update monitoring/alerting

### Within 1 Week

- [ ] Implement quick fixes
- [ ] Schedule long-term improvements
- [ ] Update documentation
- [ ] Share lessons learned
- [ ] Review compliance requirements

---

## Prevention Strategies

### Technical
- [ ] Automated health monitoring
- [ ] Redundant backups (multiple locations)
- [ ] Automated backup verification
- [ ] Infrastructure as code (version control)
- [ ] Blue-green deployments
- [ ] Automated testing (CI/CD)
- [ ] Rate limiting and DDoS protection
- [ ] Security scanning and audits

### Operational
- [ ] 24/7 monitoring and alerting
- [ ] On-call rotation
- [ ] Regular DR drills
- [ ] Backup verification testing
- [ ] Security training
- [ ] Access control reviews
- [ ] Change management process
- [ ] Incident response training

### Documentation
- [ ] Keep DR plan updated
- [ ] Maintain runbooks
- [ ] Document all procedures
- [ ] Version control everything
- [ ] Regular documentation reviews

---

## Emergency Contacts

### Cloudflare Support
- **Dashboard**: https://dash.cloudflare.com/support
- **Enterprise Support**: [If applicable]
- **Status Page**: https://www.cloudflarestatus.com/

### Domain Registrar
- **Provider**: [Your registrar]
- **Support**: [Contact information]
- **Account ID**: [In secure location]

### Internal Team
- **On-Call Engineer**: [Phone/Email]
- **Engineering Lead**: [Phone/Email]
- **Security Team**: [Phone/Email]
- **Executive Contact**: [Phone/Email]

---

## Compliance & Legal

### Data Breach Notification

**GDPR Requirements** (if EU users affected):
- Report to supervisory authority within 72 hours
- Notify affected users without undue delay
- Document breach details and response

**CCPA Requirements** (if CA users affected):
- Notify affected California residents
- Provide specific breach details
- Offer identity theft prevention services if applicable

**Breach Notification Template**: See SECURITY-AUDIT.md

---

## Appendix A: Quick Reference

### Critical Commands

```bash
# Deploy worker
npx wrangler deploy

# Rollback deployment
npx wrangler rollback

# Check health
curl https://auth.cybersmrt.org/health

# View logs
npx wrangler tail

# Restore database
npx wrangler d1 restore cybersmrt-users --input backup.sqlite

# Rotate secret
echo "new-secret" | npx wrangler secret put SECRET_NAME
```

### Critical Files

- Backups: `./backups/`
- Secrets: [Secure password manager]
- DNS Records: [Cloudflare Dashboard]
- Git Repository: https://github.com/CyberSmrtOrg/cybersmrt-web

---

## Appendix B: Decision Tree

```
SERVICE OUTAGE DETECTED
  ↓
Is it affecting all users?
  ├─ Yes → CRITICAL (P0)
  │   ↓
  │   Can users authenticate at all?
  │   ├─ No → Database or Worker failure
  │   │   └─ Follow Scenario 2 or 1
  │   └─ Partially → Regional or DNS issue
  │       └─ Follow Scenario 5 or 6
  │
  └─ No → LIMITED IMPACT (P1-P2)
      ↓
      Recent deployment?
      ├─ Yes → Code deployment issue
      │   └─ Follow Scenario 7
      └─ No → Investigate further
          └─ Check logs, monitoring
```

---

## Document Control

**Classification**: Internal Use
**Distribution**: Engineering team, management
**Storage**: Secure documentation repository
**Backup**: Offline encrypted copy

**Review Schedule**: Quarterly
**Next Review**: January 23, 2026

**Approval**:
- Engineering Lead: ___________________
- Security Lead: ___________________
- Management: ___________________

---

**Status**: Complete and Ready for Use ✅
**Last Test**: [To be scheduled]
**Next Test**: [Quarterly DR drill]
