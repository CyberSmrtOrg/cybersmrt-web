// Volunteer Application Modal Management

// Prevent duplicate execution
if (typeof window.VOLUNTEER_MODAL_LOADED === 'undefined') {
window.VOLUNTEER_MODAL_LOADED = true;

(function() {
  'use strict';

  // Create the volunteer modal
  function createVolunteerModal() {
    const modal = document.createElement('div');
    modal.id = 'volunteer-modal';
    modal.className = 'volunteer-modal';
    modal.innerHTML = `
      <div class="volunteer-modal-overlay"></div>
      <div class="volunteer-modal-content">
        <div class="volunteer-modal-header">
          <h3 class="volunteer-modal-title">
            <span>🤝</span>
            Apply to Volunteer
          </h3>
          <button class="volunteer-close-btn" aria-label="Close">&times;</button>
        </div>

        <div class="volunteer-modal-body">
          <p class="volunteer-message">
            Thank you for your interest in volunteering with CyberSmrt! Fill out the form below and we'll get back to you within 2 business days.
          </p>

          <form id="volunteer-form" class="volunteer-form">
            <div class="volunteer-form-group">
              <label for="volunteer-name">Name <span class="required">*</span></label>
              <input type="text" id="volunteer-name" name="name" placeholder="Your full name" required>
            </div>

            <div class="volunteer-form-group">
              <label for="volunteer-email">Email <span class="required">*</span></label>
              <input type="email" id="volunteer-email" name="email" placeholder="your@email.com" required>
            </div>

            <div class="volunteer-form-group">
              <label for="volunteer-phone">Phone (optional)</label>
              <input type="tel" id="volunteer-phone" name="phone" placeholder="(555) 123-4567">
            </div>

            <div class="volunteer-form-group">
              <label for="volunteer-message">Tell us about your interest <span class="required">*</span></label>
              <textarea id="volunteer-message" name="message" rows="6" placeholder="Please share your cybersecurity experience, areas of interest, and availability..." required></textarea>
            </div>

            <div class="volunteer-form-actions">
              <button type="submit" class="volunteer-submit-btn">
                <span class="submit-text">Submit Application</span>
                <span class="submit-loading" style="display: none;">Sending...</span>
              </button>
            </div>
          </form>

          <div id="volunteer-success" class="volunteer-success" style="display: none;">
            <div class="success-icon">✓</div>
            <h4>Application Received!</h4>
            <p>Thank you for your interest in volunteering with CyberSmrt. We'll review your application and get back to you within 2 business days.</p>
          </div>

          <div id="volunteer-error" class="volunteer-error" style="display: none;">
            <div class="error-icon">✗</div>
            <h4>Oops!</h4>
            <p class="error-message">Something went wrong. Please try again or email us directly at info@cybersmrt.org</p>
          </div>
        </div>

        <div class="volunteer-modal-footer">
          Questions? Email us at <a href="mailto:info@cybersmrt.org">info@cybersmrt.org</a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  // Submit volunteer application
  async function submitVolunteerApplication(formData, roleName) {
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone') || 'Not provided';
    const message = formData.get('message');
    const currentPage = window.location.href;
    const userAgent = navigator.userAgent;

    // Build subject line with role name if provided
    const subject = roleName ? `Volunteer Opportunity - ${roleName}` : 'Volunteer Application';

    try {
      const response = await fetch('https://api.cybersmrt.org/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          message: `VOLUNTEER APPLICATION\n\nPhone: ${phone}\n\n${message}`,
          page: currentPage,
          userAgent,
          subject
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit volunteer application');
      }

      return { success: true };
    } catch (error) {
      console.error('Volunteer application submission error:', error);
      return { success: false, error: error.message };
    }
  }

  // Show the modal
  let currentRoleName = null;

  function showModal(roleName) {
    currentRoleName = roleName || null;
    const modal = document.getElementById('volunteer-modal');
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  // Hide the modal
  function hideModal() {
    const modal = document.getElementById('volunteer-modal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = ''; // Restore scrolling
    }
  }

  // Initialize the modal
  function init() {
    // Create the volunteer modal
    const modal = createVolunteerModal();

    // Close button handler
    const closeBtn = modal.querySelector('.volunteer-close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideModal();
    });

    // Overlay click handler
    const overlay = modal.querySelector('.volunteer-modal-overlay');
    overlay.addEventListener('click', hideModal);

    // Form submission handler
    const form = modal.querySelector('#volunteer-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('.volunteer-submit-btn');
      const submitText = submitBtn.querySelector('.submit-text');
      const submitLoading = submitBtn.querySelector('.submit-loading');
      const successDiv = modal.querySelector('#volunteer-success');
      const errorDiv = modal.querySelector('#volunteer-error');

      // Show loading state
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitLoading.style.display = 'inline';

      // Hide previous messages
      successDiv.style.display = 'none';
      errorDiv.style.display = 'none';

      // Submit application
      const formData = new FormData(form);
      const result = await submitVolunteerApplication(formData, currentRoleName);

      // Reset button state
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      submitLoading.style.display = 'none';

      if (result.success) {
        // Show success message
        form.style.display = 'none';
        successDiv.style.display = 'block';

        // Reset form after 5 seconds and close
        setTimeout(() => {
          form.reset();
          form.style.display = 'block';
          successDiv.style.display = 'none';
          hideModal();
        }, 5000);
      } else {
        // Show error message
        errorDiv.querySelector('.error-message').textContent = result.error || 'Something went wrong. Please try again or email us directly at info@cybersmrt.org';
        errorDiv.style.display = 'block';

        // Hide error after 5 seconds
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 5000);
      }
    });

    // Prevent modal close when clicking inside content
    const modalContent = modal.querySelector('.volunteer-modal-content');
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Attach click handlers to all "Apply to Volunteer" buttons/links
    function attachVolunteerButtons() {
      // Find all links and buttons with text containing "Apply to Volunteer"
      const buttons = Array.from(document.querySelectorAll('a, button')).filter(el => {
        return el.textContent.trim().includes('Apply to Volunteer');
      });

      buttons.forEach(button => {
        // Remove href to prevent navigation
        if (button.tagName === 'A') {
          button.href = 'javascript:void(0)';
        }

        // Add click handler
        button.addEventListener('click', (e) => {
          e.preventDefault();
          showModal();
        });
      });
    }

    // Attach to existing buttons
    attachVolunteerButtons();

    // Re-attach on dynamic content changes (for SPAs or late-loaded content)
    const observer = new MutationObserver(attachVolunteerButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    console.log('✅ Volunteer modal initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.VolunteerModal = {
    show: showModal,
    hide: hideModal
  };
})();

} // End duplicate check
