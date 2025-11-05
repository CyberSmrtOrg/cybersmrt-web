// Cookie Consent Management

// Prevent duplicate execution
if (typeof window.COOKIE_CONSENT_LOADED === 'undefined') {
window.COOKIE_CONSENT_LOADED = true;

(function() {
  'use strict';

  const COOKIE_KEY = 'cybersmrt_cookie_consent';
  const COOKIE_EXPIRY_DAYS = 365;

  // Cookie categories
  const categories = {
    necessary: { name: 'Necessary', required: true, enabled: true },
    functional: { name: 'Functional', required: false, enabled: false },
    analytics: { name: 'Analytics', required: false, enabled: false },
    marketing: { name: 'Marketing', required: false, enabled: false }
  };

  // Get current consent
  function getConsent() {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) return null;

    try {
      const consent = JSON.parse(stored);
      // Check if consent is still valid (not expired)
      if (consent.timestamp && Date.now() - consent.timestamp < COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        return consent;
      }
    } catch (e) {
      console.error('Failed to parse cookie consent:', e);
    }
    return null;
  }

  // Save consent
  function saveConsent(preferences) {
    const consent = {
      timestamp: Date.now(),
      preferences: preferences
    };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));

    // Trigger custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));

    // Apply consent settings
    applyConsent(preferences);
  }

  // Apply consent settings (enable/disable tracking scripts)
  function applyConsent(preferences) {
    // Analytics
    if (preferences.analytics) {
      console.log('✅ Analytics cookies enabled');
      // Enable analytics here if you add Google Analytics, etc.
    } else {
      console.log('❌ Analytics cookies disabled');
    }

    // Marketing
    if (preferences.marketing) {
      console.log('✅ Marketing cookies enabled');
      // Enable marketing pixels here
    } else {
      console.log('❌ Marketing cookies disabled');
    }

    // Functional
    if (preferences.functional) {
      console.log('✅ Functional cookies enabled');
    } else {
      console.log('❌ Functional cookies disabled');
    }
  }

  // Check if user has consented
  function hasConsented() {
    return getConsent() !== null;
  }

  // Create popup HTML
  function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'cookie-consent-popup';
    popup.className = 'cookie-popup';
    popup.innerHTML = `
      <div class="cookie-popup-content">
        <div class="cookie-popup-header">
          <h3>🍪 Cookie Settings</h3>
          <button class="cookie-close-btn" aria-label="Close">×</button>
        </div>

        <div class="cookie-popup-body">
          <p class="cookie-description">
            We use cookies to enhance your experience, analyze site traffic, and provide personalized content.
            You can customize your preferences below.
          </p>

          <div class="cookie-categories">
            <div class="cookie-category">
              <div class="cookie-category-header">
                <label class="cookie-label">
                  <input type="checkbox" checked disabled>
                  <span class="cookie-name">Necessary Cookies</span>
                  <span class="cookie-required">Required</span>
                </label>
              </div>
              <p class="cookie-category-desc">
                Essential for the website to function properly. Cannot be disabled.
              </p>
            </div>

            <div class="cookie-category">
              <div class="cookie-category-header">
                <label class="cookie-label">
                  <input type="checkbox" id="cookie-functional">
                  <span class="cookie-name">Functional Cookies</span>
                </label>
              </div>
              <p class="cookie-category-desc">
                Remember your preferences and settings for a better experience.
              </p>
            </div>

            <div class="cookie-category">
              <div class="cookie-category-header">
                <label class="cookie-label">
                  <input type="checkbox" id="cookie-analytics">
                  <span class="cookie-name">Analytics Cookies</span>
                </label>
              </div>
              <p class="cookie-category-desc">
                Help us understand how visitors use our website to improve it.
              </p>
            </div>

            <div class="cookie-category">
              <div class="cookie-category-header">
                <label class="cookie-label">
                  <input type="checkbox" id="cookie-marketing">
                  <span class="cookie-name">Marketing Cookies</span>
                </label>
              </div>
              <p class="cookie-category-desc">
                Used to deliver personalized content and track campaign effectiveness.
              </p>
            </div>
          </div>
        </div>

        <div class="cookie-popup-footer">
          <button class="cookie-btn cookie-btn-reject">Reject All</button>
          <button class="cookie-btn cookie-btn-save">Save Preferences</button>
          <button class="cookie-btn cookie-btn-accept">Accept All</button>
        </div>

        <div class="cookie-popup-links">
          <a href="/pages/legal/privacy-policy.html" target="_blank">Privacy Policy</a>
          <span>•</span>
          <a href="/pages/legal/terms-of-service.html" target="_blank">Terms of Service</a>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    return popup;
  }

  // Create persistent settings tab
  function createSettingsTab() {
    const tab = document.createElement('button');
    tab.id = 'cookie-settings-tab';
    tab.className = 'cookie-settings-tab';
    tab.setAttribute('aria-label', 'Cookie Settings');
    tab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <span>Cookies</span>
    `;

    document.body.appendChild(tab);
    return tab;
  }

  // Show popup
  function showPopup() {
    let popup = document.getElementById('cookie-consent-popup');
    if (!popup) {
      popup = createPopup();
      attachPopupEventListeners(popup);
    }

    // Load current preferences
    const consent = getConsent();
    if (consent) {
      document.getElementById('cookie-functional').checked = consent.preferences.functional || false;
      document.getElementById('cookie-analytics').checked = consent.preferences.analytics || false;
      document.getElementById('cookie-marketing').checked = consent.preferences.marketing || false;
    }

    popup.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  // Hide popup
  function hidePopup() {
    const popup = document.getElementById('cookie-consent-popup');
    if (popup) {
      popup.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  // Attach event listeners to popup
  function attachPopupEventListeners(popup) {
    // Close button
    popup.querySelector('.cookie-close-btn').addEventListener('click', hidePopup);

    // Reject all
    popup.querySelector('.cookie-btn-reject').addEventListener('click', () => {
      saveConsent({
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false
      });
      hidePopup();
    });

    // Save preferences
    popup.querySelector('.cookie-btn-save').addEventListener('click', () => {
      saveConsent({
        necessary: true,
        functional: document.getElementById('cookie-functional').checked,
        analytics: document.getElementById('cookie-analytics').checked,
        marketing: document.getElementById('cookie-marketing').checked
      });
      hidePopup();
    });

    // Accept all
    popup.querySelector('.cookie-btn-accept').addEventListener('click', () => {
      saveConsent({
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true
      });
      hidePopup();
    });

    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        hidePopup();
      }
    });
  }

  // Initialize
  function init() {
    // Create settings tab
    const settingsTab = createSettingsTab();
    settingsTab.addEventListener('click', showPopup);

    // Show popup if no consent yet
    if (!hasConsented()) {
      // Delay slightly to let page load
      setTimeout(showPopup, 1000);
    } else {
      // Apply saved consent
      const consent = getConsent();
      if (consent) {
        applyConsent(consent.preferences);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.CookieConsent = {
    show: showPopup,
    hide: hidePopup,
    getConsent: getConsent,
    hasConsented: hasConsented
  };
})();

} // End duplicate check
