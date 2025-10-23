/**
 * Account Deletion Email Templates
 * Send confirmation and notification emails for account deletion
 */

/**
 * Send deletion scheduled confirmation email
 */
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
  const emailContent = {
    from: 'CyberSmrt <noreply@cybersmrt.org>',
    to: [user.email],
    subject: '✓ Account Deletion Cancelled',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .success-box { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Deletion Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi ${user.display_name || 'there'},</p>
      <p>Good news! Your account deletion has been successfully cancelled.</p>

      <div class="success-box">
        <h3 style="margin-top: 0;">Your Account is Safe</h3>
        <p>Your CyberSmrt account (<strong>${user.email}</strong>) will remain active, and all your data has been preserved.</p>
      </div>

      <p>You can continue using your account as normal. If you have any questions or concerns, please don't hesitate to contact us.</p>

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
    console.error('Failed to send deletion cancelled email:', error);
    return false;
  }
}

/**
 * Send final deletion warning email (24 hours before deletion)
 */
export async function sendDeletionWarningEmail(user, hoursRemaining, env) {
  const emailContent = {
    from: 'CyberSmrt <noreply@cybersmrt.org>',
    to: [user.email],
    subject: `⚠️ Account Deletion in ${hoursRemaining} Hours`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Final Warning</h1>
    </div>
    <div class="content">
      <p>Hi ${user.display_name || 'there'},</p>
      <p>This is your final reminder that your CyberSmrt account will be <strong>permanently deleted in ${hoursRemaining} hours</strong>.</p>

      <div class="warning">
        <h3 style="margin-top: 0;">⏰ Last Chance to Cancel</h3>
        <p>After deletion, we will permanently remove:</p>
        <ul>
          <li>All your profile data</li>
          <li>Uploaded files and avatars</li>
          <li>Security logs and session history</li>
          <li>Two-factor authentication settings</li>
        </ul>
        <p><strong>This action is irreversible and cannot be undone.</strong></p>
      </div>

      <p>If you want to keep your account, please cancel the deletion immediately:</p>

      <div style="text-align: center;">
        <a href="https://cybersmrt.org/profile.html#data" class="button">Cancel Deletion Now</a>
      </div>

      <p style="margin-top: 30px; color: #64748b; font-size: 0.9rem;">If you intended to delete your account, no action is required. The deletion will proceed automatically.</p>

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
    console.error('Failed to send deletion warning email:', error);
    return false;
  }
}

/**
 * Send account deleted confirmation email
 */
export async function sendAccountDeletedEmail(email, env) {
  const emailContent = {
    from: 'CyberSmrt <noreply@cybersmrt.org>',
    to: [email],
    subject: 'Account Deleted',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #f3f4f6; border: 1px solid #d1d5db; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Deleted</h1>
    </div>
    <div class="content">
      <p>Your CyberSmrt account has been permanently deleted as requested.</p>

      <div class="info-box">
        <h3 style="margin-top: 0;">What's Been Deleted</h3>
        <p>We have permanently removed:</p>
        <ul>
          <li>Your user profile and personal information</li>
          <li>All uploaded files and avatars</li>
          <li>Session history and security logs</li>
          <li>Two-factor authentication settings</li>
          <li>Connected OAuth providers</li>
        </ul>
      </div>

      <p>We're sorry to see you go. If you change your mind, you're always welcome to create a new account.</p>

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
    console.error('Failed to send account deleted email:', error);
    return false;
  }
}
