/**
 * CyberSmrt Password Guardian - Content Script
 * Monitors password fields and provides real-time security analysis
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    DEBOUNCE_DELAY: 300, // ms to wait before checking
    BREACH_CHECK_DELAY: 1000, // ms to wait before breach checking
    MIN_PASSWORD_LENGTH: 4,
    CACHE_DURATION: 3600000, // 1 hour cache for breach checks
  };

  // Cache for breach checks to avoid repeated API calls
  const breachCache = new Map();

  // Track active password fields
  const monitoredFields = new WeakMap();

  /**
   * Calculate password strength (0-5)
   */
  function calculateStrength(password) {
    let strength = 0;

    const checks = {
      length: password.length >= 12,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
      longLength: password.length >= 16
    };

    if (checks.length) strength++;
    if (checks.longLength) strength++;
    if (checks.lowercase) strength++;
    if (checks.uppercase) strength++;
    if (checks.numbers) strength++;
    if (checks.special) strength++;

    // Deduct points for common patterns
    if (/^[a-z]+$/.test(password)) strength -= 2;
    if (/^[0-9]+$/.test(password)) strength -= 2;
    if (/password|123456|qwerty/i.test(password)) strength -= 3;

    return Math.max(0, Math.min(5, strength));
  }

  /**
   * SHA-1 hash function
   */
  async function sha1(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /**
   * Check password against Have I Been Pwned
   */
  async function checkPasswordBreach(password) {
    // Check cache first
    const cacheKey = await sha1(password);
    if (breachCache.has(cacheKey)) {
      const cached = breachCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        return cached.count;
      }
    }

    try {
      const hash = cacheKey;
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.text();
      const hashes = data.split('\n');

      for (let line of hashes) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
          const breachCount = parseInt(count.trim());
          // Cache the result
          breachCache.set(cacheKey, {
            count: breachCount,
            timestamp: Date.now()
          });
          return breachCount;
        }
      }

      // Not found - cache this too
      breachCache.set(cacheKey, {
        count: 0,
        timestamp: Date.now()
      });
      return 0;

    } catch (error) {
      console.error('[CyberSmrt] Breach check failed:', error);
      return null; // null indicates error, not "safe"
    }
  }

  /**
   * Create or update the feedback widget
   */
  function createFeedbackWidget(input) {
    let widget = monitoredFields.get(input)?.widget;

    if (!widget) {
      widget = document.createElement('div');
      widget.className = 'cybersmrt-password-widget';
      widget.innerHTML = `
        <div class="cybersmrt-strength-bar">
          <div class="cybersmrt-strength-fill"></div>
        </div>
        <div class="cybersmrt-feedback-text"></div>
        <div class="cybersmrt-breach-status"></div>
      `;

      // Position the widget relative to the input
      const rect = input.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      widget.style.position = 'absolute';
      widget.style.top = `${rect.bottom + scrollTop + 5}px`;
      widget.style.left = `${rect.left + scrollLeft}px`;
      widget.style.width = `${Math.max(rect.width, 300)}px`;
      widget.style.zIndex = '999999';

      document.body.appendChild(widget);

      // Update position on scroll/resize
      const updatePosition = () => {
        const rect = input.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        widget.style.top = `${rect.bottom + scrollTop + 5}px`;
        widget.style.left = `${rect.left + scrollLeft}px`;
        widget.style.width = `${Math.max(rect.width, 300)}px`;
      };

      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      // Store cleanup function
      const data = monitoredFields.get(input) || {};
      data.widget = widget;
      data.cleanup = () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
        widget.remove();
      };
      monitoredFields.set(input, data);
    }

    return widget;
  }

  /**
   * Update the feedback widget with current status
   */
  function updateFeedbackWidget(input, password, strength, breachCount = null) {
    const widget = createFeedbackWidget(input);
    const strengthFill = widget.querySelector('.cybersmrt-strength-fill');
    const feedbackText = widget.querySelector('.cybersmrt-feedback-text');
    const breachStatus = widget.querySelector('.cybersmrt-breach-status');

    // Update strength bar
    const strengthColors = ['#ef4444', '#f59e0b', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

    strengthFill.style.width = `${(strength / 5) * 100}%`;
    strengthFill.style.background = strengthColors[strength];

    feedbackText.textContent = `Password Strength: ${strengthLabels[strength]}`;
    feedbackText.style.color = strengthColors[strength];

    // Update breach status
    if (breachCount === null) {
      breachStatus.textContent = 'Checking breach databases...';
      breachStatus.className = 'cybersmrt-breach-status checking';
    } else if (breachCount === 0) {
      breachStatus.innerHTML = '✅ Not found in breach databases';
      breachStatus.className = 'cybersmrt-breach-status safe';
    } else if (breachCount > 0) {
      const severity = breachCount > 10000 ? 'critical' : 'warning';
      breachStatus.innerHTML = `⚠️ Found in ${breachCount.toLocaleString()} breaches - <strong>${severity === 'critical' ? 'DO NOT USE' : 'Change this password'}</strong>`;
      breachStatus.className = `cybersmrt-breach-status ${severity}`;
    }

    // Show widget
    widget.style.display = 'block';
  }

  /**
   * Hide the feedback widget
   */
  function hideFeedbackWidget(input) {
    const data = monitoredFields.get(input);
    if (data && data.widget) {
      data.widget.style.display = 'none';
    }
  }

  /**
   * Handle password input
   */
  let strengthCheckTimeout;
  let breachCheckTimeout;

  function handlePasswordInput(event) {
    const input = event.target;
    const password = input.value;

    // Clear existing timeouts
    clearTimeout(strengthCheckTimeout);
    clearTimeout(breachCheckTimeout);

    if (!password || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
      hideFeedbackWidget(input);
      return;
    }

    // Immediate strength check (debounced)
    strengthCheckTimeout = setTimeout(() => {
      const strength = calculateStrength(password);
      updateFeedbackWidget(input, password, strength, null);

      // Delayed breach check
      breachCheckTimeout = setTimeout(async () => {
        const breachCount = await checkPasswordBreach(password);
        updateFeedbackWidget(input, password, strength, breachCount);
      }, CONFIG.BREACH_CHECK_DELAY);

    }, CONFIG.DEBOUNCE_DELAY);
  }

  /**
   * Handle focus on password field
   */
  function handlePasswordFocus(event) {
    const input = event.target;
    const password = input.value;

    if (password && password.length >= CONFIG.MIN_PASSWORD_LENGTH) {
      const strength = calculateStrength(password);
      updateFeedbackWidget(input, password, strength, null);
    }
  }

  /**
   * Handle blur on password field
   */
  function handlePasswordBlur(event) {
    const input = event.target;

    // Delay hiding to allow user to see final status
    setTimeout(() => {
      hideFeedbackWidget(input);
    }, 200);
  }

  /**
   * Monitor a password field
   */
  function monitorPasswordField(input) {
    if (monitoredFields.has(input)) {
      return; // Already monitoring
    }

    // Initialize monitoring data
    monitoredFields.set(input, {
      widget: null,
      cleanup: null
    });

    // Add event listeners
    input.addEventListener('input', handlePasswordInput);
    input.addEventListener('focus', handlePasswordFocus);
    input.addEventListener('blur', handlePasswordBlur);

    console.log('[CyberSmrt] Monitoring password field:', input);
  }

  /**
   * Find all password fields on the page
   */
  function findPasswordFields() {
    // Find all password input fields
    const passwordFields = document.querySelectorAll('input[type="password"]');

    passwordFields.forEach(field => {
      // Only monitor visible fields
      if (field.offsetParent !== null) {
        monitorPasswordField(field);
      }
    });
  }

  /**
   * Initialize the extension
   */
  function init() {
    console.log('[CyberSmrt] Password Guardian initialized');

    // Initial scan
    findPasswordFields();

    // Watch for dynamically added password fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches('input[type="password"]')) {
              monitorPasswordField(node);
            } else if (node.querySelectorAll) {
              const passwordFields = node.querySelectorAll('input[type="password"]');
              passwordFields.forEach(field => {
                if (field.offsetParent !== null) {
                  monitorPasswordField(field);
                }
              });
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      monitoredFields.forEach((data) => {
        if (data.cleanup) {
          data.cleanup();
        }
      });
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
