const fs = require('fs');
const path = require('path');

// Parse HTML to extract metadata
function parsePostMetadata(htmlContent, filename) {
  const titleMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const categoryMatch = htmlContent.match(/<span class="category"[^>]*>(.*?)<\/span>/i);
  const dateMatch = htmlContent.match(/📅\s*([A-Za-z]+\s+\d+,\s+\d+)/);
  const readTimeMatch = htmlContent.match(/⏱️\s*(\d+)\s*min read/);
  const excerptMatch = htmlContent.match(/<p class="post-excerpt"[^>]*>(.*?)<\/p>/is);

  const slug = filename.replace('.html', '');

  return {
    title: titleMatch ? titleMatch[1].trim() : slug,
    slug: slug,
    url: `/pages/blog/posts/${slug}`,
    date: dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: categoryMatch ? categoryMatch[1].trim() : 'Uncategorized',
    excerpt: excerptMatch ? excerptMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 200) : '',
    readTime: readTimeMatch ? parseInt(readTimeMatch[1]) : 5,
    status: 'published'
  };
}

// Main function
function updateBlogData() {
  const postsDir = path.join(__dirname, '../../pages/blog/posts');
  const blogDataPath = path.join(__dirname, '../../blog-data.json');

  // Read all HTML files in posts directory
  const files = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.html') && !file.startsWith('_'));

  // Parse each file
  const posts = files.map(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    return parsePostMetadata(content, file);
  });

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Update blog-data.json
  const blogData = {
    posts: posts,
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(blogDataPath, JSON.stringify(blogData, null, 2), 'utf8');
  console.log(`✅ Updated blog-data.json with ${posts.length} posts`);
}

updateBlogData();