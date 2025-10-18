/**
 * QR Code Redirect Handler
 * Redirects short URLs and tracks analytics
 * GET /go/{code}
 */

export async function onRequest(context) {
  const { params, env, request } = context;
  const shortCode = params.code;

  try {
    // Get redirect data from KV
    const data = await env.QR_REDIRECTS.get(shortCode);

    if (!data) {
      // Return 404 page
      return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found • CyberSmrt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 500px;
      text-align: center;
    }
    h1 {
      font-size: 3rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    p {
      color: #b0b0b0;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }
    a {
      display: inline-block;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      transition: transform 0.3s;
    }
    a:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>This QR code link doesn't exist or has expired.</p>
    <a href="https://cybersmrt.org">Go to CyberSmrt.org</a>
  </div>
</body>
</html>
      `, {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const redirectData = JSON.parse(data);

    // Collect analytics data
    const analytics = {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('User-Agent') || 'Unknown',
      referer: request.headers.get('Referer') || 'Direct',
      ip: request.headers.get('CF-Connecting-IP') || 'Unknown',
      country: request.headers.get('CF-IPCountry') || 'Unknown',
      city: request.headers.get('CF-IPCity') || 'Unknown',
      campaignId: redirectData.campaignId,
      shortCode: shortCode
    };

    // Increment click count
    redirectData.clicks = (redirectData.clicks || 0) + 1;
    redirectData.lastAccessed = new Date().toISOString();

    // Update redirect data in KV
    await env.QR_REDIRECTS.put(shortCode, JSON.stringify(redirectData));

    // Store individual analytics event with unique key
    const eventKey = `${shortCode}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
    await env.QR_ANALYTICS.put(eventKey, JSON.stringify(analytics), {
      expirationTtl: 60 * 60 * 24 * 90 // Keep for 90 days
    });

    console.log(`Redirect: ${shortCode} -> ${redirectData.destination} (Total clicks: ${redirectData.clicks})`);

    // Redirect to destination
    return Response.redirect(redirectData.destination, 302);

  } catch (error) {
    console.error('Redirect error:', error);

    // Return error page
    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error • CyberSmrt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 500px;
      text-align: center;
    }
    h1 {
      font-size: 3rem;
      color: #ff6b6b;
      margin-bottom: 1rem;
    }
    p {
      color: #b0b0b0;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }
    a {
      display: inline-block;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      transition: transform 0.3s;
    }
    a:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ Error</h1>
    <p>Something went wrong processing this link. Please try again later.</p>
    <a href="https://cybersmrt.org">Go to CyberSmrt.org</a>
  </div>
</body>
</html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}