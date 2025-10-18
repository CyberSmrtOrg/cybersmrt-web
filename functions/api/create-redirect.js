/**
 * Create Redirect API
 * Creates a short URL tracking redirect
 * POST /api/create-redirect
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { shortCode, destination, campaignId } = await request.json();

    // Validate inputs
    if (!shortCode || !destination) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: shortCode and destination are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate URL
    try {
      new URL(destination);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid destination URL'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if shortCode already exists
    const existing = await env.QR_REDIRECTS.get(shortCode);
    if (existing) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Short code already exists. Please use a different campaign ID.'
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Store redirect in KV
    const redirectData = {
      destination,
      campaignId: campaignId || shortCode,
      created: new Date().toISOString(),
      clicks: 0,
      lastAccessed: null
    };

    await env.QR_REDIRECTS.put(shortCode, JSON.stringify(redirectData));

    console.log(`Created redirect: ${shortCode} -> ${destination}`);

    return new Response(JSON.stringify({
      success: true,
      shortUrl: `https://cybersmrt.org/go/${shortCode}`,
      shortCode,
      destination,
      campaignId: redirectData.campaignId
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Create redirect error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error: ' + error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS request for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}