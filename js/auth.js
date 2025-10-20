/**
 * CyberSmrt Authentication Helper
 * Handles JWT tokens, API calls, and user session management
 */

const AUTH_API_BASE = '/auth';

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

    const response = await fetch(`${AUTH_API_BASE}${endpoint}`, {
        ...options,
        ...defaultOptions,
        headers: defaultOptions.headers
    });

    // Handle token expiration
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Retry request with new token
            return apiRequest(endpoint, options);
        } else {
            // Refresh failed, redirect to login
            logout();
            throw new Error('Session expired');
        }
    }

    return response;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        return false;
    }

    try {
        const response = await fetch(`${AUTH_API_BASE}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();

        if (data.success && data.accessToken) {
            localStorage.setItem('access_token', data.accessToken);
            return true;
        }

        return false;
    } catch (err) {
        console.error('Token refresh failed:', err);
        return false;
    }
}

/**
 * Get current user profile from API
 */
async function getUserProfile() {
    try {
        const response = await apiRequest('/me');
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

/**
 * Logout user
 */
function logout() {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('session_id');

    // Redirect to home
    window.location.href = '/';
}

/**
 * Protect page - redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        const currentPath = window.location.pathname;
        window.location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
    }
}

/**
 * Update UI elements based on auth status
 * Call this on page load to show/hide login/logout buttons
 */
function updateAuthUI() {
    const isLoggedIn = isAuthenticated();
    const user = getCurrentUser();

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
            el.src = user.avatarUrl || '/images/default-avatar.png';
        });
    }
}

/**
 * Auto-refresh tokens before they expire
 * Call this once on app initialization
 */
function startTokenRefreshTimer() {
    const token = getAccessToken();
    if (!token) return;

    const payload = parseJWT(token);
    if (!payload) return;

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;

    // Refresh 5 minutes before expiry
    const refreshIn = Math.max(0, (expiresIn - 300) * 1000);

    setTimeout(async () => {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Start new timer with new token
            startTokenRefreshTimer();
        }
    }, refreshIn);
}

// Initialize on load
if (typeof window !== 'undefined') {
    // Start auto-refresh timer if authenticated
    if (isAuthenticated()) {
        startTokenRefreshTimer();
    }

    // Update UI on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAuthUI);
    } else {
        updateAuthUI();
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getCurrentUser,
        getAccessToken,
        getRefreshToken,
        apiRequest,
        refreshAccessToken,
        getUserProfile,
        logout,
        requireAuth,
        updateAuthUI,
        startTokenRefreshTimer
    };
}