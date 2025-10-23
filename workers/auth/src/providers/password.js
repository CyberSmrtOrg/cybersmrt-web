/**
 * Email/Password Authentication Provider with Enhanced Security
 * Includes threat detection, device tracking, and account lockout protection
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createResetToken,
  verifyResetToken,
  createVerificationToken,
  verifyEmailToken
} from '../utils/password.js';
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendVerificationEmail,
  sendWelcomeEmail
} from '../utils/email.js';
import { logSecurityEvent } from '../utils/security.js';
import {
  checkAccountLockout,
  lockAccount,
  resetFailedLoginCount,
  recordLoginAttempt,
  recordDeviceActivity
} from '../utils/device-manager.js';
import {
  analyzeThreat,
  getRecommendedAction,
  createThreatReport,
  detectCredentialStuffing,
  detectAccountEnumeration
} from '../utils/threat-detection.js';
import { getDeviceInfo } from '../utils/device.js';

/**
 * Register new user with email and password
 */
export async function registerWithPassword(email, password, displayName, request, env) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  validatePasswordStrength(password);

  // Check if user already exists
  const existingUser = await env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await env.DB
    .prepare(`
      INSERT INTO users (
        id, email, display_name, password_hash,
        email_verified, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      userId,
      email.toLowerCase(),
      displayName || email.split('@')[0],
      passwordHash,
      0, // Email not verified yet
      now,
      now
    )
    .run();

  // Log registration
  await logSecurityEvent(userId, 'login', request, env, {
    method: 'password',
    action: 'account_created',
  });

  // Create verification token and send email
  const verificationToken = await createVerificationToken(userId, env);
  await sendVerificationEmail(email.toLowerCase(), verificationToken, env);

  return {
    userId,
    email: email.toLowerCase(),
    displayName: displayName || email.split('@')[0],
  };
}

/**
 * Login with email and password (Enhanced with threat detection)
 */
export async function loginWithPassword(email, password, request, env) {
  const ipAddress = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For') ||
                    'unknown';
  const deviceInfo = await getDeviceInfo(request);
  const deviceFingerprint = deviceInfo.fingerprint;

  // 1. Check for account enumeration attack
  const enumerationCheck = await detectAccountEnumeration(ipAddress, env);
  if (enumerationCheck.detected) {
    await logSecurityEvent(null, 'security_alert', request, env, {
      alertType: 'account_enumeration',
      details: enumerationCheck
    });
    // Don't reveal this to the attacker, just log it
  }

  // 2. Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  if (!user) {
    // Record failed attempt for enumeration detection
    await recordLoginAttempt(email, ipAddress, deviceFingerprint, false, 'user_not_found', env);
    throw new Error('Invalid email or password');
  }

  // 3. Check for account lockout
  const lockoutCheck = await checkAccountLockout(email, env);
  if (lockoutCheck.locked) {
    const minutesRemaining = Math.ceil(lockoutCheck.remainingSeconds / 60);
    throw new Error(`Account is locked. Please try again in ${minutesRemaining} minutes.`);
  }

  // 4. Check for credential stuffing attack
  const stuffingCheck = await detectCredentialStuffing(email, env);
  if (stuffingCheck.detected) {
    await logSecurityEvent(user.id, 'security_alert', request, env, {
      alertType: 'credential_stuffing',
      details: stuffingCheck
    });
    // Lock the account for protection
    await lockAccount(email, 30, env); // 30 minute lockout
    throw new Error('Suspicious activity detected. Your account has been temporarily locked for security.');
  }

  // 5. Check if user has a password set
  if (!user.password_hash) {
    await recordLoginAttempt(email, ipAddress, deviceFingerprint, false, 'oauth_only', env);
    throw new Error('This account uses OAuth login. Please sign in with Google, GitHub, or Microsoft.');
  }

  // 6. Verify password
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    // Record failed attempt
    await recordLoginAttempt(email, ipAddress, deviceFingerprint, false, 'invalid_password', env);

    await logSecurityEvent(user.id, 'failed_login', request, env, {
      reason: 'invalid_password',
    });

    // Check if we should lock the account
    const recentFailures = lockoutCheck.recentFailureCount || 0;
    if (recentFailures >= 4) {
      // 5th failure - lock for 15 minutes
      await lockAccount(email, 15, env);
      throw new Error('Too many failed attempts. Account locked for 15 minutes.');
    } else if (recentFailures >= 9) {
      // 10th failure - lock for 1 hour
      await lockAccount(email, 60, env);
      throw new Error('Too many failed attempts. Account locked for 1 hour.');
    }

    throw new Error('Invalid email or password');
  }

  // 7. Check if account is active
  if (user.is_active === 0) {
    await recordLoginAttempt(email, ipAddress, deviceFingerprint, false, 'account_disabled', env);
    throw new Error('Account is disabled');
  }

  // 8. Perform comprehensive threat analysis
  const threatAnalysis = await analyzeThreat(user.id, email, request, env);
  const recommendedAction = getRecommendedAction(threatAnalysis);

  // 9. Log threat analysis
  const threatReport = createThreatReport(threatAnalysis, recommendedAction);
  await logSecurityEvent(user.id, 'threat_analysis', request, env, threatReport);

  // 10. Take action based on threat level
  if (recommendedAction.action === 'block') {
    await recordLoginAttempt(email, ipAddress, deviceFingerprint, false, 'blocked_threat', env);
    await logSecurityEvent(user.id, 'login_blocked', request, env, {
      reason: recommendedAction.reason,
      threatLevel: threatAnalysis.threatLevel,
      riskScore: threatAnalysis.riskScore
    });
    throw new Error(recommendedAction.message);
  }

  if (recommendedAction.action === 'challenge') {
    // For now, just log - we'll implement email verification challenge later
    await logSecurityEvent(user.id, 'login_challenge_required', request, env, {
      reason: recommendedAction.reason,
      challengeType: recommendedAction.challengeType,
      threatLevel: threatAnalysis.threatLevel,
      riskScore: threatAnalysis.riskScore
    });
    // TODO: Implement device verification challenge flow
    // For now, allow but log the warning
  }

  // 11. Record successful login
  await recordLoginAttempt(email, ipAddress, deviceFingerprint, true, null, env);

  // 12. Reset failed login count
  await resetFailedLoginCount(email, env);

  // 13. Record device activity
  const deviceResult = await recordDeviceActivity(user.id, request, env);

  // 14. Log successful login
  await logSecurityEvent(user.id, 'login', request, env, {
    method: 'password',
    deviceId: deviceResult.deviceId,
    isNewDevice: deviceResult.isNewDevice,
    isTrusted: deviceResult.isTrusted,
    threatLevel: threatAnalysis.threatLevel,
    riskScore: threatAnalysis.riskScore
  });

  // 15. Return user with additional security context
  return {
    ...user,
    _securityContext: {
      threatLevel: threatAnalysis.threatLevel,
      riskScore: threatAnalysis.riskScore,
      requiresChallenge: recommendedAction.action === 'challenge',
      warningMessage: recommendedAction.message,
      deviceId: deviceResult.deviceId,
      isNewDevice: deviceResult.isNewDevice,
      isTrusted: deviceResult.isTrusted
    }
  };
}

/**
 * Change password (requires current password)
 */
export async function changePassword(userId, currentPassword, newPassword, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  // If user has a password, verify current password
  if (user.password_hash) {
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      await logSecurityEvent(userId, 'failed_login', request, env, {
        reason: 'invalid_current_password',
        action: 'password_change_attempt',
      });
      throw new Error('Current password is incorrect');
    }
  }

  // Validate new password strength
  validatePasswordStrength(newPassword);

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, userId)
    .run();

  // Log password change
  await logSecurityEvent(userId, 'password_change', request, env);

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, env);

  return true;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  // Always return success to prevent email enumeration
  if (!user) {
    // Still wait to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  // Generate reset token
  const token = await createResetToken(user.id, env);

  // Send reset email
  await sendPasswordResetEmail(user.email, token, env);

  // Log password reset request
  await logSecurityEvent(user.id, 'password_reset_request', request, env);

  return true;
}

/**
 * Reset password with token
 */
export async function resetPassword(token, newPassword, request, env) {
  // Verify token and get user ID
  const userId = await verifyResetToken(token, env);

  // Validate new password
  validatePasswordStrength(newPassword);

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  const now = Math.floor(Date.now() / 1000);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, userId)
    .run();

  // Get user for email
  const user = await env.DB
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first();

  // Log password reset
  await logSecurityEvent(userId, 'password_reset_complete', request, env);

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, env);

  return true;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token, request, env) {
  // Verify token and mark email as verified
  const userId = await verifyEmailToken(token, env);

  // Get user info
  const user = await env.DB
    .prepare('SELECT email, display_name FROM users WHERE id = ?')
    .bind(userId)
    .first();

  // Log email verification
  await logSecurityEvent(userId, 'email_verified', request, env);

  // Send welcome email
  await sendWelcomeEmail(user.email, user.display_name, env);

  return {
    userId,
    email: user.email,
    displayName: user.display_name,
  };
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email, request, env) {
  // Get user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();

  // Always return success to prevent email enumeration
  if (!user) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  // Check if already verified
  if (user.email_verified === 1) {
    return { alreadyVerified: true };
  }

  // Delete any existing verification tokens for this user
  await env.DB
    .prepare('DELETE FROM email_verification_tokens WHERE user_id = ?')
    .bind(user.id)
    .run();

  // Create new verification token
  const verificationToken = await createVerificationToken(user.id, env);

  // Send verification email
  await sendVerificationEmail(user.email, verificationToken, env);

  // Log resend request (using 'email_verification_sent' since 'resent' is not in CHECK constraint)
  await logSecurityEvent(user.id, 'email_verification_sent', request, env);

  return true;
}
