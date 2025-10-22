/**
 * CyberSmrt API Helper
 * Handles API calls to the backend
 *
 * File path: assets/js/api.js
 * API Subdomain: api.cybersmrt.org
 * Auth Subdomain: auth.cybersmrt.org
 */

const API_BASE = 'https://api.cybersmrt.org';
const AUTH_BASE = 'https://auth.cybersmrt.org';

/**
 * Make authenticated API request
 */
async function apiCall(endpoint, options = {}) {
  const token = window.getAccessToken ? window.getAccessToken() : null;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const defaultOptions = {
    credentials: 'include', // Important for CORS with credentials
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    ...defaultOptions,
    headers: defaultOptions.headers
  });

  // Handle token expiration
  if (response.status === 401) {
    window.logout && window.logout();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Dashboard API
 */
const DashboardAPI = {
  async getDashboard() {
    return await apiCall('/dashboard');
  }
};

/**
 * Profile API
 */
const ProfileAPI = {
  async getProfile() {
    return await apiCall('/profile');
  },

  async updateProfile(data) {
    return await apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async uploadPhoto(file) {
    const token = window.getAccessToken();
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE}/profile/photo`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload photo');
    }

    return response.json();
  }
};

/**
 * Settings API
 */
const SettingsAPI = {
  async getSettings() {
    return await apiCall('/settings');
  },

  async updateSettings(data) {
    return await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 2FA endpoints
  async setup2FA() {
    return await apiCall('/settings/2fa/setup', {
      method: 'POST'
    });
  },

  async enable2FA(token) {
    return await apiCall('/settings/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async disable2FA(token) {
    return await apiCall('/settings/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async verify2FA(token) {
    return await apiCall('/settings/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async get2FAStatus() {
    return await apiCall('/settings/2fa/status');
  }
};

/**
 * Auth API (for reference - these are handled by auth.js)
 */
const AuthAPI = {
  baseUrl: AUTH_BASE,

  // OAuth endpoints
  google: `${AUTH_BASE}/google`,
  github: `${AUTH_BASE}/github`,
  microsoft: `${AUTH_BASE}/microsoft`,
  apple: `${AUTH_BASE}/apple`,

  // Get current user
  async me() {
    const token = window.getAccessToken();
    const response = await fetch(`${AUTH_BASE}/me`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  }
};

// Make APIs globally available
window.DashboardAPI = DashboardAPI;
window.ProfileAPI = ProfileAPI;
window.SettingsAPI = SettingsAPI;
window.AuthAPI = AuthAPI;
window.API_BASE = API_BASE;
window.AUTH_BASE = AUTH_BASE;

console.log('✅ API helper loaded (subdomains: api.cybersmrt.org, auth.cybersmrt.org)');