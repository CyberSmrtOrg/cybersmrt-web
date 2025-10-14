(function () {
  const ready = (fn) => (document.readyState !== 'loading')
    ? fn()
    : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    // Mobile toggle
    const header = document.querySelector('.site-header');
    if (!header) return;

    const toggle = header.querySelector('.nav-toggle');
    const links  = header.querySelector('.nav-links');

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const shown = links.classList.toggle('show');
        toggle.setAttribute('aria-expanded', shown ? 'true' : 'false');
      });

      // close on link click (mobile)
      links.addEventListener('click', (e) => {
        if (e.target.matches('a') && links.classList.contains('show')) {
          links.classList.remove('show');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Highlight current page
    const here = location.pathname.replace(/\/+$/, ''); // strip trailing slash
    header.querySelectorAll('.nav-links a[href]').forEach(a => {
      const href = a.getAttribute('href').replace(/\/+$/, '');
      if (href && (here === href || (href !== '/' && here.startsWith(href)))) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  });
})();
