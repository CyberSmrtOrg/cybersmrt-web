# Google Workspace Groups Setup for Contact Form

This guide provides recommended Google Groups to create for managing contact form submissions and targeted communications.

## Recommended Google Groups Structure

### Primary Contact Groups

| Group Email | Purpose | Who Receives | Resend Audience Mapping |
|------------|---------|--------------|------------------------|
| **general@cybersmrt.org** | General inquiries | Support team, Tony | General Questions |
| **curriculum@cybersmrt.org** | K-12 education inquiries | Education team, Tony | K-12 Curriculum |
| **partnerships@cybersmrt.org** | Partnership requests | Business dev, Tony | Partnerships |
| **donations@cybersmrt.org** | Donation & sponsorship | Finance, Development, Tony | Donations/Sponsorships |
| **volunteer@cybersmrt.org** | Volunteer applications | HR, Tony | Volunteers |
| **board@cybersmrt.org** | Board member interest | Executive team, Tony | Board Members |
| **support@cybersmrt.org** | Tool/technical support | Tech team, Tony | Tool Support |
| **grants@cybersmrt.org** | Grant opportunities | Development, Tony | Grants/Foundations |
| **press@cybersmrt.org** | Media inquiries | Marketing, Tony | Media/Press |
| **technical@cybersmrt.org** | Technical issues | IT team, Tony | Technical Issues |

### Support Groups

| Group Email | Purpose | Members |
|------------|---------|---------|
| **contact@cybersmrt.org** | Master contact list | All contact handlers |
| **team@cybersmrt.org** | All staff | Everyone |
| **leadership@cybersmrt.org** | Executive team | Tony, board members |

## Google Admin Console Setup

### Step 1: Create Groups

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Directory** → **Groups**
3. Click **Create group**
4. For each group above, enter:
   - **Name**: E.g., "CyberSmrt Curriculum"
   - **Group email**: E.g., `curriculum@cybersmrt.org`
   - **Description**: E.g., "Handles K-12 curriculum inquiries and partnerships"

### Step 2: Configure Group Settings

For each group, configure these settings:

**Access Settings:**
- **Who can join**: Only invited users
- **Who can view members**: Group members
- **Who can view conversations**: Group members
- **Who can post**: Anyone on the internet (for external contact forms)
- **Who can view topics**: Group members

**Email Options:**
- **Group email**: curriculum@cybersmrt.org
- **Email language**: English
- **Subject prefix**: Optional - e.g., `[Curriculum]`

**Member Privacy:**
- **Include in directory**: Yes (for internal lookup)
- **Allow external members**: No

### Step 3: Add Members

For each group, add relevant team members:

**Example: curriculum@cybersmrt.org**
- tony@cybersmrt.org (Owner)
- education-lead@cybersmrt.org (Manager)
- teacher-liaison@cybersmrt.org (Member)

**Roles:**
- **Owner**: Can manage all settings, members, and moderate
- **Manager**: Can manage members and moderate
- **Member**: Can read and post

### Step 4: Configure Auto-Reply (Optional)

Set up auto-replies for after-hours or vacation:

1. Open the group → **Settings**
2. Go to **Email options**
3. Enable **Send a welcome message to new members**
4. Configure **Auto-reply** for business hours

## Integration with Resend

### Update Email Service Configuration

Edit `/workers/shared/email-service.js` to use appropriate `from` addresses:

