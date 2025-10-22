/**
 * Response Utilities
 * Standardized API responses with CORS support
 *
 * File path: workers/api/src/utils/response.js
 */

const ALLOWED_ORIGINS = [
  'https://cybersmrt.org',
  'https://www.cybersmrt.org',
  'http://localhost:8788',
  'http://localhost:3000',
];

/**
 * Get CORS headers based on request origin
 */
function getCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data, status = 200, headers = {}, request = null) {
  const origin = request?.headers?.get('Origin') || 'https://cybersmrt.org';

  return new Response(JSON.stringify({
    success: true,
    ...data,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
      ...headers,
    },
  });
}

export function errorResponse(message, status = 400, headers = {}, request = null) {
  const origin = request?.headers?.get('Origin') || 'https://cybersmrt.org';

  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
      ...headers,
    },
  });
}

export function binaryResponse(data, contentType, headers = {}, request = null) {
  const origin = request?.headers?.get('Origin') || 'https://cybersmrt.org';

  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      ...getCorsHeaders(origin),
      ...headers,
    },
  });
}