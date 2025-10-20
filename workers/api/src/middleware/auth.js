/**
 * Authentication Middleware
 * Validates JWT tokens from auth worker
 */

import * as jose from 'jose';

function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

async function verifyToken(token, env) {
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

export async function authenticate(request, env) {
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

export async function optionalAuth(request, env) {
  try {
    return await authenticate(request, env);
  } catch (error) {
    return null;
  }
}
