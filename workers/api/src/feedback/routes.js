/**
 * Feedback Routes
 * Handles website feedback submissions and sends them to Slack
 */

import { jsonResponse, errorResponse } from '../utils/response.js';

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
 * Handle feedback routes
 */
export async function handleFeedbackRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /feedback - Submit feedback
  if (path === '/feedback' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, email, message, page, userAgent } = body;

      // Validate required fields
      if (!message || message.trim().length === 0) {
        return errorResponse('Message is required', 400);
      }

      // Get Slack webhook URL from environment
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

    } catch (error) {
      console.error('Feedback submission error:', error);
      return errorResponse('Failed to submit feedback', 500);
    }
  }

  return errorResponse('Feedback endpoint not found', 404);
}
