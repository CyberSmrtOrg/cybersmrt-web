/* /assets/js/header-loader.js */

// Prevent duplicate execution
if (typeof window.HEADER_LOADER_EXECUTED === 'undefined') {
window.HEADER_LOADER_EXECUTED = true;

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
    document.querySelectorAll('.user-menu-container.open, .home-dropdown-container.open, .tools-dropdown-container.open, .programs-dropdown-container.open, .blog-dropdown-container.open, .about-dropdown-container.open').forEach(el => {
      if (el !== container) {
        el.classList.remove('open');
        const btn = el.querySelector('.user-menu, .home-dropdown-trigger, .tools-dropdown-trigger, .programs-dropdown-trigger, .blog-dropdown-trigger, .about-dropdown-trigger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Toggle this menu
    container.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', !isOpen);
  };

  // Toggle mega menu
  window.toggleMegaMenu = function(event) {
    event.stopPropagation();
    const header = document.querySelector('.site-header');
    if (!header) return;

    const isOpen = header.classList.contains('mega-menu-open');

    // Close user menu if open
    const userMenuContainer = document.querySelector('.user-menu-container.open');
    if (userMenuContainer) {
      userMenuContainer.classList.remove('open');
      const userMenuBtn = userMenuContainer.querySelector('.user-menu');
      if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
    }

    // Toggle mega menu
    header.classList.toggle('mega-menu-open');

    // Update all mega menu trigger aria-expanded states
    const allTriggers = header.querySelectorAll('.mega-menu-trigger');
    allTriggers.forEach(trigger => {
      trigger.setAttribute('aria-expanded', !isOpen);
    });
  };

  // Close menus when clicking outside
  document.addEventListener('click', function(event) {
    const header = document.querySelector('.site-header');

    // Close mega menu if clicking outside
    if (header && header.classList.contains('mega-menu-open') &&
        !event.target.closest('.mega-menu-trigger') &&
        !event.target.closest('.mega-menu-panel')) {
      header.classList.remove('mega-menu-open');
      const allTriggers = header.querySelectorAll('.mega-menu-trigger');
      allTriggers.forEach(trigger => {
        trigger.setAttribute('aria-expanded', 'false');
      });
    }

    // Close user menu if clicking outside
    if (!event.target.closest('.user-menu-container')) {
      document.querySelectorAll('.user-menu-container.open').forEach(el => {
        el.classList.remove('open');
        const btn = el.querySelector('.user-menu');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Navigate to user-specific pages
  window.goToUserPage = function(page) {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (user && user.id) {
      window.location.href = `/${page}/${user.id}`;
    } else {
      window.location.href = `/${page}.html`;
    }
  };

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

  console.log('✅ Global functions loaded (including toggleUserMenu, toggleMegaMenu)');
})();

// ============================================
// Header Loader - Load and Mount Header
// ============================================
(async function mountSharedHeader(){
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  try {
    // If a header is already present, don't duplicate
    if (document.querySelector('.site-header')) {
      console.log('⚠️ Header already exists, skipping load');
      return;
    }

    // Fetch the partial and inject it at the top of <body>
    console.log('🔄 Fetching header from /partials/header.html...');
    const res = await fetch('/partials/header.html');
    console.log('📥 Fetch response:', res.status, res.statusText, res.url);
    if (!res.ok) {
      console.error('❌ Failed to load header:', res.status, res.statusText);
      throw new Error(`Failed to load header.html: ${res.status}`);
    }
    console.log('✅ Header HTML fetched successfully');
    const html = await res.text();
    console.log('📝 Header HTML length:', html.length, 'characters');
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();

    // Find the actual header element (not link/script tags)
    const headerEl = tmp.querySelector('header.site-header');
    const mobileMenuEl = tmp.querySelector('.mobile-menu-panel');

    if (!headerEl) {
      console.error('❌ Could not find header.site-header element in HTML');
      console.error('📄 HTML content:', html.substring(0, 500));
      throw new Error('Header element not found in partial');
    }

    console.log('✅ Found header element:', headerEl.tagName, headerEl.className);
    if (mobileMenuEl) {
      console.log('✅ Found mobile menu panel');
    }

    // Also grab any link/style/script tags that should go in the head
    const headElements = tmp.querySelectorAll('link, style');
    headElements.forEach(el => {
      document.head.appendChild(el.cloneNode(true));
      console.log('📌 Added to head:', el.tagName, el.getAttribute('href') || '(inline)');
    });

    // Execute inline scripts FIRST (before mounting) so functions are available for onclick handlers
    const scripts = tmp.querySelectorAll('script');
    console.log(`📜 Found ${scripts.length} scripts in header`);

    scripts.forEach((oldScript, index) => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
        if (oldScript.defer) newScript.defer = true;
        if (oldScript.async) newScript.async = true;
        console.log(`✅ Script ${index + 1}: External - ${oldScript.src}`);
      } else {
        newScript.textContent = oldScript.textContent;
        const preview = oldScript.textContent.trim().substring(0, 60);
        console.log(`✅ Script ${index + 1}: Inline - ${preview}...`);
      }
      // Copy other attributes
      Array.from(oldScript.attributes).forEach(attr => {
        if (!['src', 'defer', 'async'].includes(attr.name)) {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      document.body.appendChild(newScript);
    });

    console.log('✅ All header scripts executed');

    // Check if there's a header-mount element, otherwise insert at top of body
    const mountPoint = document.getElementById('header-mount');
    if (mountPoint) {
      console.log('📌 Mounting header in #header-mount');
      mountPoint.appendChild(headerEl);
      if (mobileMenuEl) {
        mountPoint.appendChild(mobileMenuEl);
        console.log('📌 Mounted mobile menu panel after header');
      }
    } else {
      console.log('📌 Mounting header at top of body');
      document.body.insertBefore(headerEl, document.body.firstChild);
      if (mobileMenuEl) {
        document.body.insertBefore(mobileMenuEl, headerEl.nextSibling);
        console.log('📌 Mounted mobile menu panel after header');
      }
    }

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

    // Verify header visibility
    setTimeout(() => {
      const header = document.querySelector('.site-header');
      if (header) {
        const styles = window.getComputedStyle(header);
        console.log('🔍 Header visibility check:');
        console.log('  - Display:', styles.display);
        console.log('  - Visibility:', styles.visibility);
        console.log('  - Opacity:', styles.opacity);
        console.log('  - Position:', styles.position);

        if (styles.display === 'none' || styles.visibility === 'hidden') {
          console.error('⚠️ WARNING: Header is in DOM but not visible!');
          console.error('  - Forcing visibility...');
          header.style.display = 'block';
          header.style.visibility = 'visible';
          header.style.opacity = '1';
        } else {
          console.log('✅ Header is visible');
        }
      } else {
        console.error('❌ ERROR: Header not found in DOM after mounting!');
      }
    }, 100);

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

// ============================================
// Auth Helper - Load auth.js
// ============================================
(function loadAuthHelper() {
  const script = document.createElement('script');
  // Use timestamp to force fresh load every time
  script.src = `/assets/js/auth.js?t=${Date.now()}`;
  script.async = true;

  script.onload = function() {
    console.log('✅ Auth helper loaded successfully');
  };

  script.onerror = function() {
    console.warn('[header-loader] Failed to load auth.js');
  };

  document.head.appendChild(script);
})();

} // End duplicate check