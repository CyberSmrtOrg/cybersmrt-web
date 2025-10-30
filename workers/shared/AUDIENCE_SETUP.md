# Resend Audience Management Setup Guide

This guide explains how to set up and use the audience management feature for your contact form.

## Overview

When users submit the contact form, they can be automatically added to targeted Resend audiences based on their selected reason for contacting. This allows you to send targeted email campaigns to different groups (e.g., K-12 educators, potential donors, volunteers).

## Features

✅ **Automatic Audience Assignment** - Contacts are automatically added to the appropriate audience based on form selection
✅ **Duplicate Handling** - Gracefully handles contacts that already exist in an audience
✅ **Confirmation Emails** - Sends personalized confirmation emails with expected response time
✅ **Notification Emails** - Notifies your team with full contact details and audience info
✅ **Cloudflare Turnstile** - Built-in bot protection
✅ **Graceful Degradation** - Works even without audience IDs configured

## Prerequisites

1. **Resend Account** with a paid plan that supports Audiences
2. **Cloudflare Account** with Turnstile configured
3. **Environment Variables** set in your Cloudflare Worker

## Setup Instructions

### Step 1: Create Resend Audiences

1. Log in to your [Resend Dashboard](https://resend.com/audiences)
2. Create an audience for each contact form category:
   - General Questions
   - K-12 Curriculum
   - Partnerships
   - Donations/Sponsorships
   - Volunteers
   - Board Members
   - Tool Support
   - Grant/Foundation
   - Media/Press
   - Technical Issues
   - Other

3. Copy the Audience ID for each (format: `aud_xxxxxxxxxxxxxxxxxxxxx`)

### Step 2: Configure Audience Mappings

Edit `/workers/shared/contact-config.js` and uncomment the `audienceId` fields, adding your Resend audience IDs:

```javascript
export const AUDIENCE_MAPPING = {
  general: {
    label: 'General Question',
    audienceId: 'aud_your_general_audience_id', // ← Add your ID here
    responseTime: '24-48 hours'
  },
  curriculum: {
    label: 'K-12 Curriculum Inquiry',
    audienceId: 'aud_your_k12_audience_id', // ← Add your ID here
    responseTime: '2-3 business days'
  },
  // ... repeat for all categories
};
```

### Step 3: Set Environment Variables

Add these environment variables to your Cloudflare Worker (API worker):

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
TURNSTILE_SECRET_KEY=0x4xxxxxxxxxxxxxxxxxxxxxxxxx

# Optional (defaults shown)
CONTACT_NOTIFICATION_EMAIL=tony@cybersmrt.org  # Where to send notifications
FRONTEND_ORIGIN=https://cybersmrt.org  # Your main domain
```

To add environment variables:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account → Workers & Pages
3. Select your `api` worker
4. Go to Settings → Variables
5. Add each variable as an "Environment Variable"
6. Click "Save and Deploy"

### Step 4: Deploy

Deploy the updated API worker:

```bash
cd workers/api
npx wrangler deploy
```

## Usage

### Testing the Contact Form

1. Visit `https://cybersmrt.org/pages/contact`
2. Fill out the form and select a reason
3. Complete the Cloudflare Turnstile challenge
4. Submit

### Expected Behavior

When a form is submitted:

1. **Turnstile Verification** - Bot protection check
2. **Audience Addition** (if configured) - Contact added to appropriate Resend audience
3. **Confirmation Email** - Sent to the submitter with:
   - Acknowledgment of their submission
   - Expected response time
   - Links to explore your site
4. **Notification Email** - Sent to your team with:
   - Full contact details
   - Their message
   - Confirmation of audience addition
   - Quick reply link

### Checking Audience Status

You can check if audiences are enabled by visiting:

```
https://api.cybersmrt.org/contact/config
```

Response if enabled:
```json
{
  "audiencesEnabled": true,
  "message": "Audience management is enabled"
}
```

Response if disabled (no audience IDs configured):
```json
{
  "audiencesEnabled": false,
  "message": "Audience management is disabled (no audience IDs configured)"
}
```

## Email Templates

### Confirmation Email (to submitter)

- **Subject**: "Thank You for Contacting CyberSmrt!"
- **Content**: Personalized with their name, submission details, and expected response time
- **Template**: `contactConfirmation` in `/workers/shared/email-service.js`

### Notification Email (to your team)

- **Subject**: "New Contact Form: [Reason] from [Name]"
- **Content**: Full contact details, message, and audience status
- **Template**: `contactNotification` in `/workers/shared/email-service.js`

## API Endpoint

### POST /contact

Submit a contact form.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "organization": "Example School",
  "reason": "curriculum",
  "message": "I'd like to learn more about your K-12 curriculum...",
  "turnstileToken": "0.xxxxxxxxxxxxx"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Thank you for contacting us! We'll be in touch soon.",
  "audienceAdded": true,
  "responseTime": "2-3 business days"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Security verification failed. Please try again.",
  "status": 403
}
```

## Audience Management API

The `EmailService` class provides three methods for managing audiences:

### Add Contact to Audience

```javascript
import { createEmailService } from './workers/shared/email-service.js';

