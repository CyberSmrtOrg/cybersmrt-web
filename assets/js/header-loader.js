/* /assets/js/header-loader.js */
(async function mountSharedHeader(){
  try {
    // If a header is already present, don’t duplicate
    if (document.querySelector('.site-header')) return;

    // Fetch the partial and inject it at the top of <body>
    const res = await fetch('/partials/header.html', { cache: 'reload' });
    if (!res.ok) throw new Error('Failed to load header.html');
    const html = await res.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    const headerEl = tmp.firstElementChild;
    document.body.insertBefore(headerEl, document.body.firstChild);

    // Wire up mobile toggle
    const toggle = headerEl.querySelector('.nav-toggle');
    const links  = headerEl.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('show');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // Active link highlight
    const here = location.pathname.replace(/\/+$/, '') || '/index.html';
    headerEl.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const path = href.replace(/\/+$/, '');
      // treat / and /index.html as same
      const isHome = (here === '/' || here === '/index.html') && (path === '/index.html' || path === '/');
      if (isHome || (path !== '/' && here === path)) {
        a.classList.add('is-active');
      }
    });

  } catch (err) {
    // Fail silently; page still works without header
    console.warn('[header-loader] ', err);
  }
})();
