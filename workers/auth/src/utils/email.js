/**
 * Email Utilities
 * Send password reset and notification emails using Resend
 */

/**
 * Send password reset email via Resend
 */
export async function sendPasswordResetEmail(email, resetToken, env) {
  const resetUrl = `https://cybersmrt.org/auth/reset-password?token=${resetToken}`;

  const emailContent = {
    from: 'CyberSmrt <noreply@cybersmrt.org>',
    to: [email],
    subject: 'Reset Your CyberSmrt Password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>You requested to reset your password for your CyberSmrt account.</p>
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p><strong>If you didn't request this, please ignore this email.</strong></p>
      <div class="footer">
        <p>Best regards,<br>The CyberSmrt Team</p>
        <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  };

  // Send via Resend API
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Resend error response:', error);
    console.error('Status:', response.status);
    throw new Error(`Failed to send email: ${response.status} - ${error}`);
  }

  return true;
}

/**
 * Send password change confirmation email
 */
export async function sendPasswordChangedEmail(email, env) {
  const emailContent = {
    from: 'CyberSmrt <noreply@cybersmrt.org>',
    to: [email],
    subject: 'Your CyberSmrt Password Was Changed',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Password Changed</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>This is a confirmation that your CyberSmrt password was successfully changed.</p>
      <div class="alert">
        <strong>⚠️ If you didn't make this change:</strong><br>
        Please contact us immediately at <a href="mailto:security@cybersmrt.org">security@cybersmrt.org</a>
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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    console.error('Failed to send confirmation email');
    // Don't throw error - password was changed, email is just confirmation
  }

  return true;
}