/* Consolidated CyberSmrt auth helper (single implementation) */

/*
  - parseJWT
  - isAuthenticated
  - getCurrentUser, getAccessToken, getRefreshToken
  - logout
  - displayUserProfile
  - updateAuthUI
  /* Consolidated CyberSmrt auth helper (single implementation) */

  // Prevent duplicate execution
  if (typeof window.AUTH_LOADED === 'undefined') {
  window.AUTH_LOADED = true;

  (function () {
    'use strict';

    function parseJWT(token) {
      try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) base64 += '='.repeat(4 - pad);
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
      } catch (err) {
        console.error('Failed to parse JWT:', err);
        return null;
      }
    }

    // Helper to get cookie value
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }

    // Get access token from HttpOnly cookies (note: will return null because cookies are HttpOnly)
    // This function exists for compatibility but the actual tokens are sent automatically by the browser
    function getAccessToken() {
      // HttpOnly cookies cannot be read by JavaScript
      // They are automatically sent with requests using credentials: 'include'
      return getCookie('accessToken'); // Will return null, but that's expected
    }

    // Get refresh token from HttpOnly cookies (note: will return null because cookies are HttpOnly)
    function getRefreshToken() {
      // HttpOnly cookies cannot be read by JavaScript
      return getCookie('refreshToken'); // Will return null, but that's expected
    }

    function getCurrentUser() {
      // First try to get user info from cookie (cross-subdomain)
      const userInfoCookie = getCookie('user_info');
      if (userInfoCookie) {
        try {
          return JSON.parse(decodeURIComponent(userInfoCookie));
        } catch (e) {
          console.error('Failed to parse user_info cookie:', e);
        }
      }

      // Fallback: try localStorage (same-subdomain only)
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch (e) {
        return null;
      }
    }

    function isAuthenticated() {
      // Check if user_info cookie exists (cross-subdomain cookie)
      // This is more reliable than localStorage for cross-subdomain auth
      const userInfoCookie = getCookie('user_info');
      if (userInfoCookie) {
        return true;
      }

      // Fallback: check if user data exists in localStorage (same-subdomain only)
      const user = getCurrentUser();
      return user !== null && user.id !== undefined;
    }

    function logout() {
      const token = getAccessToken();
      // Clear ALL auth-related localStorage items
      const authKeys = ['accessToken', 'refreshToken', 'user', 'sessionId', 'session_activity'];
      authKeys.forEach(key => localStorage.removeItem(key));
      // Clear cookies (cross-subdomain)
      const cookiesToClear = ['accessToken', 'refreshToken', 'session', 'user_info', 'sessionId'];
      cookiesToClear.forEach(cookie => {
        document.cookie = `${cookie}=; Domain=.cybersmrt.org; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      });
      if (token) {
        fetch((window.AUTH_BASE || 'https://auth.cybersmrt.org') + '/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include'
        }).catch(()=>{});
      }
      // Force reload to update auth UI
      if (window.location.pathname === '/') {
        window.location.reload();
      } else {
        window.location.href = '/';
      }
    }

    function displayUserProfile(user) {
      const signInBtn = document.querySelector('.sign-in-button') || document.querySelector('a[href*="sign"]') || document.querySelector('[href*="signin"]');
      if (!signInBtn) return;
      const userMenu = document.createElement('div'); userMenu.className = 'user-menu'; userMenu.style.cssText = 'display:flex;align-items:center;gap:10px;';
      const profileWrap = document.createElement('div'); profileWrap.className = 'user-profile'; profileWrap.style.cssText = 'display:flex;align-items:center;gap:10px;';
      const avatar = document.createElement('div'); avatar.style.cssText = 'width:32px;height:32px;border-radius:50%;overflow:hidden;';
      if (user && user.avatarUrl) { const img = document.createElement('img'); img.src = user.avatarUrl; img.alt = 'Profile'; img.style.cssText = 'width:32px;height:32px;object-fit:cover;display:block;'; avatar.appendChild(img); }
      else { const initial = (user && (user.displayName || user.email) || '?').charAt(0).toUpperCase(); const p = document.createElement('div'); p.style.cssText = 'width:32px;height:32px;border-radius:50%;background:#667eea;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;'; p.textContent = initial; avatar.appendChild(p); }
      const name = document.createElement('span'); name.style.cssText='color:white;font-weight:500;'; name.textContent = (user && (user.displayName || user.email)) || '';
      const btn = document.createElement('button'); btn.type='button'; btn.textContent='Logout'; btn.style.cssText='padding:8px 16px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:5px;cursor:pointer;'; btn.addEventListener('click', logout);
      profileWrap.appendChild(avatar); profileWrap.appendChild(name); profileWrap.appendChild(btn); userMenu.appendChild(profileWrap);
      try { signInBtn.replaceWith(userMenu); } catch(e) { signInBtn.parentNode && signInBtn.parentNode.insertBefore(userMenu, signInBtn.nextSibling); signInBtn.style.display='none'; }
    }

    function updateAuthUI() {
      const logged = isAuthenticated(); const user = getCurrentUser();
      document.querySelectorAll('[data-auth-show]').forEach(el=>el.style.display = logged ? '' : 'none');
      document.querySelectorAll('[data-auth-hide]').forEach(el=>el.style.display = logged ? 'none' : '');
      if (logged && user) {
        document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent = user.displayName || user.email || '');
        document.querySelectorAll('[data-user-email]').forEach(el=>el.textContent = user.email || '');
        document.querySelectorAll('[data-user-avatar]').forEach(el=>{ if (el.tagName==='IMG') el.src = user.avatarUrl || '/assets/logos/cybersmrt-logo-only.png'; });
        // displayUserProfile(user); // Disabled - header now handles user menu with data-auth-show
      }
    }

    function requireAuth() { if (!isAuthenticated()) { window.location.href = '/?login=required'; return false; } return true; }

    async function authRequest(endpoint, options={}) { const token = getAccessToken(); if (!token) throw new Error('Not authenticated'); const authBase = window.AUTH_BASE || 'https://auth.cybersmrt.org'; const merged = Object.assign({}, { credentials: 'include' }, options); merged.headers = Object.assign({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, options.headers||{}); const res = await fetch(authBase + endpoint, merged); if (res.status===401) { logout(); throw new Error('Session expired'); } return res; }

    async function apiRequest(endpoint, options={}) { const token = getAccessToken(); if (!token) throw new Error('Not authenticated'); const apiBase = window.API_BASE || 'https://api.cybersmrt.org'; const merged = Object.assign({}, { credentials: 'include' }, options); merged.headers = Object.assign({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, options.headers||{}); const res = await fetch(apiBase + endpoint, merged); if (res.status===401) { logout(); throw new Error('Session expired'); } return res; }

    async function getUserProfile() { try { const res = await authRequest('/me'); const data = await res.json(); if (data && data.success && data.user) { localStorage.setItem('user', JSON.stringify(data.user)); return data.user; } return null; } catch(e) { console.error('Failed to fetch user profile:', e); return null; } }

    function setupTokenRefresh() { if (window._authRefreshTimer) { clearTimeout(window._authRefreshTimer); window._authRefreshTimer = null; } const authBase = window.AUTH_BASE || 'https://auth.cybersmrt.org'; const schedule = (delayMs)=>{ if (window._authRefreshTimer) clearTimeout(window._authRefreshTimer); window._authRefreshTimer = setTimeout(async ()=>{ const currentRefresh = getRefreshToken(); if (!currentRefresh) { window._authRefreshTimer=null; return; } try { const res = await fetch(authBase + '/refresh', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ refreshToken: currentRefresh }) }); if (res.ok) { const data = await res.json(); if (data.accessToken) localStorage.setItem('accessToken', data.accessToken); if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken); console.log('Token refreshed'); } else if (res.status===401 || res.status===400) { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); window._authRefreshTimer=null; console.warn('Refresh token invalid, cleared tokens'); return; } } catch(e){ console.error('Token refresh failed:', e); } scheduleNext(); }, delayMs); };
      const scheduleNext = ()=>{ const token = getAccessToken(); const payload = token?parseJWT(token):null; if (payload && typeof payload.exp==='number'){ const now=Math.floor(Date.now()/1000); const sec=payload.exp-now; const refreshSec=Math.max(60, sec - 5*60); schedule(refreshSec*1000);} else schedule(6*60*60*1000); };
      scheduleNext(); }

    function handleLoginSuccess(userData){ window.location.href = `/profile`; }

    // Exports
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

    if (!window._authInitialized) { window._authInitialized = true; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{ updateAuthUI(); setupTokenRefresh(); }); else { updateAuthUI(); setupTokenRefresh(); } setTimeout(updateAuthUI, 500); }

    // Backwards alias
    if (!window.apiCall) window.apiCall = window.apiRequest;

    console.log('✅ Auth helper loaded');

  })();

  } // End duplicate check