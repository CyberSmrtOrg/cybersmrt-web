/**
 * Feedback Routes
 * Handles website feedback submissions and sends them to Slack
 */

import { jsonResponse, errorResponse } from '../utils/response.js';

/**
 * Send feedback to Slack
 */
async function sendToSlack(webhookUrl, feedbackData) {
  const { name, email, message, page, userAgent } = feedbackData;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🐛 Website Feedback',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*From:*\n${name}`
        },
        {
          type: 'mrkdwn',
          text: `*Email:*\n${email}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${message}`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Page:*\n<${page}|${page}>`
        }
      ]
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `User Agent: ${userAgent}`
        }
      ]
    },
    {
      type: 'divider'
    }
  ];

  const slackPayload = {
    text: `Website Feedback from ${name}`,
    blocks
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(slackPayload)
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
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
