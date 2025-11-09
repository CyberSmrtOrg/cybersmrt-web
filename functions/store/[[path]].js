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

  console.log(`[Store Function] Path: ${url.pathname}, isApiPath: ${isApiPath}`);

  if (!isApiPath) {
    // Not an API path - let Pages handle it (serve static file)
    return context.next();
  }

  // Check if the store API worker binding exists
  if (!env.STORE_API) {
    console.error('STORE_API binding not configured');
    console.error('Available bindings:', Object.keys(env));
    return new Response(JSON.stringify({
      error: 'Service binding not configured',
      availableBindings: Object.keys(env)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`[Store Function] Proxying to STORE_API: ${url.pathname}`);

    // Strip /store prefix from the path before sending to worker
    // Worker routes are /products, /checkout/*, /api/orders, etc.
    const workerPath = url.pathname.replace(/^\/store/, '') || '/';
    const workerUrl = new URL(workerPath + url.search, request.url);

    console.log(`[Store Function] Worker path: ${workerPath}`);

    // Create new request with modified URL
    const workerRequest = new Request(workerUrl, request);

    // Forward the request to the worker via service binding
    const response = await env.STORE_API.fetch(workerRequest);
    console.log(`[Store Function] Response status: ${response.status}`);
    return response;
  } catch (error) {
    console.error('Error proxying to store API:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
