/**
 * Multi-Analytics Configuration
 *
 * This script loads multiple analytics services:
 * - Google Analytics (GA4) - Comprehensive analytics
 * - Cloudflare Web Analytics - Privacy-first, cookieless
 * - Microsoft Clarity - Heatmaps and session recordings
 *
 * All services respect user privacy and cookie consent.
 */

(function() {
  'use strict';

  // Get analytics IDs/tokens from environment variables
  // These will be replaced at build time from .env
  const GA_MEASUREMENT_ID = typeof GOOGLE_ANALYTICS_ID !== 'undefined'
    ? GOOGLE_ANALYTICS_ID
    : null;

  const CLOUDFLARE_TOKEN = typeof CLOUDFLARE_ANALYTICS_TOKEN !== 'undefined'
    ? CLOUDFLARE_ANALYTICS_TOKEN
    : null;

  const CLARITY_ID = typeof MICROSOFT_CLARITY_ID !== 'undefined'
    ? MICROSOFT_CLARITY_ID
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

  // Load Cloudflare Web Analytics (privacy-first, no cookies)
  function loadCloudflareAnalytics() {
    if (!CLOUDFLARE_TOKEN) {
      console.log('Cloudflare Analytics: No token configured');
      return;
    }

    // Cloudflare Analytics doesn't require DNT or cookie consent (privacy-first)
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: CLOUDFLARE_TOKEN }));
    document.head.appendChild(script);

    console.log('Cloudflare Analytics: Loaded');
  }

  // Load Microsoft Clarity (heatmaps and session recordings)
  function loadMicrosoftClarity() {
    if (!CLARITY_ID) {
      console.log('Microsoft Clarity: No project ID configured');
      return;
    }

    // Check for Do Not Track
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
      console.log('Microsoft Clarity: Disabled due to Do Not Track');
      return;
    }

    // Microsoft Clarity initialization
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CLARITY_ID);

    console.log('Microsoft Clarity: Loaded with ID', CLARITY_ID);
  }

  // Load Cloudflare Analytics immediately (privacy-first, no consent needed)
  loadCloudflareAnalytics();

  // Load Microsoft Clarity with same consent rules as Google Analytics
  if (typeof window.cookieConsent !== 'undefined' && !window.cookieConsent.analytics) {
    window.addEventListener('cookieConsentChanged', function(e) {
      if (e.detail && e.detail.analytics) {
        loadMicrosoftClarity();
      }
    });
  } else {
    loadMicrosoftClarity();
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
