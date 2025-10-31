/**
 * Google Analytics Configuration
 *
 * This script loads Google Analytics (GA4) using the GOOGLE_ANALYTICS_ID
 * from environment variables. It respects user privacy and cookie consent.
 */

(function() {
  'use strict';

  // Get Google Analytics ID from environment variable
  // This will be replaced at build time or server-side
  const GA_MEASUREMENT_ID = typeof GOOGLE_ANALYTICS_ID !== 'undefined'
    ? GOOGLE_ANALYTICS_ID
    : null;

  // Don't load analytics if:
  // 1. No measurement ID is configured
  // 2. User hasn't consented to analytics cookies (if cookie consent is implemented)
  // 3. DNT (Do Not Track) is enabled
  if (!GA_MEASUREMENT_ID) {
    console.log('Google Analytics: No measurement ID configured');
    return;
  }

  // Check for Do Not Track
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    console.log('Google Analytics: Disabled due to Do Not Track');
    return;
  }

  // Check cookie consent if available
  if (typeof window.cookieConsent !== 'undefined' && !window.cookieConsent.analytics) {
    console.log('Google Analytics: Waiting for cookie consent');

    // Listen for consent changes
    window.addEventListener('cookieConsentChanged', function(e) {
      if (e.detail && e.detail.analytics) {
        loadAnalytics();
      }
    });
    return;
  }

  // Load Google Analytics
  loadAnalytics();

  function loadAnalytics() {
    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      'anonymize_ip': true, // Anonymize IP addresses for privacy
      'cookie_flags': 'SameSite=None;Secure', // Secure cookie handling
    });

    console.log('Google Analytics: Loaded with ID', GA_MEASUREMENT_ID);
  }

  // Expose analytics helper functions
  window.analytics = {
    /**
     * Track a custom event
     * @param {string} eventName - The name of the event
     * @param {object} params - Event parameters
     */
    trackEvent: function(eventName, params = {}) {
      if (window.gtag) {
        gtag('event', eventName, params);
      }
    },

    /**
     * Track a page view (useful for SPAs)
     * @param {string} pagePath - The page path to track
     * @param {string} pageTitle - The page title
     */
    trackPageView: function(pagePath, pageTitle) {
      if (window.gtag) {
        gtag('config', GA_MEASUREMENT_ID, {
          'page_path': pagePath,
          'page_title': pageTitle
        });
      }
    },

    /**
     * Set user properties
     * @param {object} properties - User properties to set
     */
    setUserProperties: function(properties) {
      if (window.gtag) {
        gtag('set', 'user_properties', properties);
      }
    }
  };
})();