```javascript
// In the EmailService class constructor
export class EmailService {
  constructor(env) {
    this.env = env;
    this.apiKey = env.RESEND_API_KEY;
    this.apiUrl = 'https://api.resend.com/emails';

    // Default from email (can be overridden per template)
    this.fromEmail = 'CyberSmrt <noreply@cybersmrt.org>';

    // Specialized from addresses
    this.fromAddresses = {
      general: 'CyberSmrt <general@cybersmrt.org>',
      curriculum: 'CyberSmrt Education <curriculum@cybersmrt.org>',
      partnerships: 'CyberSmrt Partnerships <partnerships@cybersmrt.org>',
      donations: 'CyberSmrt Development <donations@cybersmrt.org>',
      volunteer: 'CyberSmrt Volunteer Team <volunteer@cybersmrt.org>',
      board: 'CyberSmrt Board <board@cybersmrt.org>',
      support: 'CyberSmrt Support <support@cybersmrt.org>',
      grants: 'CyberSmrt Grants <grants@cybersmrt.org>',
      press: 'CyberSmrt Media <press@cybersmrt.org>',
      technical: 'CyberSmrt Technical <technical@cybersmrt.org>',
      security: 'CyberSmrt Security <security@cybersmrt.org>',
    };
  }
}
```

### Update Contact Configuration

Edit `/workers/shared/contact-config.js` to include email groups:

```javascript
export const AUDIENCE_MAPPING = {
  general: {
    label: 'General Question',
    audienceId: 'aud_general_xxxxx',
    responseTime: '24-48 hours',
    notifyEmail: 'general@cybersmrt.org',      // ← Add this
    fromEmail: 'CyberSmrt <general@cybersmrt.org>'  // ← Add this
  },
  curriculum: {
    label: 'K-12 Curriculum Inquiry',
    audienceId: 'aud_curriculum_xxxxx',
    responseTime: '2-3 business days',
    notifyEmail: 'curriculum@cybersmrt.org',   // ← Add this
    fromEmail: 'CyberSmrt Education <curriculum@cybersmrt.org>'  // ← Add this
  },
  // ... repeat for all categories
};
```

### Update Contact Routes

Edit `/workers/api/src/contact/routes.js` to use group emails:

```javascript
// Send notification email to appropriate team
const audienceConfig = getAudienceConfig(reason);
const notificationEmail = audienceConfig.notifyEmail || env.CONTACT_NOTIFICATION_EMAIL || 'tony@cybersmrt.org';

await emailService.send('contactNotification', notificationEmail, {
  // ... data
}, {
  from: audienceConfig.fromEmail || 'CyberSmrt <noreply@cybersmrt.org>',
  replyTo: email  // Reply goes directly to the contact
});
```

## Verify Email Addresses in Resend

Before using these addresses as `from` addresses in Resend:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Navigate to **Domains** → **cybersmrt.org**
3. Verify each email address or use a domain-wide verification:
   - **Option A**: Verify `cybersmrt.org` domain (all emails work)
   - **Option B**: Verify individual addresses

**To verify domain:**
1. Add DNS records provided by Resend
2. Wait for DNS propagation (up to 48 hours)
3. Test sending from any `@cybersmrt.org` address

## Email Routing Flow

### When a Contact Form is Submitted

1. **User submits form** → Selected "K-12 Curriculum Inquiry"
2. **API Worker** (`POST /contact`)
   - Adds contact to "K-12 Curriculum" audience in Resend
   - Sends confirmation to user from `curriculum@cybersmrt.org`
   - Sends notification to `curriculum@cybersmrt.org` group
3. **Google Group** receives notification
   - Tony gets email
   - Education lead gets email
   - Teacher liaison gets email
4. **Team member responds** from `curriculum@cybersmrt.org`
   - User sees reply from professional group address
   - Conversation continues via `curriculum@cybersmrt.org`

### When Sending Targeted Campaigns (Later)

1. **Login to Resend Dashboard**
2. **Create Broadcast** to "K-12 Curriculum" audience
3. **Set From**: `curriculum@cybersmrt.org`
4. **Replies** automatically route to `curriculum@cybersmrt.org` Google Group
5. **Team members** see and respond to replies

## Group Aliases (Optional)

Create aliases for common typos or alternative names:

