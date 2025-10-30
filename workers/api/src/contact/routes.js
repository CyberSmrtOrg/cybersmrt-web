/**
 * Contact Form Routes
 * Handles contact form submissions with Turnstile verification and audience management
 */

import { createEmailService } from '../../../shared/email-service.js';
import { getAudienceConfig, audiencesEnabled } from '../../../shared/contact-config.js';
import { jsonResponse, errorResponse } from '../utils/response.js';

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token, env) {
  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const outcome = await result.json();
  console.log('Turnstile verification outcome:', outcome);

  if (!outcome.success) {
    console.error('Turnstile errors:', outcome['error-codes']);
  }

  return outcome.success;
}

/**
 * Handle contact form submission
 */
export async function handleContactRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /contact - Submit contact form
  if (path === '/contact' && request.method === 'POST') {
    try {
      const data = await request.json();

      // Validate required fields
      const { firstName, lastName, email, reason, message, turnstileToken } = data;

      if (!firstName || !lastName || !email || !reason || !message) {
        return errorResponse('Missing required fields', 400);
      }

      // Verify Turnstile token
      if (!turnstileToken) {
        return errorResponse('Security verification required', 400);
      }

      const turnstileValid = await verifyTurnstile(turnstileToken, env);
      if (!turnstileValid) {
        console.error('Turnstile verification failed for token:', turnstileToken.substring(0, 20) + '...');
        return errorResponse('Security verification failed. Please try again.', 403);
      }
      console.log('✅ Turnstile verification passed');

      // Get audience configuration for this reason
      const audienceConfig = getAudienceConfig(reason);
      console.log('📋 Contact reason:', reason, '- Config:', { label: audienceConfig.label, fromEmail: audienceConfig.fromEmail, notifyEmail: audienceConfig.notifyEmail });
      const fullName = `${firstName} ${lastName}`;

      // Initialize email service
      const emailService = createEmailService(env);

      // Add to Resend audience if configured
      let audienceResult = null;
      if (audienceConfig.audienceId) {
        try {
          audienceResult = await emailService.addToAudience(
            email,
            audienceConfig.audienceId,
            { firstName, lastName }
          );
          console.log('✅ Contact added to audience:', audienceResult);
        } catch (error) {
          // Log but don't fail the submission if audience add fails
          console.error('⚠️ Failed to add to audience:', error);
        }
      }

      // Send confirmation email to submitter
      try {
        const confirmationData = {
          firstName,
          name: fullName,
          email,
          organization: data.organization,
          reasonLabel: audienceConfig.label,
          responseTime: audienceConfig.responseTime
        };
        const confirmationOptions = {
          from: audienceConfig.fromEmail || 'CyberSmrt <noreply@cybersmrt.org>',
          replyTo: audienceConfig.notifyEmail || env.CONTACT_NOTIFICATION_EMAIL || 'tony@cybersmrt.org'
        };
        console.log('📧 Sending confirmation email with data:', confirmationData, 'options:', confirmationOptions);

        await emailService.send('contactConfirmation', email, confirmationData, confirmationOptions);
        console.log('✅ Confirmation email sent to:', email);
      } catch (error) {
        console.error('⚠️ Failed to send confirmation email:', error);
        // Continue even if confirmation fails
      }

      // Send notification email to appropriate Google Group
      try {
        const notificationEmail = audienceConfig.notifyEmail || env.CONTACT_NOTIFICATION_EMAIL || 'tony@cybersmrt.org';
        await emailService.send('contactNotification', notificationEmail, {
          firstName,
          name: fullName,
          email,
          organization: data.organization || 'N/A',
          reasonLabel: audienceConfig.label,
          message,
          timestamp: new Date().toLocaleString(),
          audienceAdded: !!audienceResult,
          audienceName: audienceConfig.label
        }, {
          from: 'CyberSmrt Contact System <noreply@cybersmrt.org>',
          replyTo: email  // Replies go directly to the contact
        });
        console.log('✅ Notification email sent to:', notificationEmail);
      } catch (error) {
        console.error('⚠️ Failed to send notification email:', error);
        // Continue even if notification fails
      }

      return jsonResponse({
        success: true,
        message: 'Thank you for contacting us! We\'ll be in touch soon.',
        audienceAdded: !!audienceResult,
        responseTime: audienceConfig.responseTime
      });

    } catch (error) {
      console.error('Contact form error:', error);
      return errorResponse(
        'An error occurred while processing your message. Please try again or email us directly at tony@cybersmrt.org',
        500
      );
    }
  }

  // GET /contact/config - Get audience configuration (for debugging)
  if (path === '/contact/config' && request.method === 'GET') {
    return jsonResponse({
      audiencesEnabled: audiencesEnabled(),
      message: audiencesEnabled()
        ? 'Audience management is enabled'
        : 'Audience management is disabled (no audience IDs configured)'
    });
  }

  return errorResponse('Endpoint not found', 404);
}
