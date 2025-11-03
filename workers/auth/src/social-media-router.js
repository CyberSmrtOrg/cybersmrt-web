/**
 * Social Media Router
 * Handles OAuth connections and content posting to social media platforms
 */

export class SocialMediaRouter {
  constructor(env, request, user) {
    this.env = env;
    this.request = request;
    this.user = user;
  }

  /**
   * Ensure the social_media_connections table exists
   */
  async ensureTables() {
    try {
      // Create social_media_connections table if it doesn't exist
      await this.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS social_media_connections (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok', 'bluesky', 'twitter')),
          platform_user_id TEXT NOT NULL,
          platform_username TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expires_at INTEGER,
          scope TEXT,
          profile_data TEXT,
          is_active INTEGER DEFAULT 1,
          last_used_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `).run();

      // Create indexes if they don't exist
      await this.env.DB.batch([
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_social_user_id ON social_media_connections(user_id)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_social_platform ON social_media_connections(platform)`),
        this.env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_social_platform_user ON social_media_connections(platform, platform_user_id)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_social_active ON social_media_connections(is_active)`)
      ]);

      // Create social_media_posts table if it doesn't exist
      await this.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS social_media_posts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          connection_id TEXT NOT NULL,
          platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok', 'bluesky', 'twitter')),
          content TEXT NOT NULL,
          media_urls TEXT,
          platform_post_id TEXT,
          platform_post_url TEXT,
          status TEXT NOT NULL CHECK (status IN ('pending', 'published', 'failed', 'deleted')),
          error_message TEXT,
          scheduled_for INTEGER,
          published_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (connection_id) REFERENCES social_media_connections(id) ON DELETE CASCADE
        )
      `).run();

      // Create indexes for posts
      await this.env.DB.batch([
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON social_media_posts(user_id)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_connection_id ON social_media_posts(connection_id)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_platform ON social_media_posts(platform)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_status ON social_media_posts(status)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON social_media_posts(scheduled_for)`),
        this.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_published ON social_media_posts(published_at)`)
      ]);
    } catch (error) {
      // Tables may already exist, which is fine
      console.log('Table setup:', error.message);
    }
  }

  /**
   * Get all social media connections for the current user
   */
  async getConnections() {
    await this.ensureTables();

    const result = await this.env.DB.prepare(`
      SELECT
        id,
        platform,
        platform_user_id,
        platform_username,
        scope,
        is_active,
        last_used_at,
        created_at,
        updated_at
      FROM social_media_connections
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `).bind(this.user.id).all();

    return {
      success: true,
      connections: result.results || []
    };
  }

  /**
   * Initiate OAuth flow for a social platform
   */
  async initiateOAuth(platform) {
    const validPlatforms = ['linkedin', 'facebook', 'instagram', 'tiktok', 'bluesky', 'twitter'];

    if (!validPlatforms.includes(platform)) {
      return { success: false, error: 'Invalid platform' };
    }

    // Store state for OAuth callback verification
    const state = crypto.randomUUID();
    await this.env.SESSIONS.put(
      `oauth_state:${state}`,
      JSON.stringify({
        userId: this.user.id,
        platform,
        type: 'social_media',
        timestamp: Date.now()
      }),
      { expirationTtl: 600 } // 10 minutes
    );

    // Generate OAuth URLs based on platform
    let authUrl;
    switch (platform) {
      case 'linkedin':
        authUrl = this.getLinkedInAuthUrl(state);
        break;
      case 'facebook':
      case 'instagram':
        authUrl = this.getFacebookAuthUrl(state);
        break;
      case 'tiktok':
        authUrl = this.getTikTokAuthUrl(state);
        break;
      case 'bluesky':
        authUrl = this.getBlueskyAuthUrl(state);
        break;
      case 'twitter':
        authUrl = this.getTwitterAuthUrl(state);
        break;
      default:
        return { success: false, error: 'Platform OAuth not yet implemented' };
    }

    return {
      success: true,
      authUrl
    };
  }

  /**
   * Handle OAuth callback and store connection
   */
  async handleCallback(platform, code, state) {
    // Verify state
    const stateData = await this.env.SESSIONS.get(`oauth_state:${state}`);
    if (!stateData) {
      return { success: false, error: 'Invalid or expired state' };
    }

    const { userId, type } = JSON.parse(stateData);
    if (type !== 'social_media') {
      return { success: false, error: 'Invalid OAuth type' };
    }

    // Exchange code for access token based on platform
    let tokenData;
    try {
      switch (platform) {
        case 'linkedin':
          tokenData = await this.exchangeLinkedInToken(code);
          break;
        case 'facebook':
        case 'instagram':
          tokenData = await this.exchangeFacebookToken(code);
          break;
        case 'tiktok':
          tokenData = await this.exchangeTikTokToken(code);
          break;
        case 'bluesky':
          tokenData = await this.exchangeBlueskyToken(code);
          break;
        case 'twitter':
          tokenData = await this.exchangeTwitterToken(code);
          break;
        default:
          return { success: false, error: 'Platform not supported' };
      }

      // Store the connection
      await this.storeConnection(userId, platform, tokenData);

      // Clean up state
      await this.env.SESSIONS.delete(`oauth_state:${state}`);

      return {
        success: true,
        platform,
        username: tokenData.username
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect a social media platform
   */
  async disconnect(connectionId) {
    await this.ensureTables();

    const result = await this.env.DB.prepare(`
      UPDATE social_media_connections
      SET is_active = 0, updated_at = unixepoch('now')
      WHERE id = ? AND user_id = ?
    `).bind(connectionId, this.user.id).run();

    if (result.meta.changes === 0) {
      return { success: false, error: 'Connection not found' };
    }

    return { success: true };
  }

  /**
   * Post content to connected platforms
   */
  async post(content, platforms, mediaUrls = []) {
    await this.ensureTables();

    // Get active connections for requested platforms
    const placeholders = platforms.map(() => '?').join(',');
    const connections = await this.env.DB.prepare(`
      SELECT * FROM social_media_connections
      WHERE user_id = ? AND platform IN (${placeholders}) AND is_active = 1
    `).bind(this.user.id, ...platforms).all();

    if (!connections.results || connections.results.length === 0) {
      return { success: false, error: 'No active connections found for requested platforms' };
    }

    const results = [];
    for (const connection of connections.results) {
      try {
        // Post to each platform
        const postResult = await this.postToPlatform(connection, content, mediaUrls);

        // Save post record
        const postId = crypto.randomUUID();
        await this.env.DB.prepare(`
          INSERT INTO social_media_posts
          (id, user_id, connection_id, platform, content, media_urls, platform_post_id, platform_post_url, status, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch('now'), unixepoch('now'), unixepoch('now'))
        `).bind(
          postId,
          this.user.id,
          connection.id,
          connection.platform,
          content,
          JSON.stringify(mediaUrls),
          postResult.postId,
          postResult.postUrl,
          'published'
        ).run();

        // Update last_used_at
        await this.env.DB.prepare(`
          UPDATE social_media_connections
          SET last_used_at = unixepoch('now')
          WHERE id = ?
        `).bind(connection.id).run();

        results.push({
          platform: connection.platform,
          success: true,
          postUrl: postResult.postUrl
        });
      } catch (error) {
        results.push({
          platform: connection.platform,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results
    };
  }

  // Helper methods for each platform

  getLinkedInAuthUrl(state) {
    const clientId = this.env.LINKEDIN_CLIENT_ID;
    const redirectUri = `https://auth.cybersmrt.org/callback/social/linkedin`;
    const scope = 'openid profile email w_member_social';

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
  }

  getFacebookAuthUrl(state) {
    const clientId = this.env.FACEBOOK_CLIENT_ID;
    const redirectUri = `https://auth.cybersmrt.org/callback/social/facebook`;
    const scope = 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
  }

  getTikTokAuthUrl(state) {
    const clientKey = this.env.TIKTOK_CLIENT_KEY;
    const redirectUri = `https://auth.cybersmrt.org/callback/social/tiktok`;
    const scope = 'video.upload,video.publish';

    return `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
  }

  getBlueskyAuthUrl(state) {
    // Bluesky uses app passwords or OAuth with ATP protocol
    // For now, return a placeholder - this needs to be implemented with proper AT Protocol OAuth
    return `https://bsky.app/settings/app-passwords?state=${state}`;
  }

  getTwitterAuthUrl(state) {
    const clientId = this.env.TWITTER_CLIENT_ID;
    const redirectUri = `https://auth.cybersmrt.org/callback/social/twitter`;
    const scope = 'tweet.read tweet.write users.read offline.access';

    return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}&code_challenge=challenge&code_challenge_method=plain`;
  }

  async exchangeLinkedInToken(code) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.env.LINKEDIN_CLIENT_ID,
        client_secret: this.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: 'https://auth.cybersmrt.org/callback/social/linkedin'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange LinkedIn token');
    }

    const data = await response.json();

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const profile = await profileResponse.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      platformUserId: profile.sub,
      username: profile.name,
      profileData: JSON.stringify(profile)
    };
  }

  async exchangeFacebookToken(code) {
    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${this.env.FACEBOOK_CLIENT_ID}&client_secret=${this.env.FACEBOOK_CLIENT_SECRET}&redirect_uri=${encodeURIComponent('https://auth.cybersmrt.org/callback/social/facebook')}&code=${code}`);

    if (!response.ok) {
      throw new Error('Failed to exchange Facebook token');
    }

    const data = await response.json();

    // Get user profile
    const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${data.access_token}`);
    const profile = await profileResponse.json();

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      platformUserId: profile.id,
      username: profile.name,
      profileData: JSON.stringify(profile)
    };
  }

  async exchangeTikTokToken(code) {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.env.TIKTOK_CLIENT_KEY,
        client_secret: this.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://auth.cybersmrt.org/callback/social/tiktok'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange TikTok token');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      platformUserId: data.open_id,
      username: data.open_id, // TikTok doesn't provide username in token response
      profileData: JSON.stringify(data)
    };
  }

  async exchangeBlueskyToken(code) {
    // Bluesky OAuth implementation - placeholder
    throw new Error('Bluesky OAuth not yet implemented');
  }

  async exchangeTwitterToken(code) {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.env.TWITTER_CLIENT_ID}:${this.env.TWITTER_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://auth.cybersmrt.org/callback/social/twitter',
        code_verifier: 'challenge'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Twitter token');
    }

    const data = await response.json();

    // Get user profile
    const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const profileData = await profileResponse.json();
    const profile = profileData.data;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      platformUserId: profile.id,
      username: profile.username,
      profileData: JSON.stringify(profile)
    };
  }

  async storeConnection(userId, platform, tokenData) {
    await this.ensureTables();

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = tokenData.expiresIn ? now + tokenData.expiresIn : null;

    // Check if connection already exists
    const existing = await this.env.DB.prepare(`
      SELECT id FROM social_media_connections
      WHERE user_id = ? AND platform = ? AND platform_user_id = ?
    `).bind(userId, platform, tokenData.platformUserId).first();

    if (existing) {
      // Update existing connection
      await this.env.DB.prepare(`
        UPDATE social_media_connections
        SET access_token = ?, refresh_token = ?, token_expires_at = ?,
            scope = ?, profile_data = ?, is_active = 1, updated_at = ?
        WHERE id = ?
      `).bind(
        tokenData.accessToken,
        tokenData.refreshToken || null,
        expiresAt,
        tokenData.scope || null,
        tokenData.profileData || null,
        now,
        existing.id
      ).run();
    } else {
      // Insert new connection
      await this.env.DB.prepare(`
        INSERT INTO social_media_connections
        (id, user_id, platform, platform_user_id, platform_username, access_token, refresh_token,
         token_expires_at, scope, profile_data, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        id,
        userId,
        platform,
        tokenData.platformUserId,
        tokenData.username,
        tokenData.accessToken,
        tokenData.refreshToken || null,
        expiresAt,
        tokenData.scope || null,
        tokenData.profileData || null,
        now,
        now
      ).run();
    }
  }

  async postToPlatform(connection, content, mediaUrls) {
    // Platform-specific posting logic
    switch (connection.platform) {
      case 'linkedin':
        return await this.postToLinkedIn(connection, content, mediaUrls);
      case 'facebook':
        return await this.postToFacebook(connection, content, mediaUrls);
      case 'instagram':
        return await this.postToInstagram(connection, content, mediaUrls);
      case 'tiktok':
        return await this.postToTikTok(connection, content, mediaUrls);
      case 'twitter':
        return await this.postToTwitter(connection, content, mediaUrls);
      default:
        throw new Error(`Posting to ${connection.platform} not yet implemented`);
    }
  }

  async postToLinkedIn(connection, content, mediaUrls) {
    // LinkedIn posting implementation
    throw new Error('LinkedIn posting coming soon');
  }

  async postToFacebook(connection, content, mediaUrls) {
    // Facebook posting implementation
    throw new Error('Facebook posting coming soon');
  }

  async postToInstagram(connection, content, mediaUrls) {
    // Instagram posting implementation
    throw new Error('Instagram posting coming soon');
  }

  async postToTikTok(connection, content, mediaUrls) {
    // TikTok posting implementation
    throw new Error('TikTok posting coming soon');
  }

  async postToTwitter(connection, content, mediaUrls) {
    // Twitter posting implementation
    throw new Error('Twitter posting coming soon');
  }
}
