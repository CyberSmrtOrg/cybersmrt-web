(() => {
  const MOUNT_ID = 'footer-mount';
  const CANDIDATES = ['/partials/footer.html', 'partials/footer.html'];

  function postInit() {
    try {
      // year
      const y = document.getElementById('footer-year');
      if (y) y.textContent = new Date().getFullYear();

      // smooth back-to-top (works even if #top isn't present)
      document.querySelectorAll('.site-footer a.to-top').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    } catch {}
  }

  function inject(html) {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return console.warn('[footer-loader] #footer-mount not found');
    mount.innerHTML = html;
    postInit();
  }

  function injectFallback(reason) {
    console.warn('[footer-loader] fallback footer used:', reason);
    inject(`
      <footer class="site-footer" role="contentinfo" style="background:#0a0a0a;border-top:1px solid #333">
        <div style="max-width:1200px;margin:0 auto;padding:1rem 1rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;color:#cbd5e1">
          <div>© ${new Date().getFullYear()} CyberSmrt • Service-Disabled Veteran-Owned 501(c)(3)</div>
          <nav style="display:flex;gap:1rem">
            <a href="/index.html" style="color:#8ab4ff;text-decoration:none">Home</a>
            <a href="/index.html#programs" style="color:#8ab4ff;text-decoration:none">Programs</a>
            <a href="/blog/index.html" style="color:#8ab4ff;text-decoration:none">Blog</a>
            <a href="/about/index.html" style="color:#8ab4ff;text-decoration:none">About</a>
            <a href="mailto:tony@cybersmrt.org" style="color:#8ab4ff;text-decoration:none">Contact</a>
          </nav>
        </div>
      </footer>
    `);
  }

  async function loadFooter() {
    for (const url of CANDIDATES) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        inject(await res.text());
        return;
      } catch { /* try next */ }
    }
    injectFallback('all fetch attempts failed');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter, { once: true });
  } else {
    loadFooter();
  }
})();
