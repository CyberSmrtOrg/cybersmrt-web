/**
 * CyberSmrt Auth Modal - Global Functions
 * Load this BEFORE header/footer partials
 */

// Toggle mobile menu in header
function toggleHeaderMenu(btn) {
  const navLinks = document.querySelector('.site-header .nav-links');
  if (!navLinks) return;

  const isExpanded = btn.getAttribute('aria-expanded') === 'true';
  navLinks.classList.toggle('show');
  btn.setAttribute('aria-expanded', !isExpanded);
}

// Open login modal (safe - waits for modal to exist)
function openLoginModalSafe() {
  const overlay = document.getElementById('auth-modal-overlay');

  if (overlay) {
    // Modal exists, open it
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
  } else {
    // Modal doesn't exist yet, wait and retry
    console.log('Waiting for modal to load...');
    setTimeout(openLoginModalSafe, 100);
  }
}

// Open login modal (direct - use after modal is loaded)
function openLoginModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Close login modal
function closeLoginModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// Close modal when clicking overlay
function closeLoginModalOnOverlay(event) {
  if (event.target.id === 'auth-modal-overlay') {
    closeLoginModal();
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay && overlay.classList.contains('active')) {
      closeLoginModal();
    }
  }
});

// Make functions globally available
window.toggleHeaderMenu = toggleHeaderMenu;
window.openLoginModalSafe = openLoginModalSafe;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.closeLoginModalOnOverlay = closeLoginModalOnOverlay;

console.log('✅ Auth modal functions loaded');