# Contact Form to Google Groups Mapping

This document shows how contact form submissions are routed to your Google Groups.

## Contact Form Routing

| Form Selection | Google Group | Resend From Address | Response Time | Notes |
|---------------|--------------|---------------------|---------------|-------|
| **General Question** | general@cybersmrt.org | CyberSmrt <general@cybersmrt.org> | 24-48 hours | General inquiries |
| **K-12 Curriculum Inquiry** | curriculum@cybersmrt.org | CyberSmrt Education <curriculum@cybersmrt.org> | 2-3 business days | Educator outreach |
| **School/Organization Partnership** | partnerships@cybersmrt.org | CyberSmrt Partnerships <partnerships@cybersmrt.org> | 3-5 business days | Partnership opportunities |
| **Donation / Sponsorship** | donations@cybersmrt.org | CyberSmrt Development <donations@cybersmrt.org> | 2-3 business days | Funding & sponsorship |
| **Volunteer Opportunity** | volunteers@cybersmrt.org | CyberSmrt Volunteer Team <volunteers@cybersmrt.org> | 3-5 business days | Volunteer applications |
| **Board Member Interest** | board@cybersmrt.org | CyberSmrt Board <board@cybersmrt.org> | 5-7 business days | Board recruitment |
| **Tool Support (QR Scanner, Phishing Detector)** | tech-support@cybersmrt.org | CyberSmrt Support <tech-support@cybersmrt.org> | 48-72 hours | QR scanner, phishing detector support |
| **Grant / Foundation Inquiry** | grants@cybersmrt.org | CyberSmrt Grants <grants@cybersmrt.org> | 3-5 business days | Grant opportunities |
| **Media / Press Inquiry** | press@cybersmrt.org | CyberSmrt Media Relations <press@cybersmrt.org> | 24-48 hours | Media & press |
| **Technical Issue** | tech-support@cybersmrt.org | CyberSmrt Technical Team <tech-support@cybersmrt.org> | 48-72 hours | Website or technical issues |
| **Other** | info@cybersmrt.org | CyberSmrt <info@cybersmrt.org> | 24-48 hours | Catch-all |

## Email Flow

### When a User Submits the Form

```
1. User fills form on cybersmrt.org/pages/contact
   └─ Selects "K-12 Curriculum Inquiry"
   └─ Enters: John Doe, john@school.edu, "I want to use your curriculum"

2. Form submits to: POST https://api.cybersmrt.org/contact
   └─ Verifies Cloudflare Turnstile token
   └─ Validates form data

3. (If configured) Adds to Resend Audience
   └─ Adds john@school.edu to "K-12 Curriculum" audience
   └─ Stores: firstName: "John", lastName: "Doe"

4. Sends Confirmation Email to Submitter
   ├─ TO: john@school.edu
   ├─ FROM: CyberSmrt Education <curriculum@cybersmrt.org>
   ├─ REPLY-TO: curriculum@cybersmrt.org
   └─ SUBJECT: "Thank You for Contacting CyberSmrt!"
   └─ BODY: "We'll respond within 2-3 business days..."

5. Sends Notification to Google Group
   ├─ TO: curriculum@cybersmrt.org (your Google Group)
   ├─ FROM: CyberSmrt Contact System <noreply@cybersmrt.org>
   ├─ REPLY-TO: john@school.edu (the contact)
   └─ SUBJECT: "New Contact Form: K-12 Curriculum Inquiry from John Doe"
   └─ BODY: Full submission details + message
```

### When Team Member Replies

```
1. Team member receives notification in curriculum@cybersmrt.org
2. Team member clicks "Reply" in Gmail
   └─ Reply automatically goes to john@school.edu
   └─ From address shows: [Your Name] via curriculum@cybersmrt.org
3. User receives reply from your team
```

## Google Groups You Created

Based on your setup, here are the groups you created and their purposes:

| Google Group | Contact Form Use | Additional Uses |
|--------------|------------------|-----------------|
| **board@cybersmrt.org** | ✅ Board Member Interest | Board communications, governance |
| **general@cybersmrt.org** | ✅ General Question | General support, catch-all |
| **contact@cybersmrt.org** | ⚠️ Not mapped to form | Master contact list, monitoring all contact emails |
| **info@cybersmrt.org** | ✅ Other | Public info email, catch-all |
| **donations@cybersmrt.org** | ✅ Donation / Sponsorship | Fundraising, sponsorships |
| **grants@cybersmrt.org** | ✅ Grant / Foundation Inquiry | Grant opportunities, proposals |
| **curriculum@cybersmrt.org** | ✅ K-12 Curriculum Inquiry | Educator outreach, curriculum support |
| **partnerships@cybersmrt.org** | ✅ School/Organization Partnership | Partnerships, collaborations |
| **lms@cybersmrt.org** | ⚠️ Not mapped to form | Learning Management System communications |
| **press@cybersmrt.org** | ✅ Media / Press Inquiry | Media relations, PR |
| **security-alerts@cybersmrt.org** | ⚠️ Not mapped to form | Security alerts (2FA, login notifications) from auth system |
| **social@cybersmrt.org** | ⚠️ Not mapped to form | Social media communications |
| **tech-support@cybersmrt.org** | ✅ Tool Support + Technical Issue | QR scanner, phishing detector, website issues |
| **volunteers@cybersmrt.org** | ✅ Volunteer Opportunity | Volunteer recruitment, coordination |
| **webmaster@cybersmrt.org** | ⚠️ Not mapped to form | Website management, technical maintenance |

