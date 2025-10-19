# CyberSmrt Weekly Security Monitoring Checklist

**Frequency:** Every Monday at 9:00 AM (or your preferred time)
**Time Required:** 10 minutes
**Owner:** Security team (security-alerts@cybersmrt.org)

---

## 📋 WEEKLY TASKS (10 minutes)

### 1. Check UptimeRobot Dashboard (3 min)

**Go to:** https://uptimerobot.com

**Review:**
- [ ] All monitors showing **Up** (green) ✅
- [ ] No unexpected downtime in last 7 days
- [ ] Response times reasonable (<500ms average)
- [ ] Uptime percentage >99.5%

**Action if issues:**
- Investigate any monitors showing Down or Paused
- Check for patterns (time of day, specific pages)
- Document in ClickUp if recurring

---

### 2. Review Cloudflare Analytics (5 min)

**Go to:** Cloudflare Dashboard → Workers & Pages → qr-proxy → Analytics

**Check Last 7 Days:**

#### **A. Total Requests**
- [ ] Normal request volume (document baseline after first month)
- [ ] No unusual spikes or drops

**Baseline:** ~[Document your typical weekly requests after first month]

#### **B. Status Codes**
- [ ] **200 (Success):** Should be >98% of requests
- [ ] **429 (Rate Limited):** Check count - investigate if >100/week
- [ ] **403 (SSRF Blocked):** Check count - investigate if >10/week
- [ ] **4xx/5xx Errors:** Should be <2% of total

**Red Flags:**
- ⚠️ 429 count suddenly high (>500/week) = Possible abuse
- ⚠️ 403 count suddenly high (>50/week) = Possible attack attempts
- ⚠️ Error rate >5% = Possible service issues

#### **C. Geographic Distribution**
- [ ] Request sources look normal
- [ ] No suspicious concentration from single country (unless expected)

#### **D. Response Time**
- [ ] P50 (median): <200ms ✅
- [ ] P95: <500ms ✅
- [ ] P99: <1000ms ✅

---

### 3. Check Email Alerts (1 min)

**Review inbox:** security-alerts@cybersmrt.org

**Look for:**
- [ ] Any UptimeRobot "DOWN" alerts in last 7 days
- [ ] Any Cloudflare incident notifications
- [ ] Any unusual patterns

**Action:**
- Review any incidents that occurred
- Document response and resolution
- Update monitors if needed

---

### 4. Quick Health Check (1 min)

**Run these quick tests:**

```bash
# Test QR proxy health
curl -I https://cybersmrt.org/tools/qr_proxy/health
# Expected: HTTP/1.1 200 OK

# Test main site
curl -I https://www.cybersmrt.org
# Expected: HTTP/2 200
```

**Or simply visit:**
- https://cybersmrt.org/tools/qr_proxy/health (should see JSON)
- https://www.cybersmrt.org (site loads normally)

---

## 📊 WEEKLY REPORT TEMPLATE

Copy this and fill it out:

```
=== CYBERSMRT WEEKLY MONITORING REPORT ===
Week of: [Date]
Reviewed by: [Name]

UPTIME STATUS:
- Overall uptime: [XX.XX%]
- Incidents: [X] (describe if any)
- All monitors: ✅ UP / ⚠️ ISSUES

QR PROXY SECURITY:
- Total requests: [~X,XXX]
- Rate limits (429): [X]
- SSRF blocks (403): [X]
- Error rate: [X.X%]
- Status: ✅ NORMAL / ⚠️ INVESTIGATE

RESPONSE TIME:
- Average: [XXXms]
- Status: ✅ FAST (<300ms) / ⚠️ SLOW (>300ms)

ACTION ITEMS:
- [ ] [Any issues to address]
- [ ] [Any monitors to update]
- [ ] [Any improvements needed]

OVERALL STATUS: ✅ HEALTHY / ⚠️ NEEDS ATTENTION / 🔴 CRITICAL
```

---

## 🚨 MONTHLY TASKS (15 minutes)

**First Monday of each month:**

### 1. Security Testing (10 min)

**Test rate limiting:**
```bash
# Send 25 rapid requests
for i in {1..25}; do
  curl -s "https://cybersmrt.org/tools/qr_proxy?url=https://example.com&analysis_only=true" > /dev/null
done

# Check Cloudflare Analytics for 429 responses
# Should see ~5 rate limit responses
```

**Test SSRF protection:**
```bash
# Should return "Access to internal IPs forbidden"
curl "https://cybersmrt.org/tools/qr_proxy?url=http://169.254.169.254&analysis_only=true"
```

### 2. Review UptimeRobot Settings (3 min)
- [ ] All contact emails still valid
- [ ] Monitor list still relevant
- [ ] No monitors need updating

### 3. Review Documentation (2 min)
- [ ] This checklist still accurate
- [ ] Any new endpoints to monitor
- [ ] Any improvements needed

---

## 📈 QUARTERLY REVIEW (30 minutes)

**Every 3 months:**

- [ ] Review 90-day uptime trends
- [ ] Analyze security incident patterns
- [ ] Update baseline metrics
- [ ] Review and optimize monitoring strategy
- [ ] Update documentation
- [ ] Present summary to leadership/board

---

## 🔗 QUICK LINKS

**Monitoring:**
- UptimeRobot Dashboard: https://uptimerobot.com
- Cloudflare Dashboard: https://dash.cloudflare.com
- Workers Analytics: [Direct link to your qr-proxy analytics]

**Documentation:**
- ClickUp Security Tasks: [Link]
- Incident Response Plan: [Create if needed]
- Contact List: security-alerts@cybersmrt.org

**Emergency Contacts:**
- Tech Lead: [Name/Email]
- Cloudflare Support: (if Pro plan)
- Escalation: [Board member/CTO]

---

## 📝 NOTES & OBSERVATIONS

Use this space to track patterns over time:

**Week 1 (Oct 19, 2025):**
- Baseline established
- All monitors green
- ~X requests/week typical

**Week 2:**
[Add notes]

**Week 3:**
[Add notes]

---

## ✅ COMPLETION CHECKLIST

After each weekly review:

- [ ] UptimeRobot checked
- [ ] Cloudflare Analytics reviewed
- [ ] Email alerts reviewed
- [ ] Quick health test run
- [ ] Report filled out
- [ ] Any issues documented in ClickUp
- [ ] Team notified if issues found

**Time spent:** _____ minutes
**Next review:** [Date]

---

## 🎯 SUCCESS METRICS

**You're doing great if:**
- ✅ Uptime >99.5%
- ✅ Response time <300ms average
- ✅ Error rate <2%
- ✅ No critical incidents
- ✅ Security features working (429s/403s when tested)

**Investigate if:**
- ⚠️ Uptime <99%
- ⚠️ Response time >500ms
- ⚠️ Error rate >5%
- ⚠️ Unusual 429/403 patterns
- ⚠️ Multiple DOWN alerts

**Escalate if:**
- 🔴 Multiple monitors down >30 minutes
- 🔴 Error rate >10%
- 🔴 Evidence of actual attack/breach
- 🔴 Data exposure or security incident