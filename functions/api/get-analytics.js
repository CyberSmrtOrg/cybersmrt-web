/**
 * Get Analytics API
 * Retrieves all QR code analytics data
 * GET /api/get-analytics
 */

export async function onRequest(context) {
  const { env } = context;

  try {
    // List all redirects from KV
    const list = await env.QR_REDIRECTS.list();
    const campaigns = [];
    let totalScans = 0;
    let todayScans = 0;

    const today = new Date().toISOString().split('T')[0];

    // Fetch each campaign's data
    for (const key of list.keys) {
      try {
        const data = await env.QR_REDIRECTS.get(key.name);
        if (data) {
          const campaign = JSON.parse(data);
          const clicks = campaign.clicks || 0;

          campaigns.push({
            shortCode: key.name,
            shortUrl: `https://cybersmrt.org/go/${key.name}`,
            campaignId: campaign.campaignId || key.name,
            destination: campaign.destination,
            clicks: clicks,
            created: campaign.created,
            lastAccessed: campaign.lastAccessed
          });

          totalScans += clicks;

          // Count today's scans (if last accessed today)
          if (campaign.lastAccessed && campaign.lastAccessed.startsWith(today)) {
            // This is approximate - for exact count, query QR_ANALYTICS
            todayScans += 1;
          }
        }
      } catch (err) {
        console.error(`Error processing key ${key.name}:`, err);
      }
    }

    // Calculate more accurate today's scans from analytics events
    try {
      const analyticsPrefix = await env.QR_ANALYTICS.list();
      let exactTodayScans = 0;

      for (const key of analyticsPrefix.keys) {
        const eventData = await env.QR_ANALYTICS.get(key.name);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (event.timestamp && event.timestamp.startsWith(today)) {
            exactTodayScans++;
          }
        }

        // Limit to first 100 events for performance
        if (exactTodayScans > 100) break;
      }

      todayScans = exactTodayScans;
    } catch (err) {
      console.log('Could not get exact today scans, using approximation:', err);
    }

    // Calculate average scan rate
    let avgScanRate = 0;
    if (campaigns.length > 0) {
      const sortedByDate = campaigns
        .filter(c => c.created)
        .sort((a, b) => new Date(a.created) - new Date(b.created));

      if (sortedByDate.length > 0) {
        const firstDate = new Date(sortedByDate[0].created);
        const daysSinceFirst = Math.max(1, Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
        avgScanRate = totalScans / daysSinceFirst;
      }
    }

    // Sort campaigns by clicks descending
    campaigns.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

    return new Response(JSON.stringify({
      success: true,
      totalScans,
      todayScans,
      avgScanRate: Math.round(avgScanRate * 10) / 10, // Round to 1 decimal
      totalCampaigns: campaigns.length,
      campaigns
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve analytics: ' + error.message,
      totalScans: 0,
      todayScans: 0,
      avgScanRate: 0,
      totalCampaigns: 0,
      campaigns: []
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}