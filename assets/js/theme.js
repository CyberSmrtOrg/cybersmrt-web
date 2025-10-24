/**
 * Global Theme and Settings Manager
 * Manages theme, language, and other user preferences across the site
 */

(function() {
  'use strict';

  // Theme management
  const ThemeManager = {
    // Get current theme setting from localStorage or default to 'dark'
    getTheme: function() {
      return localStorage.getItem('theme') || 'dark';
    },

    // Apply theme to the page
    applyTheme: function(themeSetting) {
      const html = document.documentElement;

      if (themeSetting === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else if (themeSetting === 'light') {
        html.setAttribute('data-theme', 'light');
      } else {
        // Default to dark
        html.setAttribute('data-theme', 'dark');
      }
    },

    // Set and save theme
    setTheme: function(theme) {
      localStorage.setItem('theme', theme);
      this.applyTheme(theme);
    },

    // Initialize theme on page load
    init: function() {
      const theme = this.getTheme();
      this.applyTheme(theme);

      // Listen for system theme changes when in auto mode
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.getTheme() === 'auto') {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      });
    }
  };

  // Language management
  const LanguageManager = {
    // Get current language from localStorage or default to 'en'
    getLanguage: function() {
      return localStorage.getItem('language') || 'en';
    },

    // Apply language to the page
    applyLanguage: function(language) {
      document.documentElement.setAttribute('lang', language || 'en');
    },

    // Set and save language
    setLanguage: function(language) {
      localStorage.setItem('language', language);
      this.applyLanguage(language);
    },

    // Initialize language on page load
    init: function() {
      const language = this.getLanguage();
      this.applyLanguage(language);
    }
  };

  // Reduce motion management
  const MotionManager = {
    getReduceMotion: function() {
      return localStorage.getItem('reduceMotion') === 'true';
    },

    applyReduceMotion: function(reduce) {
      if (reduce) {
        document.documentElement.style.setProperty('--transition-duration', '0s');
      } else {
        document.documentElement.style.removeProperty('--transition-duration');
      }
    },

    setReduceMotion: function(reduce) {
      localStorage.setItem('reduceMotion', reduce ? 'true' : 'false');
      this.applyReduceMotion(reduce);
    },

    init: function() {
      const reduce = this.getReduceMotion();
      this.applyReduceMotion(reduce);
    }
  };

  // Initialize everything when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      ThemeManager.init();
      LanguageManager.init();
      MotionManager.init();
    });
  } else {
    ThemeManager.init();
    LanguageManager.init();
    MotionManager.init();
  }

  // Expose managers globally
  window.ThemeManager = ThemeManager;
  window.LanguageManager = LanguageManager;
  window.MotionManager = MotionManager;
})();
