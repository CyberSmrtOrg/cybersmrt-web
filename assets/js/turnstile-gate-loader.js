// /assets/js/turnstile-gate-loader.js
(function() {
  'use strict';

  async function loadTurnstileGate() {
    try {
      // Check if already verified
      const stored = localStorage.getItem('cybersmrt_verified');
      if (stored) {
        const { timestamp } = JSON.parse(stored);
        const age = Date.now() - timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          // Still valid, don't show gate
          return;
        }
      }

      // Load gate HTML
      const response = await fetch('/partials/turnstile-gate.html');
      if (!response.ok) {
        console.warn('Turnstile gate not found');
        return;
      }

      const html = await response.text();

      // Insert at beginning of body
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      document.body.insertBefore(tempDiv.firstElementChild, document.body.firstChild);

      // Execute scripts in loaded HTML
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
      });

    } catch (err) {
      console.warn('Could not load turnstile gate:', err);
    }
  }

  // Load immediately
  loadTurnstileGate();
})();