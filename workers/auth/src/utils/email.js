/**
 * Email Utilities
 * Send password reset and notification emails using centralized EmailService
 */

import { createEmailService } from '../../../shared/email-service.js';

/**
 * Send password reset email via Resend
 */
export async function sendPasswordResetEmail(email, resetToken, env) {
  const resetUrl = `https://cybersmrt.org/reset-password?token=${resetToken}`;
  const emailService = createEmailService(env);

  try {
    await emailService.send('passwordReset', email, { resetUrl });
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send password change confirmation email
 */
export async function sendPasswordChangedEmail(email, env) {
  const emailService = createEmailService(env);

  try {
    await emailService.send('passwordChanged', email);
    return true;
  } catch (error) {
    console.error('Failed to send password changed email:', error);
    // Don't throw error - password was changed, email is just confirmation
    return true;
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(email, verificationToken, env) {
  const verifyUrl = `${env.FRONTEND_ORIGIN || 'https://cybersmrt.org'}/verify-email?token=${verificationToken}`;
  const emailService = createEmailService(env);

  try {
    await emailService.send('emailVerification', email, { verifyUrl });
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

/**
 * Send welcome email after email verification
 */
export async function sendWelcomeEmail(email, displayName, env) {
  const dashboardUrl = `${env.FRONTEND_ORIGIN || 'https://cybersmrt.org'}/dashboard`;
  const emailService = createEmailService(env);

  try {
    await emailService.send('welcome', email, { displayName, dashboardUrl });
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw error - email is just a nice-to-have
    return true;
  }
}