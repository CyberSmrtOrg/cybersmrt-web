export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 1. Block underscore-prefixed template files
  if (path.includes('/_')) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>404 - Page Not Found | CyberSmrt</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                  color: #fff;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  text-align: center;
                  padding: 2rem;
              }
              .error-container { max-width: 600px; }
              h1 {
                  font-size: 6rem;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  -webkit-background-clip: text;
                  background-clip: text;
                  color: transparent;
              }
              p { font-size: 1.3rem; margin: 1rem 0 2rem; color: #b0b0b0; }
              a {
                  display: inline-block;
                  padding: 1rem 2rem;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  text-decoration: none;
                  border-radius: 25px;
                  font-weight: 600;
              }
          </style>
      </head>
      <body>
          <div class="error-container">
              <h1>404</h1>
              <p>Oops! The page you're looking for doesn't exist.</p>
              <a href="/">← Return Home</a>
          </div>
      </body>
      </html>
    `, {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // 2. Redirect .html URLs to pretty URLs
  if (path.endsWith('.html') && path !== '/404.html') {
    const cleanPath = path.replace(/\.html$/, '');
    return Response.redirect(url.origin + cleanPath, 301);
  }

  // 3. Handle directory URLs (trailing slash)
  if (path.endsWith('/') && path !== '/') {
    const indexPath = path + 'index.html';
    try {
      const response = await context.env.ASSETS.fetch(new URL(indexPath, url.origin));
      if (response.ok) return response;
    } catch (e) {
      // index.html doesn't exist, continue
    }
  }

  // 4. Try to serve .html file for clean URLs
  if (!path.includes('.') && !path.endsWith('/')) {
    try {
      const htmlPath = path + '.html';
      const response = await context.env.ASSETS.fetch(new URL(htmlPath, url.origin));
      if (response.ok) return response;
    } catch (e) {
      // .html file doesn't exist, continue
    }
  }

  return context.next();
}