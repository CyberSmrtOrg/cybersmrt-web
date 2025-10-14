// footer-init.js
(function() {
  'use strict';

  function initFooter() {
    // Set year
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
      console.log('✅ Footer year set to:', new Date().getFullYear());
    }

    // Back to top functionality
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function quickToTop(ms = 250) {
      if (prefersReduced) {
        window.scrollTo(0, 0);
        return;
      }

      const startY = window.scrollY || window.pageYOffset;
      if (startY <= 0) return;

      const startT = performance.now();
      const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      function step(now) {
        const t = Math.min(1, (now - startT) / ms);
        const y = Math.round(startY * (1 - ease(t)));
        window.scrollTo(0, y);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // Attach to all "back to top" links
    document.querySelectorAll('a[href="#top"]').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        quickToTop(220);
      });
    });
  }

  // Initialize when footer is loaded
  // Use MutationObserver to detect when footer appears
  const observer = new MutationObserver((mutations) => {
    const footerExists = document.querySelector('.site-footer');
    if (footerExists) {
      initFooter();
      observer.disconnect();
    }
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Also try immediately in case footer is already there
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
  } else {
    initFooter();
  }
})();