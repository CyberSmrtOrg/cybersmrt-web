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
    button.setAttribute('aria-label', 'Website Feedback');
    button.setAttribute('title', 'Website Feedback');
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

        <form id="feedback-form" class="feedback-form">
          <div class="feedback-form-group">
            <label for="feedback-name">Name (optional)</label>
            <input type="text" id="feedback-name" name="name" placeholder="Your name">
          </div>

          <div class="feedback-form-group">
            <label for="feedback-email">Email (optional)</label>
            <input type="email" id="feedback-email" name="email" placeholder="your@email.com">
          </div>

          <div class="feedback-form-group">
            <label for="feedback-message">Message <span class="required">*</span></label>
            <textarea id="feedback-message" name="message" rows="4" placeholder="What issue did you encounter?" required></textarea>
          </div>

          <div class="feedback-form-actions">
            <button type="submit" class="feedback-submit-btn">
              <span class="submit-text">Send Feedback</span>
              <span class="submit-loading" style="display: none;">Sending...</span>
            </button>
          </div>
        </form>

        <div id="feedback-success" class="feedback-success" style="display: none;">
          <div class="success-icon">✓</div>
          <h4>Thank you!</h4>
          <p>Your feedback has been sent to Tony.</p>
        </div>

        <div id="feedback-error" class="feedback-error" style="display: none;">
          <div class="error-icon">✗</div>
          <h4>Oops!</h4>
          <p class="error-message">Something went wrong. Please try again.</p>
        </div>
      </div>

      <div class="feedback-popup-footer">
        Your feedback helps us improve!
      </div>
    `;

    document.body.appendChild(popup);
    return popup;
  }

  // Submit feedback to Slack
  async function submitFeedback(formData) {
    const name = formData.get('name') || 'Anonymous';
    const email = formData.get('email') || 'Not provided';
    const message = formData.get('message');
    const currentPage = window.location.href;
    const userAgent = navigator.userAgent;

    try {
      const response = await fetch('https://api.cybersmrt.org/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          message,
          page: currentPage,
          userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      return { success: true };
    } catch (error) {
      console.error('Feedback submission error:', error);
      return { success: false, error: error.message };
    }
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

    // Form submission handler
    const form = popup.querySelector('#feedback-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('.feedback-submit-btn');
      const submitText = submitBtn.querySelector('.submit-text');
      const submitLoading = submitBtn.querySelector('.submit-loading');
      const successDiv = popup.querySelector('#feedback-success');
      const errorDiv = popup.querySelector('#feedback-error');

      // Show loading state
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitLoading.style.display = 'inline';

      // Hide previous messages
      successDiv.style.display = 'none';
      errorDiv.style.display = 'none';

      // Submit feedback
      const formData = new FormData(form);
      const result = await submitFeedback(formData);

      // Reset button state
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      submitLoading.style.display = 'none';

      if (result.success) {
        // Show success message
        form.style.display = 'none';
        successDiv.style.display = 'block';

        // Reset form after 3 seconds and close
        setTimeout(() => {
          form.reset();
          form.style.display = 'block';
          successDiv.style.display = 'none';
          hidePopup();
        }, 3000);
      } else {
        // Show error message
        errorDiv.querySelector('.error-message').textContent = result.error || 'Something went wrong. Please try again.';
        errorDiv.style.display = 'block';

        // Hide error after 5 seconds
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 5000);
      }
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
