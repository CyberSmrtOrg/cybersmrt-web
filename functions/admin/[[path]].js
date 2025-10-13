// Cloudflare Pages Function for /admin/* routes
// This provides proper server-side authentication

// ⚠️ IMPORTANT: Store these in Cloudflare Pages Environment Variables!
// Go to: Dashboard → Pages → Your Project → Settings → Environment Variables
// Add: ADMIN_USERNAME and ADMIN_PASSWORD
const ADMIN_USERNAME = 'tony'; // Fallback - use env vars in production!
const ADMIN_PASSWORD = 'CyberSmrt2025!'; // CHANGE THIS! Use env vars!

export async function onRequest(context) {
    const { request, env } = context;

    // Get credentials from environment variables (more secure)
    const validUsername = env.ADMIN_USERNAME || ADMIN_USERNAME;
    const validPassword = env.ADMIN_PASSWORD || ADMIN_PASSWORD;

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