// Feedback Widget Management

// Prevent duplicate execution
if (typeof window.FEEDBACK_WIDGET_LOADED === 'undefined') {
window.FEEDBACK_WIDGET_LOADED = true;

(function() {
  'use strict';

  // Create the feedback widget button
  function createFeedbackButton() {
    const button = document.createElement('button');
    button.id = 'feedback-widget-tab';
    button.className = 'feedback-widget-tab';
    button.setAttribute('aria-label', 'Report a problem');
    button.innerHTML = `<span class="feedback-icon">⚠️</span>`;

    document.body.appendChild(button);
    return button;
  }

  // Create the feedback popup
  function createFeedbackPopup() {
    const popup = document.createElement('div');
    popup.id = 'feedback-popup';
    popup.className = 'feedback-popup';
    popup.innerHTML = `
      <div class="feedback-popup-header">
        <h3 class="feedback-popup-title">
          <span>💬</span>
          Website Feedback
        </h3>
        <button class="feedback-close-btn" aria-label="Close">&times;</button>
      </div>

      <div class="feedback-popup-body">
        <p class="feedback-message">
          Do you have a problem with this website? I want to know about it!
        </p>

        <a href="mailto:tony@cybersmrt.org?subject=Website%20Feedback" class="feedback-email">
          <div class="feedback-email-icon">✉️</div>
          <div class="feedback-email-text">
            <p class="feedback-email-label">Email Tony</p>
            <p class="feedback-email-address">tony@cybersmrt.org</p>
          </div>
        </a>
      </div>

      <div class="feedback-popup-footer">
        Your feedback helps us improve!
      </div>
    `;

    document.body.appendChild(popup);
    return popup;
  }

  // Show the popup
  function showPopup() {
    const popup = document.getElementById('feedback-popup');
    if (popup) {
      popup.classList.add('show');
    }
  }

  // Hide the popup
  function hidePopup() {
    const popup = document.getElementById('feedback-popup');
    if (popup) {
      popup.classList.remove('show');
    }
  }

  // Toggle the popup
  function togglePopup() {
    const popup = document.getElementById('feedback-popup');
    if (popup && popup.classList.contains('show')) {
      hidePopup();
    } else {
      showPopup();
    }
  }

  // Initialize the widget
  function init() {
    // Create the feedback button
    const button = createFeedbackButton();
    button.addEventListener('click', togglePopup);

    // Create the feedback popup
    const popup = createFeedbackPopup();

    // Close button handler
    const closeBtn = popup.querySelector('.feedback-close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hidePopup();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('feedback-popup');
      const button = document.getElementById('feedback-widget-tab');

      if (popup &&
          popup.classList.contains('show') &&
          !popup.contains(e.target) &&
          !button.contains(e.target)) {
        hidePopup();
      }
    });

    // Prevent popup close when clicking inside
    popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    console.log('✅ Feedback widget initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.FeedbackWidget = {
    show: showPopup,
    hide: hidePopup,
    toggle: togglePopup
  };
})();

} // End duplicate check
