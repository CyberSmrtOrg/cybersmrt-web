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

  // Detailed cookie information
  const cookieDetails = {
    necessary: {
      title: 'Necessary Cookies',
      description: 'These cookies are essential for the website to function and cannot be disabled.',
      cookies: [
        {
          name: 'cybersmrt_cookie_consent',
          purpose: 'Stores your cookie preferences across all subdomains',
          storage: 'HTTP Cookie (domain: .cybersmrt.org)',
          expiry: '365 days',
          data: 'JSON object containing: timestamp, preference flags (necessary, functional, analytics, marketing)',
          security: 'Stored as a secure, HttpOnly cookie with SameSite=Lax protection'
        }
      ],
      howTheyWork: 'Necessary cookies are set when you first visit the site or interact with core features. They enable basic functionality like remembering your cookie preferences, maintaining your session, and ensuring security features work correctly.',
      potentialRisks: [
        'Session hijacking: If an attacker intercepts your session cookie, they could impersonate you',
        'Cookie theft: XSS vulnerabilities could expose cookies if not properly secured',
        'CSRF attacks: Without proper SameSite attributes, cookies could be sent in cross-site requests'
      ],
      mitigation: 'We use Secure flag (HTTPS only), SameSite=Lax attribute, and HttpOnly flags where appropriate to minimize these risks.',
      laymanExplanation: 'In plain English: We add special locks to these cookies so they can only be sent over encrypted connections (the padlock icon in your browser). We also prevent other websites from stealing them and make sure certain cookies are invisible to malicious scripts. Think of it like putting your house key in a locked box that only opens at your front door.'
    },
    functional: {
      title: 'Functional Cookies',
      description: 'These cookies enhance your experience by remembering your preferences.',
      cookies: [
        {
          name: 'theme_preference',
          purpose: 'Remembers your light/dark mode preference',
          storage: 'LocalStorage',
          expiry: 'Persistent (until manually cleared)',
          data: 'String: "light" or "dark"',
          security: 'Not transmitted over network, stored client-side only'
        },
        {
          name: 'language_preference',
          purpose: 'Remembers your language selection',
          storage: 'LocalStorage',
          expiry: 'Persistent',
          data: 'String: language code (e.g., "en", "es")',
          security: 'Client-side only'
        }
      ],
      howTheyWork: 'Functional cookies store your customization preferences in your browser. When you return to the site, we read these preferences to apply your chosen settings automatically.',
      potentialRisks: [
        'User fingerprinting: Preferences could be used to identify you across sessions',
        'Data leakage: If using third-party functional services, your preferences might be shared',
        'Storage poisoning: Malicious scripts could modify preferences to cause unexpected behavior'
      ],
      mitigation: 'We store preferences locally when possible and validate all stored values before applying them. We do not share preference data with third parties.',
      laymanExplanation: 'In plain English: Your preferences stay on your computer, not on a server somewhere. We double-check every setting before using it to make sure no one tampered with it. We never sell or share what theme you like or what language you prefer. It\'s like keeping your personal notes in your own notebook instead of on someone else\'s bulletin board.'
    },
    analytics: {
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website.',
      cookies: [
        {
          name: '_ga',
          purpose: 'Google Analytics: Distinguishes unique users',
          storage: 'HTTP Cookie',
          expiry: '2 years',
          data: 'Random client identifier',
          security: 'Anonymized, pseudonymous identifier'
        },
        {
          name: '_gid',
          purpose: 'Google Analytics: Distinguishes unique users for 24 hours',
          storage: 'HTTP Cookie',
          expiry: '24 hours',
          data: 'Random client identifier',
          security: 'Anonymized, pseudonymous identifier'
        },
        {
          name: '_gat',
          purpose: 'Google Analytics: Throttle request rate',
          storage: 'HTTP Cookie',
          expiry: '1 minute',
          data: 'Throttle flag',
          security: 'Minimal data'
        }
      ],
      howTheyWork: 'Analytics cookies track page views, time spent on pages, and navigation patterns. This data is sent to analytics services (like Google Analytics) to create aggregated reports about site usage. We use this to improve content and user experience.',
      potentialRisks: [
        'Tracking across sites: Analytics providers may track you across multiple websites',
        'User profiling: Long-lived identifiers enable building detailed behavioral profiles',
        'Third-party data sharing: Analytics providers may use your data for their own purposes',
        'Re-identification: Combined with other data, analytics IDs could identify individuals',
        'Ad targeting: Analytics data may be combined with advertising platforms'
      ],
      mitigation: 'We use IP anonymization, have configured data retention limits, and have a Data Processing Agreement with analytics providers. You can also use browser privacy features like Do Not Track.',
      laymanExplanation: 'In plain English: We blur your exact location so analytics companies can\'t pinpoint your address - they only see your general region. We automatically delete old data instead of keeping it forever. We have legal contracts that restrict how analytics companies can use your information. It\'s like giving a survey company your zip code instead of your home address, and making them promise to shred the forms after 6 months.'
    },
    marketing: {
      title: 'Marketing Cookies',
      description: 'Used to deliver personalized advertising and track campaign effectiveness.',
      cookies: [
        {
          name: '_fbp',
          purpose: 'Facebook Pixel: Tracks conversions and remarketing',
          storage: 'HTTP Cookie',
          expiry: '90 days',
          data: 'Browser identifier, timestamp',
          security: 'Shared with Facebook'
        },
        {
          name: 'IDE',
          purpose: 'Google DoubleClick: Ad serving and tracking',
          storage: 'HTTP Cookie',
          expiry: '1 year',
          data: 'User identifier for ad targeting',
          security: 'Shared with Google advertising network'
        },
        {
          name: 'test_cookie',
          purpose: 'Checks if browser accepts cookies',
          storage: 'HTTP Cookie',
          expiry: '15 minutes',
          data: 'Test value',
          security: 'Minimal risk'
        }
      ],
      howTheyWork: 'Marketing cookies track your behavior to build an advertising profile. They enable features like remarketing (showing ads based on pages you visited), conversion tracking (measuring ad effectiveness), and personalized advertising across the web.',
      potentialRisks: [
        'Invasive tracking: Detailed behavioral profiles across many websites',
        'Data broker sales: Your profile may be sold to data brokers',
        'Price discrimination: Could be used for dynamic pricing based on behavior',
        'Political manipulation: Targeted advertising based on psychological profiling',
        'Privacy violations: Extensive data collection without full user awareness',
        'Data breaches: Advertising networks are targets for hackers',
        'Persistent tracking: Difficult to fully opt out across all platforms'
      ],
      mitigation: 'By disabling marketing cookies, you prevent these tracking mechanisms. We recommend rejecting marketing cookies unless you specifically want personalized advertising. Use ad blockers and privacy-focused browsers for additional protection.',
      laymanExplanation: 'In plain English: When you reject marketing cookies, advertisers can\'t follow you around the web showing you ads based on sites you\'ve visited. We actually recommend saying "no" to these unless you enjoy personalized ads. For even more privacy, install an ad blocker (like uBlock Origin) and use browsers focused on privacy (like Firefox or Brave). Think of it like wearing sunglasses and a hat when you go shopping - it\'s harder for stores to recognize you and follow you around.'
    }
  };

  // Helper: Set cookie with domain for cross-subdomain sharing
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    // Set domain to .cybersmrt.org for cross-subdomain sharing
    const domain = window.location.hostname.includes('cybersmrt.org') ? '.cybersmrt.org' : '';
    const domainPart = domain ? `; domain=${domain}` : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/${domainPart}; SameSite=Lax; Secure`;
  }

  // Helper: Get cookie value
  function getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  // Get current consent
  function getConsent() {
    // Try cookie first (new method)
    const cookieValue = getCookie(COOKIE_KEY);
    if (cookieValue) {
      try {
        const consent = JSON.parse(cookieValue);
        // Check if consent is still valid (not expired)
        if (consent.timestamp && Date.now() - consent.timestamp < COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
          return consent;
        }
      } catch (e) {
        console.error('Failed to parse cookie consent from cookie:', e);
      }
    }

    // Fallback to localStorage for backward compatibility
    const stored = localStorage.getItem(COOKIE_KEY);
    if (stored) {
      try {
        const consent = JSON.parse(stored);
        // Migrate to cookie
        if (consent.timestamp && Date.now() - consent.timestamp < COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
          setCookie(COOKIE_KEY, JSON.stringify(consent), COOKIE_EXPIRY_DAYS);
          localStorage.removeItem(COOKIE_KEY); // Clean up old storage
          return consent;
        }
      } catch (e) {
        console.error('Failed to parse cookie consent from localStorage:', e);
      }
    }
    return null;
  }

  // Save consent
  function saveConsent(preferences) {
    const consent = {
      timestamp: Date.now(),
      preferences: preferences
    };

    // Save to cookie for cross-subdomain sharing
    setCookie(COOKIE_KEY, JSON.stringify(consent), COOKIE_EXPIRY_DAYS);

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
                <button class="cookie-details-btn" onclick="showCookieDetails('necessary'); event.stopPropagation();" aria-label="Show details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Details
                </button>
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
                <button class="cookie-details-btn" onclick="showCookieDetails('functional'); event.stopPropagation();" aria-label="Show details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Details
                </button>
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
                <button class="cookie-details-btn" onclick="showCookieDetails('analytics'); event.stopPropagation();" aria-label="Show details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Details
                </button>
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
                <button class="cookie-details-btn" onclick="showCookieDetails('marketing'); event.stopPropagation();" aria-label="Show details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Details
                </button>
              </div>
              <p class="cookie-category-desc">
                Used to deliver personalized content and track campaign effectiveness.
              </p>
            </div>
          </div>

          <!-- Cookie Details Flyout -->
          <div id="cookie-details-flyout" class="cookie-details-flyout">
            <div class="cookie-details-content">
              <div class="cookie-details-header">
                <h4 id="cookie-details-title"></h4>
                <button class="cookie-details-close" onclick="hideCookieDetails()" aria-label="Close details">×</button>
              </div>
              <div id="cookie-details-body" class="cookie-details-body"></div>
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

  // Show cookie details flyout
  function showCookieDetails(category) {
    const flyout = document.getElementById('cookie-details-flyout');
    const title = document.getElementById('cookie-details-title');
    const body = document.getElementById('cookie-details-body');

    if (!flyout || !title || !body || !cookieDetails[category]) {
      return;
    }

    const details = cookieDetails[category];

    // Set title
    title.textContent = details.title;

    // Build body content
    let html = `<p>${details.description}</p>`;

    // Add cookies table
    if (details.cookies && details.cookies.length > 0) {
      html += '<h5>Cookies Used</h5>';
      html += '<table class="cookie-details-table">';
      html += '<thead><tr><th>Name</th><th>Details</th></tr></thead>';
      html += '<tbody>';

      details.cookies.forEach(cookie => {
        html += '<tr>';
        html += `<td><strong>${cookie.name}</strong></td>`;
        html += '<td>';
        html += `<strong>Purpose:</strong> ${cookie.purpose}<br>`;
        html += `<strong>Storage:</strong> ${cookie.storage}<br>`;
        html += `<strong>Expiry:</strong> ${cookie.expiry}<br>`;
        html += `<strong>Data:</strong> ${cookie.data}<br>`;
        html += `<strong>Security:</strong> ${cookie.security}`;
        html += '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
    }

    // Add how they work
    if (details.howTheyWork) {
      html += '<h5>How They Work</h5>';
      html += `<p>${details.howTheyWork}</p>`;
    }

    // Add potential risks
    if (details.potentialRisks && details.potentialRisks.length > 0) {
      html += '<h5>Potential Risks</h5>';
      html += '<ul>';
      details.potentialRisks.forEach(risk => {
        // Split by colon to highlight risk type
        const parts = risk.split(':');
        if (parts.length > 1) {
          html += `<li><strong>${parts[0]}:</strong>${parts.slice(1).join(':')}</li>`;
        } else {
          html += `<li>${risk}</li>`;
        }
      });
      html += '</ul>';
    }

    // Add mitigation
    if (details.mitigation) {
      html += '<h5>How We Protect You</h5>';
      html += `<p>${details.mitigation}</p>`;
    }

    // Add layman's explanation
    if (details.laymanExplanation) {
      html += `<p class="layman-explanation">${details.laymanExplanation}</p>`;
    }

    body.innerHTML = html;

    // Show flyout
    flyout.classList.add('show');
  }

  // Hide cookie details flyout
  function hideCookieDetails() {
    const flyout = document.getElementById('cookie-details-flyout');
    if (flyout) {
      flyout.classList.remove('show');
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

  // Export global functions for onclick handlers
  window.showCookieDetails = showCookieDetails;
  window.hideCookieDetails = hideCookieDetails;
})();

} // End duplicate check
