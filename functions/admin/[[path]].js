    // Cloudflare Pages Function for /admin/* routes
    // This provides proper server-side authentication
    // ⚠️ Credentials must be provided via Cloudflare Pages environment variables:
    // ADMIN_USERNAME and ADMIN_PASSWORD (set for both Production and Preview).
    // No hard-coded defaults in code.

    export async function onRequest(context) {
    const { request, env } = context;



    // Get credentials from environment variables (more secure)
    const validUsername = env.ADMIN_USERNAME;
      const validPassword = env.ADMIN_PASSWORD;
      if (!validUsername || !validPassword) {
        return new Response('Server misconfigured: missing ADMIN_USERNAME/ADMIN_PASSWORD', {
          status: 500
        });
      }

    // Check for Authorization header
    const authorization = request.headers.get('Authorization');

    if (!authorization) {
        return new Response('Authentication Required', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="CyberSmrt Admin"',
                'Content-Type': 'text/html'
            }
        });
    }

    // Parse Basic Auth
    const [scheme, encoded] = authorization.split(' ');

    if (!encoded || scheme !== 'Basic') {
        return new Response('Invalid Authentication', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="CyberSmrt Admin"'
            }
        });
    }

    // Decode credentials
    const buffer = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(buffer);
    const [username, password] = decoded.split(':');

    // Verify credentials
    if (username === validUsername && password === validPassword) {
        // Authentication successful - allow access
        return context.next();
    } else {
        // Authentication failed
        return new Response('Invalid Credentials', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="CyberSmrt Admin"'
            }
        });
    }
}