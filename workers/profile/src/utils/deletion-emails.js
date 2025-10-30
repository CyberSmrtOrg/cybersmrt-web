/**
 * Account Deletion Email Templates
 * Send confirmation and notification emails for account deletion
 */

import { createEmailService } from '../../../shared/email-service.js';

/**
 * Send deletion scheduled confirmation email
 */
export async function sendDeletionScheduledEmail(user, deletionInfo, env) {
  const deleteDate = new Date(deletionInfo.deleteAt * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailService = createEmailService(env);

  try {
    await emailService.send('deletionScheduled', user.email, {
      displayName: user.display_name,
      deleteDate,
      gracePeriodDays: deletionInfo.gracePeriodDays,
      email: user.email
    });
    return true;
  } catch (error) {
    console.error('Failed to send deletion scheduled email:', error);
    return false;
  }
}

/**
 * DEPRECATED: Old implementation below for reference
 * Replaced by centralized EmailService
 */
/*
export async function sendDeletionScheduledEmail(user, deletionInfo, env) {
  const deleteDate = new Date(deletionInfo.deleteAt * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailContent = {
    from: 'CyberSmrt <noreply@cybersmrt.org>',
    to: [user.email],
    subject: '⚠️ Account Deletion Scheduled',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .info-box { background: #e0e7ff; border: 1px solid #6366f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .button-secondary { background: #6366f1; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Account Deletion Scheduled</h1>
    </div>
    <div class="content">
      <p>Hi ${user.display_name || 'there'},</p>
      <p>Your CyberSmrt account has been scheduled for deletion.</p>

      <div class="info-box">
        <h3 style="margin-top: 0;">Deletion Details</h3>
        <p><strong>Scheduled for:</strong> ${deleteDate}</p>
        <p><strong>Days remaining:</strong> ${deletionInfo.gracePeriodDays} days</p>
        <p><strong>Account:</strong> ${user.email}</p>
      </div>

      <div class="alert">
        <h3 style="margin-top: 0;">⏰ Grace Period</h3>
        <p>You have <strong>${deletionInfo.gracePeriodDays} days</strong> to change your mind. During this time:</p>
        <ul>
          <li>Your account remains active and accessible</li>
          <li>All your data is preserved</li>
          <li>You can cancel the deletion at any time</li>
        </ul>
      </div>

      <h3>What happens on ${deleteDate}?</h3>
      <p>If you don't cancel before the scheduled date, we will permanently delete:</p>
      <ul>
        <li>Your user profile and account data</li>
        <li>All uploaded files and avatars</li>
        <li>All sessions and security logs</li>
        <li>All connected OAuth providers</li>
        <li>Two-factor authentication settings</li>
      </ul>

      <p><strong>This action cannot be undone.</strong></p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cybersmrt.org/profile.html#data" class="button button-secondary">Cancel Deletion</a>
        <a href="https://cybersmrt.org/profile.html#data" class="button">Export My Data</a>
      </div>

      <div class="footer">
        <p>Best regards,<br>The CyberSmrt Team</p>
        <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send deletion scheduled email:', error);
    return false;
  }
}

/**
 * Send deletion cancelled confirmation email
 */
export async function sendDeletionCancelledEmail(user, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('deletionCancelled', user.email, {
      displayName: user.display_name,
      email: user.email
    });
    return true;
  } catch (error) {
    console.error('Failed to send deletion cancelled email:', error);
    return false;
  }
}

/**
 * Send final deletion warning email (24 hours before deletion)
 */
export async function sendDeletionWarningEmail(user, hoursRemaining, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('deletionWarning', user.email, {
      displayName: user.display_name,
      hoursRemaining
    });
    return true;
  } catch (error) {
    console.error('Failed to send deletion warning email:', error);
    return false;
  }
}

/**
 * Send account deleted confirmation email
 */
export async function sendAccountDeletedEmail(email, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('accountDeleted', email);
    return true;
  } catch (error) {
    console.error('Failed to send account deleted email:', error);
    return false;
  }
}
