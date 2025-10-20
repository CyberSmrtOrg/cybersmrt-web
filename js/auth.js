/**
 * CyberSmrt Authentication Helper
 * Handles JWT tokens, API calls, and UI updates
 */

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  if (!token) return false;

  // Check if token is expired
  try {
    const payload = parseJWT(token);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (err) {
    return false;
  }
}

/**
 * Parse JWT token to get payload
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
 * Get current user data from localStorage
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
  return localStorage.getItem('access_token');
}

/**
 * Get refresh token
 */
function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

/**
 * Logout user
 */
function logout() {
  // Clear all auth data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('session_id');

  // Reload page to update UI
  window.location.href = '/';
}

/**
 * Update UI elements based on auth status
 * Call this on page load to show/hide login/logout buttons
 */
function updateAuthUI() {
  const isLoggedIn = isAuthenticated();
  const user = getCurrentUser();

  console.log('Auth status:', isLoggedIn ? 'Logged in' : 'Logged out');
  if (isLoggedIn && user) {
    console.log('User:', user);
  }

  // Hide/show elements based on auth status
  document.querySelectorAll('[data-auth-show]').forEach(el => {
    el.style.display = isLoggedIn ? '' : 'none';
  });

  document.querySelectorAll('[data-auth-hide]').forEach(el => {
    el.style.display = isLoggedIn ? 'none' : '';
  });

  // Update user info elements
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
  }
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`https://cybersmrt.org${endpoint}`, {
    ...options,
    ...defaultOptions,
    headers: defaultOptions.headers
  });

  // Handle token expiration
  if (response.status === 401) {
    // Token expired, logout
    logout();
    throw new Error('Session expired');
  }

  return response;
}

/**
 * Get current user profile from API
 */
async function getUserProfile() {
  try {
    const response = await apiRequest('/auth/me');
    const data = await response.json();

    if (data.success && data.user) {
      // Update localStorage with fresh data
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return null;
  }
}

// Make functions globally available
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.getAccessToken = getAccessToken;
window.getRefreshToken = getRefreshToken;
window.logout = logout;
window.updateAuthUI = updateAuthUI;
window.apiRequest = apiRequest;
window.getUserProfile = getUserProfile;

// Auto-update UI when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateAuthUI);
} else {
  // DOM already loaded
  updateAuthUI();
}

// Also update UI after header/footer load (with slight delay)
setTimeout(updateAuthUI, 500);

console.log('✅ Auth helper loaded');