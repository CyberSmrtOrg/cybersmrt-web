/**
 * Centralized Email Service for Resend
 * Provides reusable, robust email sending with templates, retry logic, and monitoring
 */

// ========================================
// EMAIL TEMPLATES
// ========================================

const EMAIL_TEMPLATES = {
  passwordReset: (data) => ({
    subject: 'Reset Your CyberSmrt Password',
    html: renderTemplate('password-reset', data),
    text: `Reset your password: ${data.resetUrl}\n\nThis link expires in 1 hour.`
  }),

  passwordChanged: (data) => ({
    subject: 'Your CyberSmrt Password Was Changed',
    html: renderTemplate('password-changed', data),
    text: 'Your CyberSmrt password was successfully changed. If you didn\'t make this change, contact us immediately.'
  }),

  emailVerification: (data) => ({
    subject: 'Verify Your CyberSmrt Email',
    html: renderTemplate('email-verification', data),
    text: `Verify your email: ${data.verifyUrl}\n\nThis link expires in 24 hours.`
  }),

  welcome: (data) => ({
    subject: 'Welcome to CyberSmrt - Let\'s Secure Your Digital Life!',
    html: renderTemplate('welcome', data),
    text: `Welcome to CyberSmrt, ${data.displayName}! Your email has been verified. Visit your dashboard at ${data.dashboardUrl}`
  }),

  deletionScheduled: (data) => ({
    subject: '⚠️ Account Deletion Scheduled',
    html: renderTemplate('deletion-scheduled', data),
    text: `Your account will be deleted on ${data.deleteDate}. You have ${data.gracePeriodDays} days to cancel.`
  }),

  deletionCancelled: (data) => ({
    subject: '✓ Account Deletion Cancelled',
    html: renderTemplate('deletion-cancelled', data),
    text: 'Your account deletion has been cancelled. Your account is safe.'
  }),

  deletionWarning: (data) => ({
    subject: `⚠️ Account Deletion in ${data.hoursRemaining} Hours`,
    html: renderTemplate('deletion-warning', data),
    text: `FINAL WARNING: Your account will be deleted in ${data.hoursRemaining} hours. Cancel now to keep your account.`
  }),

  accountDeleted: (data) => ({
    subject: 'Account Deleted',
    html: renderTemplate('account-deleted', data),
    text: 'Your CyberSmrt account has been permanently deleted.'
  }),

  securityAlert: (data) => ({
    subject: `🚨 Security Alert: ${data.alertType}`,
    html: renderTemplate('security-alert', data),
    text: `Security Alert: ${data.message}\n\nLocation: ${data.location}\nTime: ${data.time}`
  }),

  newDeviceAlert: (data) => ({
    subject: '🔒 New Device Login Detected',
    html: renderTemplate('new-device-alert', data),
    text: `New device login detected at ${data.time} from ${data.location}. Device: ${data.device}, Browser: ${data.browser}`
  }),

  newLocationAlert: (data) => ({
    subject: '🌍 Login From New Location Detected',
    html: renderTemplate('new-location-alert', data),
    text: `Login from new location: ${data.location}, ${data.country}. ${data.distance ? `Distance: ${data.distance}km from usual location.` : ''}`
  }),

  failedLoginAlert: (data) => ({
    subject: '⚠️ Multiple Failed Login Attempts Detected',
    html: renderTemplate('failed-login-alert', data),
    text: `${data.attempts} failed login attempts detected from IP ${data.ipAddress} at ${data.time}.`
  }),

  twoFADisabledAlert: (data) => ({
    subject: '🔐 Two-Factor Authentication Disabled',
    html: renderTemplate('2fa-disabled-alert', data),
    text: `Two-factor authentication was disabled on your account at ${data.time} from ${data.location}.`
  }),

  suspiciousActivityAlert: (data) => ({
    subject: `⚠️ Suspicious Activity Detected (${data.riskLevel.toUpperCase()} Risk)`,
    html: renderTemplate('suspicious-activity-alert', data),
    text: `Suspicious activity detected with ${data.riskLevel} risk level (score: ${data.riskScore}/100). Flags: ${data.flags.join(', ')}`
  }),

  contactConfirmation: (data) => ({
    subject: 'Thank You for Contacting CyberSmrt!',
    html: renderTemplate('contact-confirmation', data),
    text: `Thank you for contacting CyberSmrt! We've received your message regarding "${data.reasonLabel}" and will respond within ${data.responseTime}.`
  }),

  contactNotification: (data) => ({
    subject: `New Contact Form: ${data.reasonLabel} from ${data.name}`,
    html: renderTemplate('contact-notification', data),
    text: `New contact form submission:\n\nFrom: ${data.name} (${data.email})\nOrganization: ${data.organization || 'N/A'}\nReason: ${data.reasonLabel}\n\nMessage:\n${data.message}`
  }),

  orderConfirmation: (data) => ({
    subject: `Order Confirmed - ${data.orderNumber} | CyberSmrt Store`,
    html: renderTemplate('order-confirmation', data),
    text: `Order Confirmed!\n\nOrder Number: ${data.orderNumber}\nTotal: $${(data.total / 100).toFixed(2)}\n\nYour order has been confirmed and will be processed within 2-3 business days. You'll receive tracking information once your order ships.\n\nThank you for supporting CyberSmrt!`
  })
};

