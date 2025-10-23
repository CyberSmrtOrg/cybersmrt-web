/**
 * CyberSmrt Authentication Helper - UNIFIED
 * File: auth.js (replace your existing auth.js with this)
 */

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    const payload = parseJWT(token);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (err) {
    return false;
  }
}

/**
 * Parse JWT token
 */
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse JWT:', err);
    return null;
  }
}

/**
 * Get current user
 */
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (err) {
    return null;
  }
}

/**
 * Get access token
 */
function getAccessToken() {
  return localStorage.getItem('accessToken');
}

/**
 * Get refresh token
 */
function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

/**
 * Logout user
 */
function logout() {
  const accessToken = getAccessToken();

  // Clear localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionId');

  // Call logout endpoint
  if (accessToken) {
    fetch('https://auth.cybersmrt.org/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    }).catch(err => console.error('Logout error:', err));
  }

  // Redirect to home
  window.location.href = '/';
}

/**
 * Display user profile in header (for dashboard)
 */
function displayUserProfile(user) {
  const signInBtn = document.querySelector('.sign-in-button') ||
                    document.querySelector('a[href*="sign"]') ||
                    document.querySelector('[href*="signin"]');

  if (signInBtn) {
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.style.cssText = 'display: flex; align-items: center; gap: 10px;';

    const initial = (user.displayName || user.email).charAt(0).toUpperCase();
    const avatarHtml = user.avatarUrl ?
      `<img src="${user.avatarUrl}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />` :
      `<div style="width: 32px; height: 32px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${initial}</div>`;

    userMenu.innerHTML = `
      <div class="user-profile" style="display: flex; align-items: center; gap: 10px;">
        ${avatarHtml}
        <span style="color: white; font-weight: 500;">${user.displayName || user.email}</span>
        <button onclick="logout()" style="padding: 8px 16px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px; cursor: pointer;">
          Logout
        </button>
      </div>
    `;

    signInBtn.replaceWith(userMenu);
  }
}

/**
 * Update UI based on auth status
 */
function updateAuthUI() {
  const isLoggedIn = isAuthenticated();
  const user = getCurrentUser();

  console.log('Auth status:', isLoggedIn ? 'Logged in' : 'Logged out');
  if (isLoggedIn && user) {
    console.log('User:', user);
  }

  // Show/hide elements
  document.querySelectorAll('[data-auth-show]').forEach(el => {
    el.style.display = isLoggedIn ? '' : 'none';
  });

  document.querySelectorAll('[data-auth-hide]').forEach(el => {
    el.style.display = isLoggedIn ? 'none' : '';
  });

  // Update user info
  if (isLoggedIn && user) {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = user.displayName || user.email;
    });

    document.querySelectorAll('[data-user-email]').forEach(el => {
      el.textContent = user.email;
    });

    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      el.src = user.avatarUrl || '/assets/logos/cybersmrt-logo-only.png';
    });

    // Display profile in header (for dashboard)
    displayUserProfile(user);
  }
}

/**
 * Require authentication - redirect if not logged in
 */
function requireAuth() {
  if (!isAuthenticated()) {
    console.log('Not authenticated, redirecting to login...');
    window.location.href = '/?login=required';
    return false;
  }

  const user = getCurrentUser();
  if (user) {
    const pathParts = window.location.pathname.split('/');
    const urlUserId = pathParts[pathParts.length - 1];

    // If URL doesn't have user ID, redirect to add it
    if (!urlUserId || urlUserId.length < 30) {
      const currentPage = pathParts[1] || 'dashboard';
      console.log('Adding user ID to URL...');
      window.location.href = `/${currentPage}/${user.id}`;
      return false;
    }
  }

  return true;
}

/**
 * Make authenticated request to auth subdomain
 */
async function authRequest(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${window.AUTH_BASE}${endpoint}`, {
    ...options,
    ...defaultOptions,
    headers: defaultOptions.headers
  });

  if (response.status === 401) {
    logout();
    throw new Error('Session expired');
  }

  return response;
}

/**
 * Make authenticated request to API subdomain
 */
async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const defaultOptions = {
    credentials: 'include',
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

  if (response.status === 401) {
    logout();
    throw new Error('Session expired');
  }

  return response;
}

/**
 * Get user profile from API
 */
async function getUserProfile() {
  try {
    const response = await authRequest('/me');
    const data = await response.json();

    if (data.success && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return null;
  }
}

/**
 * Auto-refresh tokens
 */
function setupTokenRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  setInterval(async () => {
    try {
      const response = await fetch('https://auth.cybersmrt.org/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        console.log('Token refreshed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }, 6 * 60 * 60 * 1000);
}

/**
 * Handle login success
 */
function handleLoginSuccess(userData) {
  console.log('Login successful, redirecting to dashboard...');
  const userId = userData.id;
  window.location.href = `/dashboard/${userId}`;
}

// Export globally (check if already exists first)
if (!window.isAuthenticated) window.isAuthenticated = isAuthenticated;
if (!window.getCurrentUser) window.getCurrentUser = getCurrentUser;
if (!window.getAccessToken) window.getAccessToken = getAccessToken;
if (!window.getRefreshToken) window.getRefreshToken = getRefreshToken;
if (!window.logout) window.logout = logout;
if (!window.updateAuthUI) window.updateAuthUI = updateAuthUI;
if (!window.authRequest) window.authRequest = authRequest;
if (!window.apiRequest) window.apiRequest = apiRequest;
if (!window.getUserProfile) window.getUserProfile = getUserProfile;
if (!window.requireAuth) window.requireAuth = requireAuth;
if (!window.handleLoginSuccess) window.handleLoginSuccess = handleLoginSuccess;
if (!window.displayUserProfile) window.displayUserProfile = displayUserProfile;
if (!window.AUTH_BASE) window.AUTH_BASE = window.AUTH_BASE;
if (!window.API_BASE) window.API_BASE = API_BASE;

// Initialize only if not already initialized
if (!window._authInitialized) {
  window._authInitialized = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateAuthUI();
      setupTokenRefresh();
    });
  } else {
    updateAuthUI();
    setupTokenRefresh();
  }

  setTimeout(updateAuthUI, 500);
}

console.log('✅ Auth helper loaded (auth.cybersmrt.org, api.cybersmrt.org)');