const emailService = createEmailService(env);

await emailService.addToAudience(
  'user@example.com',
  'aud_xxxxxxxxxxxxx',
  {
    firstName: 'John',
    lastName: 'Doe',
    unsubscribed: false
  }
);
```

### Remove Contact from Audience

```javascript
await emailService.removeFromAudience(
  'contact_id_xxxxx',
  'aud_xxxxxxxxxxxxx'
);
```

### Get All Contacts in Audience

```javascript
const result = await emailService.getAudienceContacts('aud_xxxxxxxxxxxxx');
console.log(result.contacts);
```

## Customization

### Response Times

Edit `/workers/shared/contact-config.js` to customize response times:

```javascript
curriculum: {
  label: 'K-12 Curriculum Inquiry',
  audienceId: 'aud_your_id',
  responseTime: '24 hours'  // ← Change this
},
```

### Email Templates

Edit `/workers/shared/email-service.js` to customize email templates:

- **Line 95-99**: `contactConfirmation` template definition
- **Line 101-105**: `contactNotification` template definition
- **Line 708-747**: `contactConfirmation` HTML template
- **Line 749-787**: `contactNotification` HTML template

## Troubleshooting

### Contacts Not Being Added to Audiences

1. Check that `RESEND_API_KEY` is set correctly
2. Verify audience IDs in `contact-config.js` are correct
3. Check Cloudflare Worker logs for errors
4. Ensure your Resend plan supports Audiences

### Emails Not Sending

1. Verify `RESEND_API_KEY` has send permissions
2. Check sender email is verified in Resend
3. Review Worker logs for API errors
4. Check Resend dashboard for delivery status

### Turnstile Failing

1. Verify `TURNSTILE_SECRET_KEY` is correct
2. Check site key in `contact.html` matches your Cloudflare site key
3. Ensure Turnstile is enabled for your domain

## Cost Considerations

- **Resend Free Plan**: Does NOT support Audiences
- **Resend Pro Plan ($20/mo)**: Supports up to 100 audiences
- **Cloudflare Turnstile**: Free tier available
- **Cloudflare Workers**: Free tier (100,000 requests/day)

## Security

- ✅ Cloudflare Turnstile prevents spam/bots
- ✅ Email validation before API calls
- ✅ CORS protection on API endpoints
- ✅ Environment variables for secrets
- ✅ Graceful error handling (no sensitive data leaked)

## Support

For issues or questions about this feature:
- Review Worker logs in Cloudflare Dashboard
- Check Resend dashboard for API errors
- Test with `https://api.cybersmrt.org/contact/config`
- Review this documentation

---

**Created**: 2025-01-XX
**Last Updated**: 2025-01-XX
**Version**: 1.0.0
