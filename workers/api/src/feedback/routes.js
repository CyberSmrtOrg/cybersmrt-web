/**
 * Feedback Routes
 * Handles website feedback submissions and sends them to Slack
 * Routes volunteer applications to volunteer@cybersmrt.org
 */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { EmailService } from '../../../shared/email-service.js';

/**
 * Send feedback to Slack Workflow Builder webhook
 * Uses simple key-value pairs instead of deprecated block format
 */
async function sendToSlack(webhookUrl, feedbackData) {
  const { name, email, message, page, userAgent } = feedbackData;

  // Slack Workflow Builder webhook payload uses simple key-value pairs
  // The keys should match the variables defined in your Slack workflow
  const slackPayload = {
    name: name,
    email: email,
    message: message,
    page: page,
    userAgent: userAgent,
    timestamp: new Date().toISOString()
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(slackPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Slack webhook error:', response.status, errorText);
    throw new Error(`Slack webhook error: ${response.status}`);
  }

  return true;
}

/**
 * Send volunteer application email to volunteer@cybersmrt.org
 */
async function sendVolunteerEmail(env, volunteerData) {
  const emailService = new EmailService(env);
  const { name, email, phone, message, subject } = volunteerData;

  const emailBody = `
New Volunteer Application

From: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

${message}

---
Submitted via CyberSmrt.org Volunteer Form
  `.trim();

  // Send email using Resend with custom subject
  await emailService.send('contactNotification', 'volunteer@cybersmrt.org', {
    name,
    email,
    organization: '',
    reasonLabel: subject,
    message,
    timestamp: new Date().toLocaleString(),
    firstName: name.split(' ')[0]
  }, {
    subject,
    replyTo: email
  });

  return true;
}

/**
 * Handle feedback routes
 */
export async function handleFeedbackRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /feedback - Submit feedback
  if (path === '/feedback' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, email, message, page, userAgent, subject } = body;

      // Validate required fields
      if (!message || message.trim().length === 0) {
        return errorResponse('Message is required', 400);
      }

      // Check if this is a volunteer application based on subject line
      const isVolunteerApplication = subject && subject.includes('Volunteer Opportunity');

      if (isVolunteerApplication) {
        // Route to volunteer@cybersmrt.org via email
        console.log('📧 Routing volunteer application to volunteer@cybersmrt.org');

        // Extract phone from message if present (volunteer form includes it)
        const phoneMatch = message.match(/Phone: (.+)/);
        const phone = phoneMatch ? phoneMatch[1] : null;

        await sendVolunteerEmail(env, {
          name: name || 'Anonymous',
          email: email || 'Not provided',
          phone,
          message: message.trim(),
          subject
        });

        return jsonResponse({
          success: true,
          message: 'Volunteer application sent successfully'
        });

      } else {
        // Regular feedback - send to Slack
        console.log('💬 Routing feedback to Slack');

        const slackWebhookUrl = env.SLACK_FEEDBACK_WEBHOOK_URL;

        if (!slackWebhookUrl) {
          console.error('SLACK_FEEDBACK_WEBHOOK_URL not configured');
          // Still return success to user, but log error
          return jsonResponse({
            success: true,
            message: 'Feedback received'
          });
        }

        // Send to Slack
        await sendToSlack(slackWebhookUrl, {
          name: name || 'Anonymous',
          email: email || 'Not provided',
          message: message.trim(),
          page: page || 'Unknown',
          userAgent: userAgent || 'Unknown'
        });

        return jsonResponse({
          success: true,
          message: 'Feedback sent successfully'
        });
      }

    } catch (error) {
      console.error('Feedback submission error:', error);
      return errorResponse('Failed to submit feedback', 500);
    }
  }

  return errorResponse('Feedback endpoint not found', 404);
}
