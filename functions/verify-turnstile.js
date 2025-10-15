export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No token provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify with Cloudflare
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP')
        })
      }
    );

    const outcome = await verifyResponse.json();

    return new Response(JSON.stringify({
      success: outcome.success,
      error: outcome.success ? null : 'Verification failed'
    }), {
      status: outcome.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('Turnstile verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}