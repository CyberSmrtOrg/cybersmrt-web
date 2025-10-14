/**
 * Page JS Scaffold
 * File: /assets/js/this-page.js
 * Safe module that won’t error even if the page is bare.
 */

(function () {
  // Guard: run after DOM is ready
  const onReady = (fn) => (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(() => {
    // Hook an element if present (optional)
    const root = document.querySelector('[data-page-root]');
    if (!root) return; // nothing to do yet

    // Example: announce readiness (replace with real init later)
    root.dataset.initialized = 'true';

    // Example: IntersectionObserver slot
    const ioTargets = document.querySelectorAll('[data-io]');
    if (ioTargets.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            // io.unobserve(e.target); // if you only need it once
          }
        });
      }, { rootMargin: '0px 0px -20% 0px', threshold: 0.15 });
      ioTargets.forEach(el => io.observe(el));
    }

    // Example: simple event delegation slot
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'demo') {
        // replace with real behavior
        console.info('demo action clicked');
      }
    });

    // Optional: expose a page API if needed
    window.Page = Object.assign(window.Page || {}, {
      ready() { /* override if needed */ },
      destroy() { /* clean up observers/listeners here */ }
    });

    // Call the hook so your scaffold page doesn’t complain
    try { window.Page.ready(); } catch {}
  });
})();
