/**
 * Response Utilities
 * Standardized API responses
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify({
    success: true,
    ...data,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export function errorResponse(message, status = 400, headers = {}) {
  return new Response(JSON.stringify({
    success: false,
    error: message,
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export function binaryResponse(data, contentType, headers = {}) {
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      ...CORS_HEADERS,
      ...headers,
    },
  });
}
