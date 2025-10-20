/**
 * JWT Token Generation and Validation
 * Uses jose library for secure JWT handling
 */

import * as jose from 'jose';

/**
 * Generate JWT access token
 */
export async function generateAccessToken(userId, email, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const jwt = await new jose.SignJWT({
    sub: userId,
    email: email,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('cybersmrt.org')
    .setAudience('cybersmrt-users')
    .setExpirationTime(env.JWT_EXPIRY || '7d')
    .sign(secret);

  return jwt;
}

/**
 * Generate refresh token (longer-lived)
 */
export async function generateRefreshToken(userId, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const jwt = await new jose.SignJWT({
    sub: userId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('cybersmrt.org')
    .setAudience('cybersmrt-users')
    .setExpirationTime('30d')  // Refresh tokens last 30 days
    .sign(secret);

  return jwt;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token, env) {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);

    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: 'cybersmrt.org',
      audience: 'cybersmrt-users',
    });

    return payload;
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken, env) {
  // Verify refresh token
  const payload = await verifyToken(refreshToken, env);

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  // Get user from database
  const user = await env.DB
    .prepare('SELECT id, email, is_active FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.is_active) {
    throw new Error('User account is disabled');
  }

  // Generate new access token
  return await generateAccessToken(user.id, user.email, env);
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);  // Remove 'Bearer ' prefix
}

/**
 * Validate token from request and return user info
 */
export async function authenticateRequest(request, env) {
  const token = extractBearerToken(request);

  if (!token) {
    throw new Error('No authorization token provided');
  }

  const payload = await verifyToken(token, env);

  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return {
    userId: payload.sub,
    email: payload.email,
  };
}