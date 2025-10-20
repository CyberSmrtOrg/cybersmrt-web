/* /assets/js/header-loader.js */

// ============================================
// Auth & UI Functions - Define First
// ============================================
(function setupGlobalFunctions() {
  'use strict';

  // Toggle mobile menu in header
  window.toggleHeaderMenu = function(btn) {
    const navLinks = document.querySelector('.site-header .nav-links');
    if (!navLinks) return;

    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    navLinks.classList.toggle('show');
    btn.setAttribute('aria-expanded', !isExpanded);
  };

  // Toggle user dropdown menu
  window.toggleUserMenu = function(event) {
    event.stopPropagation();
    const container = event.currentTarget.closest('.user-menu-container');
    if (!container) return;

    const isOpen = container.classList.contains('open');

    // Close all other open menus first
    document.querySelectorAll('.user-menu-container.open').forEach(el => {
      if (el !== container) {
        el.classList.remove('open');
        const btn = el.querySelector('.user-menu');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Toggle this menu
    container.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', !isOpen);
  };

  // Close user menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.user-menu-container')) {
      document.querySelectorAll('.user-menu-container.open').forEach(el => {
        el.classList.remove('open');
        const btn = el.querySelector('.user-menu');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Open login modal (safe - waits for modal to exist)
  window.openLoginModalSafe = function() {
    const overlay = document.getElementById('auth-modal-overlay');

    if (overlay) {
      overlay.classList.add('active');
      document.body.classList.add('modal-open');
    } else {
      setTimeout(window.openLoginModalSafe, 100);
    }
  };

  // Open login modal (direct)
  window.openLoginModal = function() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.classList.add('modal-open');
    }
  };

  // Close login modal
  window.closeLoginModal = function() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  };

  // Close modal when clicking overlay
  window.closeLoginModalOnOverlay = function(event) {
    if (event.target.id === 'auth-modal-overlay') {
      window.closeLoginModal();
    }
  };

  // Close modal on Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const overlay = document.getElementById('auth-modal-overlay');
      if (overlay && overlay.classList.contains('active')) {
        window.closeLoginModal();
      }
    }
  });

  console.log('✅ Global functions loaded (including toggleUserMenu)');
})();

// ============================================
// Header Loader - Load and Mount Header
// ============================================
(async function mountSharedHeader(){
  try {
    // If a header is already present, don't duplicate
    if (document.querySelector('.site-header')) {
      console.log('⚠️ Header already exists, skipping load');
      return;
    }

    // Fetch the partial and inject it at the top of <body>
    const res = await fetch('/partials/header.html', { cache: 'reload' });
    if (!res.ok) throw new Error('Failed to load header.html');
    const html = await res.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    const headerEl = tmp.firstElementChild;
    document.body.insertBefore(headerEl, document.body.firstChild);

    // Wire up mobile toggle
    const toggle = headerEl.querySelector('.nav-toggle');
    const links  = headerEl.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('show');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      // Close on link click (mobile)
      links.addEventListener('click', (e) => {
        if (e.target.matches('a') && links.classList.contains('show')) {
          links.classList.remove('show');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Active link highlight
    const here = location.pathname.replace(/\/+$/, '') || '/index.html';
    headerEl.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const path = href.replace(/\/+$/, '');
      const isHome = (here === '/' || here === '/index.html') && (path === '/index.html' || path === '/');
      if (isHome || (path !== '/' && here === path)) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });

    console.log('✅ Header loaded and mounted');

    // Update auth UI after header is ready
    waitForAuthAndUpdate();

  } catch (err) {
    console.warn('[header-loader] Failed to load header:', err);
  }
})();

// ============================================
// Auth UI Update - Wait for auth.js
// ============================================
function waitForAuthAndUpdate() {
  if (window.updateAuthUI) {
    window.updateAuthUI();
    console.log('✅ Auth UI updated immediately');
  } else {
    // Wait for auth.js to load
    let attempts = 0;
    const maxAttempts = 60; // 3 seconds max

    const checkAuth = setInterval(() => {
      attempts++;
      if (window.updateAuthUI) {
        clearInterval(checkAuth);
        window.updateAuthUI();
        console.log('✅ Auth UI updated after waiting');
      } else if (attempts >= maxAttempts) {
        clearInterval(checkAuth);
        console.warn('⚠️ Auth helper not loaded after 3 seconds');
      }
    }, 50);
  }
}

// ===========================================
// Auth Helper - Load auth.js
// ===========================================
(function loadAuthHelper() {
  const script = document.createElement('script');
  script.src = '/assets/js/auth.js';
  script.async = true;

  script.onload = function() {
    console.log('✅ Auth helper loaded successfully');
  };

  script.onerror = function() {
    console.warn('[header-loader] Failed to load auth.js');
  };

  document.head.appendChild(script);
})();