## Additional Group Uses

### security-alerts@cybersmrt.org
This group should be used for automated security notifications:
- New device login alerts
- 2FA disabled notifications
- Failed login attempts
- Suspicious activity alerts

**To integrate:** Update `/workers/auth/src/utils/security-alerts.js` to use:
```javascript
from: 'CyberSmrt Security <security-alerts@cybersmrt.org>'
```

### webmaster@cybersmrt.org
This group can receive:
- Website error notifications
- Uptime alerts
- SSL certificate renewals
- DNS changes

### lms@cybersmrt.org
If you build a Learning Management System, use this for:
- Course enrollment confirmations
- Assignment notifications
- Progress reports

### social@cybersmrt.org
For social media coordination:
- Scheduled post reminders
- Engagement notifications
- Social media reports

## Recommended Next Steps

### 1. Configure Google Groups Settings

For each group, set these permissions in Google Admin:

**Who can post:**
- ✅ Anyone on the internet (for contact@ groups receiving form submissions)
- ⚠️ Only group members (for internal groups like lms@, webmaster@)

**Who can view conversations:**
- Group members only

**Subject prefix:** (Optional but helpful)
- `[Curriculum]` for curriculum@
- `[Donations]` for donations@
- `[Press]` for press@
- etc.

### 2. Add Team Members

Add tony@cybersmrt.org as **Owner** to all groups, then add specific team members:

**Example assignments:**
- curriculum@ → Education team lead, curriculum developers
- donations@ → Development director, finance team
- tech-support@ → Tech support staff, developers
- press@ → Marketing team, PR coordinator
- volunteers@ → Volunteer coordinator, HR

### 3. Verify Email Addresses in Resend

Before contact form will work with custom from addresses:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click on **cybersmrt.org** domain
3. Verify the domain is fully verified (green checkmark)
4. Test sending from each group address

**Quick test:**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "CyberSmrt Education <curriculum@cybersmrt.org>",
    "to": "tony@cybersmrt.org",
    "subject": "Test from Curriculum Group",
    "html": "<p>This is a test email from the curriculum group.</p>"
  }'
```

### 4. Set Up Resend Audiences

Once you have a Resend paid plan:

1. Create audiences in Resend Dashboard
2. Name them to match your groups:
   - "K-12 Curriculum"
   - "Partnerships"
   - "Donations"
   - "Volunteers"
   - etc.
3. Copy each audience ID (format: `aud_xxxxxxxxxxxxx`)
4. Add to `/workers/shared/contact-config.js`:
   ```javascript
   curriculum: {
     label: 'K-12 Curriculum Inquiry',
     audienceId: 'aud_your_actual_id_here', // ← Add here
     notifyEmail: 'curriculum@cybersmrt.org',
     fromEmail: 'CyberSmrt Education <curriculum@cybersmrt.org>',
     responseTime: '2-3 business days'
   },
   ```

### 5. Deploy API Worker

```bash
cd workers/api
npx wrangler deploy
```

### 6. Test Contact Form

1. Visit https://cybersmrt.org/pages/contact
2. Fill out form, select "K-12 Curriculum Inquiry"
3. Submit form
4. Check:
   - ✅ Confirmation email received (from curriculum@cybersmrt.org)
   - ✅ Notification received at curriculum@cybersmrt.org
   - ✅ Reply-To is set correctly
   - ✅ Contact added to Resend audience (if configured)

## Troubleshooting

### Emails Not Arriving at Google Groups

1. Check Google Groups → **Settings** → **Who can post**
   - Must be set to "Anyone on the internet"
2. Check group's spam/quarantine folder
3. Verify group email is correct in contact-config.js
4. Check Resend Dashboard for delivery status

### "From" Address Not Working

1. Verify cybersmrt.org domain in Resend
2. Check DNS records (SPF, DKIM, DMARC)
3. Test with curl command above
4. May need to wait 48 hours for DNS propagation

### Contact Not Added to Audience

1. Check that audienceId is uncommented in contact-config.js
2. Verify audience ID is correct (check Resend Dashboard)
3. Check API worker logs in Cloudflare Dashboard
4. Ensure Resend plan supports Audiences

## Future Enhancements

### Automatic Tagging
Add tags to Resend contacts based on their inquiry:
```javascript
await emailService.addToAudience(email, audienceId, {
  firstName,
  lastName,
  tags: [reason, organization] // Tag with inquiry type and org
});
```

### Segment by Organization Type
Track if organization is K-12, Higher Ed, Nonprofit, etc.:
```javascript
organizationType: data.organizationType || 'Unknown'
```

### Track Geographic Location
Add location data to Resend contacts:
```javascript
location: data.location || 'Not provided'
```

### Automated Follow-ups
Set up automated email sequences in Resend for each audience:
- Day 1: Confirmation email (done)
- Day 3: "Have you had a chance to check out our resources?"
- Day 7: "We'd love to schedule a call"
- Day 30: Re-engagement email

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0
