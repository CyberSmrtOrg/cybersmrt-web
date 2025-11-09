/**
 * Cloudflare Pages Function - Proxy to Store API Worker
 *
 * This function forwards all /store/* requests to the cybersmrt-store-api worker
 * using Service Bindings for optimal performance.
 *
 * Path: /store/[[path]].js matches /store/* (e.g., /store/api/products, /store/webhooks/stripe)
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Only handle specific API paths - let Pages serve static files for everything else
  const url = new URL(request.url);
  const apiPaths = ['/store/api/', '/store/webhooks/', '/store/checkout/', '/store/products', '/store/printify/'];
  const isApiPath = apiPaths.some(path => url.pathname.startsWith(path) || url.pathname === '/store/products');

  if (!isApiPath) {
    // Not an API path - let Pages handle it (serve static file)
    return context.next();
  }

  // Check if the store API worker binding exists
  if (!env.STORE_API) {
    console.error('STORE_API binding not configured');
    return new Response('Service binding not configured', { status: 500 });
  }

  try {
    // Forward the request to the worker via service binding
    // The worker will see the request at its original path
    const response = await env.STORE_API.fetch(request);
    return response;
  } catch (error) {
    console.error('Error proxying to store API:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
