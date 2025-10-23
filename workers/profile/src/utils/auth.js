/**
 * Authentication Utilities
 * Verify JWT tokens from the auth worker
 */

import * as jose from 'jose';

/**
 * Verify JWT token with HS256 signature verification
 */
export async function verifyToken(token, env) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '');

    // Get JWT secret from environment
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Import secret as HMAC key
    const secret = new TextEncoder().encode(jwtSecret);

    // Verify and decode token
    const { payload } = await jose.jwtVerify(cleanToken, secret, {
      issuer: 'cybersmrt.org',
      audience: 'cybersmrt-users',
      algorithms: ['HS256'],
    });

    // Validate required fields
    if (!payload.sub) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role || 'user',
    };
  } catch (error) {
    // Provide more specific error messages
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token expired');
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Invalid token signature');
    }
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Authenticate request
 * Extracts and verifies JWT from Authorization header
 */
export async function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = await verifyToken(authHeader, env);
  return token;
}

/**
 * Check if user owns the resource
 */
export function checkOwnership(authenticatedUserId, resourceUserId) {
  if (authenticatedUserId !== resourceUserId) {
    throw new Error('Unauthorized: You can only access your own resources');
  }
}