// ========================================
// TEMPLATE RENDERER
// ========================================

function renderTemplate(templateName, data) {
  const baseStyle = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        line-height: 1.6;
        color: #1e293b;
        margin: 0;
        padding: 0;
        background: #f1f5f9;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 40px auto;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }
      .content {
        padding: 40px 30px;
      }
      .content p {
        margin: 16px 0;
        color: #475569;
      }
      .button {
        display: inline-block;
        padding: 14px 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white !important;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        margin: 20px 0;
        transition: transform 0.2s;
      }
      .button:hover {
        transform: translateY(-2px);
      }
      .alert-box {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .success-box {
        background: #d1fae5;
        border-left: 4px solid #10b981;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .danger-box {
        background: #fee2e2;
        border-left: 4px solid #ef4444;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .info-box {
        background: #e0e7ff;
        border-left: 4px solid #6366f1;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .footer {
        background: #f8fafc;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e2e8f0;
      }
      .footer p {
        margin: 8px 0;
        font-size: 14px;
        color: #64748b;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
      ul {
        margin: 12px 0;
        padding-left: 20px;
      }
      li {
        margin: 8px 0;
        color: #475569;
      }
    </style>
  `;

  // Template-specific content
  const templates = {
    'password-reset': `
      <div class="email-wrapper">
        <div class="header">
          <h1>🔐 Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>You requested to reset your password for your CyberSmrt account.</p>
          <p>Click the button below to create a new password. This link will expire in 1 hour.</p>
          <p style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
          </p>
          <div class="alert-box">
            <strong>⚠️ Security Note:</strong> If you didn't request this password reset, please ignore this email and consider enabling two-factor authentication on your account.
          </div>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
          <p>Service-Disabled Veteran-Owned 501(c)(3) Nonprofit</p>
        </div>
      </div>
    `,

    'password-changed': `
      <div class="email-wrapper">
        <div class="header">
          <h1>✅ Password Changed</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>This is a confirmation that your CyberSmrt password was successfully changed.</p>
          <div class="success-box">
            <strong>✓ Password Updated</strong><br>
            Your password was changed at ${data.timestamp || 'just now'}.
          </div>
          <div class="danger-box">
            <strong>🚨 Didn't make this change?</strong><br>
            If you didn't change your password, your account may be compromised. Please contact us immediately at <a href="mailto:security@cybersmrt.org" style="color: #ef4444;">security@cybersmrt.org</a>
          </div>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'email-verification': `
      <div class="email-wrapper">
        <div class="header">
          <h1>🎉 Welcome to CyberSmrt!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Thank you for creating a CyberSmrt account. We're excited to have you join our mission to secure the underserved!</p>
          <p>Please verify your email address to activate your account and unlock all features.</p>
          <p style="text-align: center;">
            <a href="${data.verifyUrl}" class="button">Verify Email Address</a>
          </p>
          <div class="info-box">
            <strong>📌 This link expires in 24 hours.</strong><br>
            If you didn't create this account, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'welcome': `
      <div class="email-wrapper">
        <div class="header">
          <h1>🚀 You're All Set!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p><strong>Your email is now verified!</strong> You have full access to all CyberSmrt features.</p>

          <h3 style="color: #1e293b; margin-top: 30px;">What You Can Do:</h3>

          <div class="info-box">
            <strong>🔍 QR Code Scanner</strong><br>
            Scan QR codes safely with built-in threat detection powered by VirusTotal.
          </div>

          <div class="info-box">
            <strong>🔐 Security Tools</strong><br>
            Password strength checker, phishing detector, and breach database lookups.
          </div>

          <div class="info-box">
            <strong>📚 Free Education</strong><br>
            Access cybersecurity courses designed for everyone - no experience needed.
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="${data.dashboardUrl || 'https://cybersmrt.org/dashboard'}" class="button">Go to Dashboard</a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            Need help? Contact us at <a href="mailto:info@cybersmrt.org">info@cybersmrt.org</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
          <p>A Service-Disabled Veteran-Owned 501(c)(3) Nonprofit</p>
        </div>
      </div>
    `,

    'deletion-scheduled': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <h1>⚠️ Account Deletion Scheduled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>Your CyberSmrt account has been scheduled for deletion.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Deletion Details</h3>
            <p><strong>Scheduled for:</strong> ${data.deleteDate}</p>
            <p><strong>Days remaining:</strong> ${data.gracePeriodDays} days</p>
            <p><strong>Account:</strong> ${data.email}</p>
          </div>

          <div class="alert-box">
            <h3 style="margin-top: 0;">⏰ Grace Period</h3>
            <p>You have <strong>${data.gracePeriodDays} days</strong> to change your mind. During this time:</p>
            <ul>
              <li>Your account remains active and accessible</li>
              <li>All your data is preserved</li>
              <li>You can cancel the deletion at any time</li>
            </ul>
          </div>

          <h3>What will be deleted on ${data.deleteDate}?</h3>
          <ul>
            <li>Your user profile and account data</li>
            <li>All uploaded files and avatars</li>
            <li>All sessions and security logs</li>
            <li>Connected OAuth providers</li>
            <li>Two-factor authentication settings</li>
          </ul>

          <p><strong style="color: #ef4444;">This action cannot be undone.</strong></p>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#data" class="button">Cancel Deletion</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'deletion-cancelled': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <h1>✅ Deletion Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>Good news! Your account deletion has been successfully cancelled.</p>

          <div class="success-box">
            <h3 style="margin-top: 0;">Your Account is Safe</h3>
            <p>Your CyberSmrt account (<strong>${data.email}</strong>) will remain active, and all your data has been preserved.</p>
          </div>

          <p>You can continue using your account as normal. Thanks for staying with us!</p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'deletion-warning': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <h1>⏰ Final Warning</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>This is your final reminder that your CyberSmrt account will be <strong style="color: #ef4444;">permanently deleted in ${data.hoursRemaining} hours</strong>.</p>

          <div class="danger-box">
            <h3 style="margin-top: 0;">🚨 Last Chance to Cancel</h3>
            <p>After deletion, we will permanently remove:</p>
            <ul>
              <li>All your profile data</li>
              <li>Uploaded files and avatars</li>
              <li>Security logs and session history</li>
              <li>Two-factor authentication settings</li>
            </ul>
            <p><strong style="color: #ef4444;">This action is irreversible and cannot be undone.</strong></p>
          </div>

          <p>If you want to keep your account, please cancel the deletion immediately:</p>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#data" class="button" style="background: #ef4444;">Cancel Deletion Now</a>
          </p>

          <p style="margin-top: 30px; color: #64748b; font-size: 0.9rem;">
            If you intended to delete your account, no action is required. The deletion will proceed automatically.
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'account-deleted': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">
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

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org" class="button">Visit CyberSmrt.org</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'security-alert': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <h1>🚨 Security Alert</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p><strong>We detected unusual activity on your account.</strong></p>

          <div class="danger-box">
            <h3 style="margin-top: 0;">Alert Details</h3>
            <p><strong>Type:</strong> ${data.alertType}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
            <p><strong>IP Address:</strong> ${data.ipAddress || 'N/A'}</p>
            <p style="margin-top: 16px;">${data.message}</p>
          </div>

          <h3>What Should You Do?</h3>
          <ul>
            <li>If this was you, no action is needed</li>
            <li>If this wasn't you, secure your account immediately</li>
            <li>Change your password</li>
            <li>Enable two-factor authentication</li>
            <li>Review your recent activity</li>
          </ul>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#security" class="button" style="background: #ef4444;">Secure My Account</a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            Need help? Contact us at <a href="mailto:security@cybersmrt.org">security@cybersmrt.org</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'new-device-alert': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <h1>🔒 New Device Login</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>We detected a login to your CyberSmrt account from a new device.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Login Details</h3>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Device:</strong> ${data.device || 'Unknown'}</p>
            <p><strong>Browser:</strong> ${data.browser || 'Unknown'}</p>
            <p><strong>Operating System:</strong> ${data.os || 'Unknown'}</p>
            <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
          </div>

          <div class="alert-box">
            <p><strong>⚠️ If this wasn't you:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication</li>
              <li>Review your security activity log</li>
            </ul>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Security Team</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'new-location-alert': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <h1>🌍 New Location Login</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>We detected a login to your CyberSmrt account from a new location${data.distance ? ` (<strong>${data.distance}km</strong> from your usual location)` : ''}.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Login Details</h3>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
            <p><strong>Country:</strong> ${data.country || 'Unknown'}</p>
            <p><strong>City:</strong> ${data.city || 'Unknown'}</p>
          </div>

          <div class="alert-box">
            <p><strong>⚠️ If this wasn't you:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Review your active sessions</li>
              <li>Enable two-factor authentication if you haven't already</li>
            </ul>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Security Team</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'failed-login-alert': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <h1>⚠️ Failed Login Attempts</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>We detected <strong>${data.attempts}</strong> failed login attempts on your CyberSmrt account in the last 15 minutes.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Attempt Details</h3>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Failed Attempts:</strong> ${data.attempts}</p>
            <p><strong>IP Address:</strong> ${data.ipAddress}</p>
          </div>

          <div class="alert-box">
            <p><strong>🛡️ Recommended Actions:</strong></p>
            <ul>
              <li>Change your password if you suspect unauthorized access</li>
              <li>Enable two-factor authentication for extra security</li>
              <li>Review your security activity log</li>
              <li>Make sure your password is strong and unique</li>
            </ul>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Security Team</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    '2fa-disabled-alert': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <h1>🔐 2FA Disabled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>Two-factor authentication was disabled on your CyberSmrt account.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Action Details</h3>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Browser:</strong> ${data.browser || 'Unknown'}</p>
            <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
          </div>

          <div class="danger-box">
            <p><strong>⚠️ If this wasn't you:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Re-enable two-factor authentication</li>
              <li>Review your security activity log</li>
              <li>End all active sessions except your current one</li>
            </ul>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/2fa-settings.html" class="button" style="background: #ef4444;">Re-Enable 2FA</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Security Team</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'suspicious-activity-alert': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, ${data.riskLevel === 'critical' ? '#dc2626' : data.riskLevel === 'high' ? '#ea580c' : data.riskLevel === 'medium' ? '#f59e0b' : '#3b82f6'} 0%, ${data.riskLevel === 'critical' ? '#991b1b' : data.riskLevel === 'high' ? '#c2410c' : data.riskLevel === 'medium' ? '#d97706' : '#2563eb'} 100%);">
          <h1>⚠️ Suspicious Activity</h1>
        </div>
        <div class="content">
          <p>Hi ${data.displayName || 'there'},</p>
          <p>We detected suspicious activity on your CyberSmrt account with a <strong>${data.riskLevel}</strong> risk level (score: ${data.riskScore}/100).</p>

          <div class="alert-box">
            <h3 style="margin-top: 0;">Suspicious Patterns Detected:</h3>
            <ul>
              ${(data.flags || []).map(flag => `<li>${flag.replace(/_/g, ' ')}</li>`).join('')}
            </ul>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0;">Event Time</h3>
            <p>${data.time}</p>
          </div>

          <div class="alert-box">
            <p><strong>🛡️ Recommended Actions:</strong></p>
            <ul>
              <li>Review your recent security activity</li>
              <li>Change your password if you notice anything unusual</li>
              <li>Enable two-factor authentication if not already enabled</li>
              <li>Review and end any suspicious active sessions</li>
            </ul>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://cybersmrt.org/profile.html#security" class="button">Review Security Activity</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Security Team</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'contact-confirmation': `
      <div class="email-wrapper">
        <div class="header">
          <h1>✅ Message Received!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.firstName},</p>
          <p>Thank you for reaching out to CyberSmrt! We've received your message and wanted to confirm we'll be in touch soon.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Your Submission</h3>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            ${data.organization ? `<p><strong>Organization:</strong> ${data.organization}</p>` : ''}
            <p><strong>Subject:</strong> ${data.reasonLabel}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid #667eea;">${data.message}</p>
          </div>

          <div class="success-box">
            <p><strong>⏰ What's Next?</strong></p>
            <p>Our team typically responds within <strong>${data.responseTime}</strong>. We'll get back to you as soon as possible!</p>
          </div>

          <p style="margin-top: 30px;">While you wait, feel free to explore:</p>
          <ul>
            <li><a href="https://cybersmrt.org/#programs">Our cybersecurity programs</a></li>
            <li><a href="https://cybersmrt.org/pages/blog">Latest blog posts and resources</a></li>
            <li><a href="https://cybersmrt.org/pages/tools">Free security tools</a></li>
          </ul>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            Have more questions? Just reply to this email - we're here to help!
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
          <p>Service-Disabled Veteran-Owned 501(c)(3) Nonprofit</p>
        </div>
      </div>
    `,

    'contact-notification': `
      <div class="email-wrapper">
        <div class="header">
          <h1>📬 New Contact Form</h1>
        </div>
        <div class="content">
          <p>You've received a new contact form submission:</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            ${data.organization ? `<p><strong>Organization:</strong> ${data.organization}</p>` : ''}
            <p><strong>Reason:</strong> ${data.reasonLabel}</p>
            <p><strong>Submitted:</strong> ${data.timestamp || new Date().toLocaleString()}</p>
          </div>

          <div class="alert-box">
            <h3 style="margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap;">${data.message}</p>
          </div>

          ${data.audienceAdded ? `
          <div class="success-box">
            <p><strong>✅ Contact Added to Audience</strong></p>
            <p>This contact has been automatically added to the <strong>${data.audienceName}</strong> audience for targeted communications.</p>
          </div>
          ` : ''}

          <p style="text-align: center; margin-top: 30px;">
            <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.reasonLabel)}" class="button">Reply to ${data.firstName}</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Contact System</strong></p>
          <p><a href="https://cybersmrt.org">cybersmrt.org</a></p>
        </div>
      </div>
    `,

    'order-confirmation': `
      <div class="email-wrapper">
        <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <h1>✅ Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi${data.customerName ? ` ${data.customerName.split(' ')[0]}` : ''},</p>
          <p><strong>Thank you for your order!</strong> Your payment has been confirmed and your order is being processed.</p>

          <div class="success-box">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Order Date:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
            <p><strong>Total:</strong> $${(data.total / 100).toFixed(2)} USD</p>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0;">Shipping Address</h3>
            <p style="white-space: pre-line;">${data.shippingAddress}</p>
          </div>

          ${data.items && data.items.length > 0 ? `
          <div class="info-box">
            <h3 style="margin-top: 0;">Items Ordered</h3>
            ${data.items.map(item => `
              <div style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0;"><strong>${item.title}</strong></p>
                ${item.variant ? `<p style="margin: 5px 0 0 0; font-size: 0.9em; color: #64748b;">${item.variant}</p>` : ''}
                <p style="margin: 5px 0 0 0;">Quantity: ${item.quantity} × $${(item.price / 100).toFixed(2)}</p>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="alert-box">
            <h3 style="margin-top: 0;">🎯 Your Impact</h3>
            <p><strong>100% of profits</strong> from this purchase go directly to funding:</p>
            <ul>
              <li>K-12 cybersecurity education programs</li>
              <li>Free student resources and tools</li>
              <li>Sliding-scale security services for nonprofits</li>
            </ul>
            <p>Thank you for helping us bridge the cybersecurity skills gap!</p>
          </div>

          <h3>What Happens Next?</h3>
          <ul>
            <li>Your order will be printed and processed within <strong>2-3 business days</strong></li>
            <li>Shipping typically takes <strong>5-7 business days</strong> for US orders</li>
            <li>You'll receive tracking information via email once shipped</li>
          </ul>

          <p style="text-align: center; margin-top: 30px;">
            <a href="https://store.cybersmrt.org" class="button">Continue Shopping</a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            Questions about your order? Reply to this email or contact us at <a href="mailto:orders@cybersmrt.org">orders@cybersmrt.org</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>CyberSmrt Store</strong></p>
          <p><a href="https://store.cybersmrt.org">store.cybersmrt.org</a></p>
          <p>Service-Disabled Veteran-Owned 501(c)(3) Nonprofit</p>
        </div>
      </div>
    `
  };

  const templateContent = templates[templateName] || '<p>Email template not found</p>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CyberSmrt Email</title>
  ${baseStyle}
</head>
<body>
  ${templateContent}
</body>
</html>`;
}

