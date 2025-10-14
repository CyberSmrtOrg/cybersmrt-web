const fs = require('fs');
const path = require('path');

const baseUrl = 'https://cybersmrt.org';

// Configure priority and changefreq based on URL patterns
function getPageConfig(url) {
  // Homepage
  if (url === '/') {
    return { priority: 1.0, changefreq: 'weekly' };
  }

  // Blog index
  if (url === '/pages/blog') {
    return { priority: 0.9, changefreq: 'weekly' };
  }

  // Blog posts
  if (url.includes('/pages/blog/posts/')) {
    return { priority: 0.6, changefreq: 'monthly' };
  }

  // Major sections
  if (url.match(/^\/(pages\/)?(about|programs|get-involved)$/)) {
    return { priority: 0.8, changefreq: 'monthly' };
  }

  // Sub-pages
  if (url.includes('/about/') || url.includes('/programs/') || url.includes('/get-involved/')) {
    return { priority: 0.7, changefreq: 'monthly' };
  }

  // News/Resources
  if (url.includes('/news') || url.includes('/resources')) {
    return { priority: 0.7, changefreq: 'weekly' };
  }

  // Default for any other page
  return { priority: 0.5, changefreq: 'monthly' };
}

// Find all HTML files recursively
function findHtmlFiles(dir, baseDir = dir, excludePaths = []) {
  let results = [];

  // Normalize exclude paths
  const normalizedExcludes = excludePaths.map(p => path.resolve(p));

  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip excluded directories
    if (normalizedExcludes.some(exclude => filePath.startsWith(exclude))) {
      return;
    }

    if (stat && stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(findHtmlFiles(filePath, baseDir, excludePaths));
    } else if (file.endsWith('.html') && !file.startsWith('_') && file !== '404.html') {
      // Convert file path to URL
      let url = filePath
        .replace(baseDir, '')
        .replace(/\\/g, '/')
        .replace(/index\.html$/, '')
        .replace(/\.html$/, '');

      if (!url.startsWith('/')) url = '/' + url;

      // Remove trailing slash except for root
      if (url !== '/' && url.endsWith('/')) {
        url = url.slice(0, -1);
      }

      const config = getPageConfig(url);

      results.push({
        url: url,
        lastmod: stat.mtime.toISOString().split('T')[0],
        priority: config.priority,
        changefreq: config.changefreq
      });
    }
  });

  return results;
}

// Generate sitemap
function generateSitemap() {
  const rootDir = path.join(__dirname, '../..');
  const excludePaths = [
    path.join(rootDir, 'admin'),
    path.join(rootDir, 'functions'),
    path.join(rootDir, 'partials'),
  ];

  // Find all HTML files
  let allPages = [];

  // Scan root for index.html
  if (fs.existsSync(path.join(rootDir, 'index.html'))) {
    const stat = fs.statSync(path.join(rootDir, 'index.html'));
    allPages.push({
      url: '/',
      lastmod: stat.mtime.toISOString().split('T')[0],
      priority: 1.0,
      changefreq: 'weekly'
    });
  }

  // Scan pages directory
  const pagesDir = path.join(rootDir, 'pages');
  if (fs.existsSync(pagesDir)) {
    const pageFiles = findHtmlFiles(pagesDir, rootDir, excludePaths);
    allPages = allPages.concat(pageFiles);
  }

  // Sort by priority (highest first), then by URL
  allPages.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.url.localeCompare(b.url);
  });

  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write sitemap
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');

  console.log(`✅ Generated sitemap.xml with ${allPages.length} URLs`);
  console.log('\nPages by priority:');
  allPages.forEach(page => {
    console.log(`  ${page.priority.toFixed(1)} - ${page.url}`);
  });
}

try {
  generateSitemap();
} catch (error) {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
}