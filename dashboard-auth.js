/**
 * CyberSmrt Dashboard Authentication
 * Add this script to your dashboard.html
 */

// Check if user is authenticated
function checkAuth() {
  const accessToken = localStorage.getItem('accessToken');
  const user = localStorage.getItem('user');

  if (!accessToken || !user) {
    window.location.href = '/?redirect=dashboard';
    return null;
  }

  try {
    return JSON.parse(user);
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.clear();
    window.location.href = '/';
    return null;
  }
}

// Display user profile in header
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

// Logout function
function logout() {
  const accessToken = localStorage.getItem('accessToken');

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionId');

  if (accessToken) {
    fetch('https://auth.cybersmrt.org/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    }).catch(err => console.error('Logout error:', err));
  }

  window.location.href = '/';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  const user = checkAuth();
  if (user) {
    console.log('User authenticated:', user.email);
    displayUserProfile(user);
  }
});

// Auto-refresh tokens every 6 hours
function setupTokenRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return;

  setInterval(async () => {
    try {
      const response = await fetch('https://auth.cybersmrt.org/auth/refresh', {
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

setupTokenRefresh();