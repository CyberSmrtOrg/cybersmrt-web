// Session Timeout Manager with Activity Tracking
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    IDLE_TIMEOUT: 30 * 60 * 1000,        // 30 minutes of inactivity
    WARNING_TIME: 5 * 60 * 1000,         // Show warning 5 minutes before timeout
    CHECK_INTERVAL: 60 * 1000,           // Check every 60 seconds
    ABSOLUTE_TIMEOUT: 12 * 60 * 60 * 1000, // 12 hours absolute max session
    STORAGE_KEY: 'session_activity'
  };

  // Activity events to track
  const ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  let lastActivityTime = Date.now();
  let sessionStartTime = Date.now();
  let checkInterval = null;
  let warningShown = false;
  let warningModal = null;
  let countdownInterval = null;

  // Update last activity time
  function updateActivity() {
    lastActivityTime = Date.now();
    warningShown = false;
    hideWarningModal();

    // Save to localStorage for cross-tab sync
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        lastActivity: lastActivityTime,
        sessionStart: sessionStartTime
      }));
    } catch (e) {
      console.error('Failed to save session activity:', e);
    }
  }

  // Get session info from storage (for cross-tab sync)
  function getStoredSessionInfo() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse session activity:', e);
    }
    return null;
  }

  // Check if session should timeout
  function checkSessionTimeout() {
    // Only check if user is authenticated
    if (typeof window.isAuthenticated !== 'function' || !window.isAuthenticated()) {
      return;
    }

    const now = Date.now();

    // Check cross-tab activity
    const stored = getStoredSessionInfo();
    if (stored && stored.lastActivity > lastActivityTime) {
      lastActivityTime = stored.lastActivity;
      sessionStartTime = stored.sessionStart;
      warningShown = false;
      hideWarningModal();
    }

    const timeSinceActivity = now - lastActivityTime;
    const timeSinceSessionStart = now - sessionStartTime;

    // Absolute timeout check (regardless of activity)
    if (timeSinceSessionStart > CONFIG.ABSOLUTE_TIMEOUT) {
      console.log('Session expired: Absolute timeout reached');
      handleSessionTimeout('Your session has expired due to maximum time limit (12 hours).');
      return;
    }

    // Idle timeout check
    if (timeSinceActivity > CONFIG.IDLE_TIMEOUT) {
      console.log('Session expired: Inactivity timeout');
      handleSessionTimeout('Your session has expired due to inactivity.');
      return;
    }

    // Show warning if approaching timeout
    const timeUntilTimeout = CONFIG.IDLE_TIMEOUT - timeSinceActivity;
    if (timeUntilTimeout <= CONFIG.WARNING_TIME && !warningShown) {
      showWarningModal(timeUntilTimeout);
      warningShown = true;
    }
  }

  // Handle session timeout
  function handleSessionTimeout(message) {
    stopSessionMonitoring();

    // Clear session data
    if (typeof window.logout === 'function') {
      // Show timeout message before logout
      showTimeoutMessage(message);
      setTimeout(() => {
        window.logout();
      }, 3000);
    } else {
      // Fallback: clear tokens manually
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      window.location.href = '/?session=expired';
    }
  }

  // Show timeout message
  function showTimeoutMessage(message) {
    const modal = document.createElement('div');
    modal.className = 'session-timeout-modal';
    modal.innerHTML = `
      <div class="session-timeout-content">
        <div class="session-timeout-icon">⏱️</div>
        <h3>Session Expired</h3>
        <p>${message}</p>
        <p class="session-timeout-redirect">Redirecting to home page...</p>
      </div>
    `;
    document.body.appendChild(modal);

    // Add styles
    if (!document.getElementById('session-timeout-styles')) {
      const styles = document.createElement('style');
      styles.id = 'session-timeout-styles';
      styles.textContent = `
        .session-timeout-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }
        .session-timeout-content {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 40px;
          border-radius: 16px;
          text-align: center;
          max-width: 400px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          animation: slideUp 0.4s ease;
        }
        .session-timeout-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .session-timeout-content h3 {
          color: white;
          margin: 0 0 16px 0;
          font-size: 24px;
        }
        .session-timeout-content p {
          color: #cbd5e1;
          margin: 0 0 12px 0;
          line-height: 1.6;
        }
        .session-timeout-redirect {
          color: #667eea;
          font-weight: 600;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  // Show warning modal
  function showWarningModal(timeRemaining) {
    if (warningModal) return; // Already showing

    warningModal = document.createElement('div');
    warningModal.className = 'session-warning-modal';
    warningModal.innerHTML = `
      <div class="session-warning-content">
        <div class="session-warning-header">
          <h3>⚠️ Session Expiring Soon</h3>
          <button class="session-warning-close" aria-label="Close">×</button>
        </div>
        <p>Your session will expire in <strong id="session-countdown"></strong> due to inactivity.</p>
        <p class="session-warning-hint">Move your mouse or press any key to stay logged in.</p>
        <div class="session-warning-actions">
          <button class="session-btn session-btn-stay">Stay Logged In</button>
        </div>
      </div>
    `;

    document.body.appendChild(warningModal);

    // Add styles
    if (!document.getElementById('session-warning-styles')) {
      const styles = document.createElement('style');
      styles.id = 'session-warning-styles';
      styles.textContent = `
        .session-warning-modal {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          animation: slideInRight 0.4s ease;
        }
        .session-warning-content {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 24px;
          border-radius: 12px;
          max-width: 400px;
          border: 2px solid #f59e0b;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .session-warning-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .session-warning-header h3 {
          color: white;
          margin: 0;
          font-size: 18px;
        }
        .session-warning-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          line-height: 1;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .session-warning-close:hover {
          background: rgba(148, 163, 184, 0.1);
          color: white;
        }
        .session-warning-content p {
          color: #cbd5e1;
          margin: 0 0 12px 0;
          line-height: 1.6;
        }
        .session-warning-content strong {
          color: #f59e0b;
          font-weight: 700;
        }
        .session-warning-hint {
          font-size: 14px;
          color: #94a3b8;
        }
        .session-warning-actions {
          margin-top: 16px;
          display: flex;
          gap: 12px;
        }
        .session-btn {
          flex: 1;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .session-btn-stay {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .session-btn-stay:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @media (max-width: 640px) {
          .session-warning-modal {
            bottom: 10px;
            right: 10px;
            left: 10px;
          }
          .session-warning-content {
            max-width: 100%;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    // Start countdown
    startCountdown(timeRemaining);

    // Event listeners
    warningModal.querySelector('.session-warning-close').addEventListener('click', () => {
      updateActivity();
    });

    warningModal.querySelector('.session-btn-stay').addEventListener('click', () => {
      updateActivity();
    });
  }

  // Hide warning modal
  function hideWarningModal() {
    if (warningModal) {
      warningModal.remove();
      warningModal = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // Start countdown timer
  function startCountdown(initialTime) {
    const countdownEl = document.getElementById('session-countdown');
    if (!countdownEl) return;

    let remaining = Math.floor(initialTime / 1000);

    const updateCountdown = () => {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      remaining--;

      if (remaining < 0) {
        clearInterval(countdownInterval);
      }
    };

    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  // Start session monitoring
  function startSessionMonitoring() {
    // Initialize session times
    const stored = getStoredSessionInfo();
    if (stored) {
      lastActivityTime = stored.lastActivity;
      sessionStartTime = stored.sessionStart;
    } else {
      lastActivityTime = Date.now();
      sessionStartTime = Date.now();
      updateActivity();
    }

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Start interval check
    if (!checkInterval) {
      checkInterval = setInterval(checkSessionTimeout, CONFIG.CHECK_INTERVAL);
    }

    // Initial check
    checkSessionTimeout();

    console.log('✅ Session monitoring started');
    console.log(`   Idle timeout: ${CONFIG.IDLE_TIMEOUT / 60000} minutes`);
    console.log(`   Absolute timeout: ${CONFIG.ABSOLUTE_TIMEOUT / 3600000} hours`);
  }

  // Stop session monitoring
  function stopSessionMonitoring() {
    // Remove activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, updateActivity);
    });

    // Clear intervals
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }

    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    hideWarningModal();

    console.log('Session monitoring stopped');
  }

  // Listen for storage changes (activity in other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === CONFIG.STORAGE_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.lastActivity > lastActivityTime) {
          lastActivityTime = data.lastActivity;
          warningShown = false;
          hideWarningModal();
        }
      } catch (err) {
        console.error('Failed to sync activity from storage:', err);
      }
    }
  });

  // Initialize on page load
  function init() {
    // Only start monitoring if user is authenticated
    if (typeof window.isAuthenticated === 'function' && window.isAuthenticated()) {
      startSessionMonitoring();
    }

    // Listen for auth state changes
    window.addEventListener('cookieConsentUpdated', () => {
      // Restart monitoring if user just logged in
      if (typeof window.isAuthenticated === 'function' && window.isAuthenticated()) {
        startSessionMonitoring();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.SessionManager = {
    start: startSessionMonitoring,
    stop: stopSessionMonitoring,
    updateActivity: updateActivity,
    getLastActivityTime: () => lastActivityTime,
    getSessionStartTime: () => sessionStartTime,
    getTimeRemaining: () => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      return Math.max(0, CONFIG.IDLE_TIMEOUT - timeSinceActivity);
    }
  };

  console.log('✅ Session manager loaded');
})();
