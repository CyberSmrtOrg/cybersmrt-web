// Template builder for admin post HTML
export function buildPostHTML(vars) {
  const {
    title,
    category,
    metaDesc,
    authorAvatar,
    authorName,
    authorTitle,
    displayDate,
    readTime,
    opening,
    contentHTML,
    mediaHTML,
    tablesHTML,
    conclusion,
    tagsHTML,
    tags
  } = vars;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="${metaDesc}">
  <title>${title} - CyberSmrt Blog</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet">

  <style>
    :root{ --fg:#fff; --muted:#b0b0b0; --acc:#667eea; --acc2:#764ba2; --stroke:rgba(255,255,255,.1) }
    *{margin:0;padding:0;box-sizing:border-box}
    body{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;
      background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%); color:var(--fg); line-height:1.7 }
    main{ max-width:900px; margin:60px auto; padding:0 20px }
    article{ background:rgba(255,255,255,.05); border:1px solid var(--stroke); border-radius:20px; backdrop-filter:blur(10px); padding:40px }
    .category{ display:inline-block; background:linear-gradient(135deg,var(--acc),var(--acc2)); color:#fff; padding:6px 16px; border-radius:20px; font-size:.85rem; font-weight:600; margin-bottom:18px }
    h1{ font-size:2.4rem; line-height:1.2; margin-bottom:12px }
    .post-meta{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; color:var(--muted); font-size:.95rem; margin-bottom:24px }
    .author{ display:flex; gap:10px; align-items:center }
    .author-avatar{ font-size:2rem }
    .content h2{ color:var(--acc); font-size:1.6rem; margin:32px 0 14px }
    .content h3{ font-size:1.25rem; margin:22px 0 10px }
    .content p{ margin-bottom:16px; font-size:1.05rem }
    .content ul,.content ol{ padding-left:24px; margin-bottom:16px }
    .image-container,.video-container,.table-container{ margin:24px 0 }
    .image-container img{ width:100%; border-radius:12px }
    .video-container iframe{ border-radius:12px }
    .caption{ text-align:center; color:var(--muted); font-size:.9rem; margin-top:8px }
    table{ width:100%; border-collapse:collapse; margin:16px 0 }
    th,td{ border:1px solid rgba(255,255,255,.2); padding:12px; text-align:left }
    th{ background:rgba(102,126,234,.2) }
    .tags{ display:flex; gap:10px; flex-wrap:wrap; margin:26px 0; padding-top:20px; border-top:1px solid var(--stroke) }
    .tag{ background:linear-gradient(135deg,var(--acc),var(--acc2)); color:#fff; padding:6px 14px; border-radius:20px; font-size:.85rem }
    .share-buttons{ display:flex; gap:12px; flex-wrap:wrap; margin-top:20px }
    .share-btn{ padding:12px 20px; border:1px solid var(--stroke); border-radius:8px; background:rgba(255,255,255,.05); color:#fff; text-decoration:none }
    .share-btn:hover{ background:rgba(102,126,234,.2); border-color:var(--acc) }
  </style>
</head>
<body>
  <!-- Shared header -->
  <div id="header-mount"></div>
  <script defer src="/assets/js/header-loader.js"></script>

  <main>
    <article>
      <span class="category">${category}</span>
      <h1>${title}</h1>

      <div class="post-meta">
        <div class="author">
          <span class="author-avatar">${authorAvatar}</span>
          <div>
            <div><strong>${authorName}</strong></div>
            <div>${authorTitle}</div>
          </div>
        </div>
        <span>•</span>
        <span>${displayDate}</span>
        <span>•</span>
        <span>${readTime} min read</span>
      </div>

      <div class="content">
        ${opening}
        ${contentHTML}
        ${mediaHTML}
        ${tablesHTML}
        ${conclusion}
      </div>

  ${tags && tags.length ? ('<div class="tags">' + tagsHTML + '</div>') : ''}

      <div class="share-buttons">
        <a class="share-btn" data-share="x"        href="#" target="_blank" rel="noopener">Share on X</a>
        <a class="share-btn" data-share="linkedin" href="#" target="_blank" rel="noopener">Share on LinkedIn</a>
        <a class="share-btn" data-share="email"    href="#">Share via Email</a>
      </div>
    </article>
  </main>

  <!-- Shared footer -->
  <div id="footer-mount"></div>
  <script defer src="/assets/js/footer-loader.js"></script>
  <script defer src="/assets/js/footer-init.js"></script>

  <!-- Fill share URLs at runtime -->
  <script>
    (function () {
      var pageUrl   = encodeURIComponent(window.location.href);
      var pageTitle = encodeURIComponent(document.title.replace(' - CyberSmrt Blog',''));

      var x = document.querySelector('[data-share="x"]');
      if (x) x.href = 'https://twitter.com/intent/tweet?text=' + pageTitle + '&url=' + pageUrl;

      var li = document.querySelector('[data-share="linkedin"]');
      if (li) li.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + pageUrl;

      var em = document.querySelector('[data-share="email"]');
      if (em) em.href = 'mailto:?subject=' + pageTitle + '&body=Check out this article: ' + pageUrl;
    })();
  </script>
</body>
</html>`;
}

// Attach to window for legacy pages that expect a global builder
window.buildPostHTML = buildPostHTML;
