/**
 * Authentication Utilities
 * Verify JWT tokens from the auth worker
 */

/**
 * Verify JWT token
 * In production, this should verify the token signature
 * For now, we'll decode and validate basic structure
 */
export async function verifyToken(token, env) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '');

    // Split JWT into parts
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    // Validate required fields
    if (!payload.userId) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
    };
  } catch (error) {
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
