/**
 * Cloudflare Pages Function - Proxy to QR Proxy Worker
 *
 * This function forwards all /tools/* requests starting with qr_proxy
 * to the cybersmrt-qr-proxy worker using Service Bindings.
 *
 * Path: /tools/[[path]].js matches /tools/* (e.g., /tools/qr_proxy, /tools/qr_proxy/health)
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Only handle QR proxy paths - let Pages serve static files for everything else
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/tools/qr_proxy')) {
    // Not a QR proxy path - let Pages handle it
    return context.next();
  }

  // Check if the QR proxy worker binding exists
  if (!env.QR_PROXY) {
    console.error('QR_PROXY binding not configured');
    console.error('Available bindings:', Object.keys(env));
    return new Response(JSON.stringify({
      error: 'Service binding not configured',
      message: 'QR_PROXY worker binding is not configured in wrangler.toml',
      availableBindings: Object.keys(env)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`[QR Proxy Function] Proxying to QR_PROXY: ${url.pathname}`);

    // Forward the request to the QR proxy worker via service binding
    const response = await env.QR_PROXY.fetch(request);

    console.log(`[QR Proxy Function] Response status: ${response.status}`);

    return response;

  } catch (error) {
    console.error('[QR Proxy Function] Error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to proxy request',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
