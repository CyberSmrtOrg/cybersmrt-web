/* /assets/js/header-loader.js */

// ============================================
// Auth Modal Functions - Define First
// ============================================
(function setupAuthFunctions() {
  // Toggle mobile menu in header
  window.toggleHeaderMenu = function(btn) {
    const navLinks = document.querySelector('.site-header .nav-links');
    if (!navLinks) return;

    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    navLinks.classList.toggle('show');
    btn.setAttribute('aria-expanded', !isExpanded);
  };

  // Open login modal (safe - waits for modal to exist)
  window.openLoginModalSafe = function() {
    const overlay = document.getElementById('auth-modal-overlay');

    if (overlay) {
      // Modal exists, open it
      overlay.classList.add('active');
      document.body.classList.add('modal-open');
    } else {
      // Modal doesn't exist yet, wait and retry
      setTimeout(window.openLoginModalSafe, 100);
    }
  };

  // Open login modal (direct - use after modal is loaded)
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

  console.log('✅ Auth modal functions loaded');
})();

// ============================================
// Header Loader - Load and Mount Header
// ============================================
(async function mountSharedHeader(){
  try {
    // If a header is already present, don't duplicate
    if (document.querySelector('.site-header')) return;

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
    }

    // Active link highlight
    const here = location.pathname.replace(/\/+$/, '') || '/index.html';
    headerEl.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const path = href.replace(/\/+$/, '');
      // treat / and /index.html as same
      const isHome = (here === '/' || here === '/index.html') && (path === '/index.html' || path === '/');
      if (isHome || (path !== '/' && here === path)) {
        a.classList.add('is-active');
      }
    });

  } catch (err) {
    // Fail silently; page still works without header
    console.warn('[header-loader] ', err);
  }
})();

// ============================================
// Auth Helper - Auto-load after header
// ============================================
(function loadAuthHelper() {
  // Create and load auth.js script
  const script = document.createElement('script');
  script.src = '/assets/js/auth.js';
  script.async = true;

  script.onerror = function() {
    console.warn('[header-loader] Failed to load auth.js');
  };

  document.head.appendChild(script);
  console.log('✅ Auth helper queued for loading');
})();