| Primary | Aliases |
|---------|---------|
| curriculum@cybersmrt.org | education@cybersmrt.org, k12@cybersmrt.org |
| partnerships@cybersmrt.org | partner@cybersmrt.org, collaborate@cybersmrt.org |
| donations@cybersmrt.org | donate@cybersmrt.org, sponsor@cybersmrt.org, give@cybersmrt.org |
| volunteer@cybersmrt.org | volunteers@cybersmrt.org, join@cybersmrt.org |
| support@cybersmrt.org | help@cybersmrt.org |
| press@cybersmrt.org | media@cybersmrt.org |

To create aliases in Google Admin:
1. Open the group
2. Go to **Email options**
3. Click **Add email alias**
4. Enter alias address

## Monitoring and Management

### Weekly Tasks

- **Review group activity**: Check each group for unanswered emails
- **Update members**: Add/remove team members as needed
- **Check spam**: Review quarantined messages

### Monthly Tasks

- **Audit membership**: Ensure right people have access
- **Review auto-replies**: Update for accuracy
- **Clean up aliases**: Remove unused aliases

### Quarterly Tasks

- **Review group structure**: Are all groups still needed?
- **Update descriptions**: Keep group purposes current
- **Train new members**: Onboard team on group usage

## Best Practices

### Email Signatures

Have team members use consistent signatures when replying from groups:

```
---
[Name]
[Title]
CyberSmrt | Service-Disabled Veteran-Owned 501(c)(3)
curriculum@cybersmrt.org
https://cybersmrt.org
```

### Response Templates

Create saved responses in Gmail for common inquiries:

**K-12 Curriculum Template:**
```
Hi [Name],

Thank you for your interest in CyberSmrt's K-12 curriculum!

Our curriculum is completely free and includes:
- Standards-aligned lesson plans
- Student activities and assessments
- Teacher resources and guides

I'd love to schedule a call to discuss your specific needs.

Are you available for a 15-minute call this week?

Best,
[Your Name]
CyberSmrt Education Team
```

### Collaborative Inbox

Consider enabling **Collaborative Inbox** for high-volume groups:

1. Open group → **Settings**
2. Enable **Collaborative Inbox**
3. Features:
   - Mark emails as "assigned", "in progress", "done"
   - Tag conversations
   - Track who's handling what
   - Prevent duplicate responses

## Security Considerations

### Spam Protection

- Enable **Spam filtering** for all groups
- Set **Post moderation** for new members (first 3 posts)
- Block messages from known spam domains

### Access Control

- Regularly audit group membership
- Remove departing employees immediately
- Use **2-factor authentication** for all group owners

### Data Retention

- Set **Message retention policy** per your organization's needs
- Default: Keep all messages
- Compliance: May need 7-year retention for 501(c)(3)

## Troubleshooting

### Emails Not Reaching Group

1. Check group's spam/quarantine
2. Verify sender isn't blocked
3. Check "Who can post" settings
4. Review message rejection settings

### Members Not Receiving Emails

1. Verify member is in group
2. Check member's email delivery preferences
3. Check member's spam folder
4. Verify member's email quota isn't full

### From Address Rejected by Resend

1. Verify domain in Resend dashboard
2. Check DNS records for SPF/DKIM
3. Wait 48 hours for DNS propagation
4. Test with a different email first

## Cost

**Google Workspace:**
- Business Starter: $6/user/month (30GB storage)
- Business Standard: $12/user/month (2TB storage)
- Business Plus: $18/user/month (5TB storage)

**Groups are free** - unlimited groups with any plan

---

**Recommended Next Steps:**

1. ✅ Create the 10 primary contact groups
2. ✅ Add tony@cybersmrt.org to all groups as Owner
3. ✅ Configure "Who can post" to allow external emails
4. ✅ Verify cybersmrt.org domain in Resend
5. ✅ Update contact-config.js with group emails
6. ✅ Test contact form with each reason
7. ✅ Monitor groups for first week to ensure proper routing

---

**Created**: 2025-01-XX
**Last Updated**: 2025-01-XX
**Version**: 1.0.0