// ========================================
// EMAIL SERVICE CLASS
// ========================================

export class EmailService {
  constructor(env) {
    this.env = env;
    this.apiKey = env.RESEND_API_KEY;
    this.apiUrl = 'https://api.resend.com/emails';
    this.fromEmail = 'CyberSmrt <noreply@cybersmrt.org>';
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Validate email address
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Send email with retry logic
   */
  async send(templateName, to, data = {}, options = {}) {
    // Validate email
    if (!this.validateEmail(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    // Get template
    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    const emailContent = template(data);

    const payload = {
      from: options.from || this.fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject: options.subject || emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      ...(options.replyTo && { reply_to: options.replyTo }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.attachments && { attachments: options.attachments }),
      ...(options.tags && { tags: options.tags })
    };

    // Retry logic
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📧 Sending email (attempt ${attempt}/${this.maxRetries}):`, {
          template: templateName,
          to,
          subject: payload.subject
        });

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          const errorMsg = responseData.message || `HTTP ${response.status}`;
          throw new Error(`Resend API error: ${errorMsg}`);
        }

        console.log('✅ Email sent successfully:', {
          id: responseData.id,
          template: templateName,
          to
        });

        return {
          success: true,
          id: responseData.id,
          template: templateName,
          to
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ Email send failed (attempt ${attempt}/${this.maxRetries}):`, error.message);

        // Don't retry on validation errors
        if (error.message.includes('Invalid email')) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error('💥 Email send failed after all retries');
    throw lastError;
  }

  /**
   * Send multiple emails in batch
   */
  async sendBatch(emails) {
    const results = await Promise.allSettled(
      emails.map(({ template, to, data, options }) =>
        this.send(template, to, data, options)
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Batch send complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      succeeded,
      failed,
      results: results.map((r, i) => ({
        ...emails[i],
        success: r.status === 'fulfilled',
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    };
  }

  /**
   * Add contact to Resend audience
   * @param {string} email - Contact email address
   * @param {string} audienceId - Resend audience ID
   * @param {object} metadata - Optional metadata (firstName, lastName, etc.)
   * @returns {Promise<object>} Result with success status and contact ID
   */
  async addToAudience(email, audienceId, metadata = {}) {
    if (!this.validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    if (!audienceId) {
      throw new Error('Audience ID is required');
    }

    try {
      console.log(`📬 Adding contact to audience:`, {
        email,
        audienceId,
        metadata
      });

      const payload = {
        email,
        ...(metadata.firstName && { first_name: metadata.firstName }),
        ...(metadata.lastName && { last_name: metadata.lastName }),
        ...(metadata.unsubscribed !== undefined && { unsubscribed: metadata.unsubscribed })
      };

      const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.message || `HTTP ${response.status}`;

        // Handle duplicate contact gracefully
        if (response.status === 400 && errorMsg.includes('already exists')) {
          console.log(`ℹ️ Contact already exists in audience:`, email);
          return {
            success: true,
            alreadyExists: true,
            email
          };
        }

        throw new Error(`Resend Audiences API error: ${errorMsg}`);
      }

      console.log('✅ Contact added to audience:', {
        id: responseData.id,
        email
      });

      return {
        success: true,
        id: responseData.id,
        email,
        audienceId
      };

    } catch (error) {
      console.error('❌ Failed to add contact to audience:', error.message);
      throw error;
    }
  }

  /**
   * Remove contact from Resend audience
   * @param {string} contactId - Contact ID in Resend
   * @param {string} audienceId - Resend audience ID
   * @returns {Promise<object>} Result with success status
   */
  async removeFromAudience(contactId, audienceId) {
    if (!contactId || !audienceId) {
      throw new Error('Contact ID and Audience ID are required');
    }

    try {
      console.log(`🗑️ Removing contact from audience:`, {
        contactId,
        audienceId
      });

      const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const responseData = await response.json();
        const errorMsg = responseData.message || `HTTP ${response.status}`;
        throw new Error(`Resend Audiences API error: ${errorMsg}`);
      }

      console.log('✅ Contact removed from audience');

      return {
        success: true,
        contactId,
        audienceId
      };

    } catch (error) {
      console.error('❌ Failed to remove contact from audience:', error.message);
      throw error;
    }
  }

  /**
   * Get all contacts in an audience
   * @param {string} audienceId - Resend audience ID
   * @returns {Promise<object>} List of contacts
   */
  async getAudienceContacts(audienceId) {
    if (!audienceId) {
      throw new Error('Audience ID is required');
    }

    try {
      const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.message || `HTTP ${response.status}`;
        throw new Error(`Resend Audiences API error: ${errorMsg}`);
      }

      return {
        success: true,
        contacts: responseData.data || [],
        audienceId
      };

    } catch (error) {
      console.error('❌ Failed to get audience contacts:', error.message);
      throw error;
    }
  }
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Create email service instance
 */
export function createEmailService(env) {
  return new EmailService(env);
}

/**
 * Quick send functions for common emails
 */
export async function sendPasswordResetEmail(email, resetToken, env) {
  const emailService = createEmailService(env);
  const resetUrl = `https://cybersmrt.org/reset-password?token=${resetToken}`;
  return emailService.send('passwordReset', email, { resetUrl });
}

export async function sendPasswordChangedEmail(email, displayName, env) {
  const emailService = createEmailService(env);
  const timestamp = new Date().toLocaleString();
  return emailService.send('passwordChanged', email, { displayName, timestamp });
}

export async function sendVerificationEmail(email, verificationToken, env) {
  const emailService = createEmailService(env);
  const verifyUrl = `${env.FRONTEND_ORIGIN || 'https://cybersmrt.org'}/verify-email?token=${verificationToken}`;
  return emailService.send('emailVerification', email, { verifyUrl });
}

export async function sendWelcomeEmail(email, displayName, env) {
  const emailService = createEmailService(env);
  const dashboardUrl = `${env.FRONTEND_ORIGIN || 'https://cybersmrt.org'}/dashboard`;
  return emailService.send('welcome', email, { displayName, dashboardUrl });
}

export async function sendSecurityAlert(email, displayName, alertData, env) {
  const emailService = createEmailService(env);
  return emailService.send('securityAlert', email, { displayName, ...alertData });
}

// Export template list for documentation
export const AVAILABLE_TEMPLATES = Object.keys(EMAIL_TEMPLATES);
