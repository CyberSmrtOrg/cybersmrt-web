const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const API_BASE = 'https://api.printful.com';

/**
 * Make API request to Printful
 */
async function printfulRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Download image from URL
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Fetch all products from Printful store
 */
async function fetchProducts() {
  console.log('📥 Fetching products from Printful...');

  const response = await printfulRequest('/store/products');
  const products = response.result || [];

  console.log(`✅ Found ${products.length} products`);
  return products;
}

/**
 * Get detailed product information including variants
 */
async function fetchProductDetails(productId) {
  console.log(`📥 Fetching details for product ${productId}...`);
  const response = await printfulRequest(`/store/products/${productId}`);
  return response.result;
}

/**
 * Extract color from variant name
 */
function extractColor(variantName) {
  // Printful variant names are typically: "Size / Color"
  // e.g., "S / Black" or "3\" × 3\" / White"
  const parts = variantName.split(' / ');
  return parts[parts.length - 1] || 'Default';
}

/**
 * Process product and download mockups
 */
async function processProduct(product) {
  console.log(`\n🔄 Processing: ${product.name}`);
  console.log(`   ID: ${product.id}`);

  // Create images directory if it doesn't exist
  const imagesDir = path.join(__dirname, '../../../assets/images/merch');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Get full product details
  const details = await fetchProductDetails(product.id);

  // Extract sync variants (these have mockup images)
  const variants = details.sync_variants || [];

  // Group by color
  const colorMap = new Map();
  variants.forEach(v => {
    const color = extractColor(v.name);
    if (!colorMap.has(color)) {
      colorMap.set(color, {
        variantId: v.id,
        files: v.files || []
      });
    }
  });

  console.log(`   🎨 Found ${colorMap.size} unique colors`);

  const imagesByColor = {};
  let totalImagesDownloaded = 0;

  for (const [color, data] of colorMap.entries()) {
    // Get mockup files for this variant
    const mockupFiles = data.files.filter(f => f.type === 'preview');

    if (mockupFiles.length === 0) {
      console.log(`   ⚠️  No mockups found for ${color}`);
      continue;
    }

    console.log(`   📸 ${color}: ${mockupFiles.length} mockup(s)`);

    const colorSlug = color.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const colorImagePaths = [];

    for (let i = 0; i < mockupFiles.length; i++) {
      const file = mockupFiles[i];
      const filename = `${product.id}_${colorSlug}_${i + 1}.jpg`;
      const filepath = path.join(imagesDir, filename);

      try {
        await downloadImage(file.preview_url || file.url, filepath);
        colorImagePaths.push(`/assets/images/merch/${filename}`);
        totalImagesDownloaded++;
      } catch (error) {
        console.warn(`   ⚠️  Failed to download ${filename}:`, error.message);
      }
    }

    if (colorImagePaths.length > 0) {
      imagesByColor[color] = colorImagePaths;
    }
  }

  console.log(`   📸 Downloaded ${totalImagesDownloaded} mockup images`);

  // Get first color's first image as default
  const firstColor = Array.from(colorMap.keys())[0];
  const defaultImage = imagesByColor[firstColor]?.[0] || null;

  // Calculate base price and markup
  // Printful prices are in the sync_variants, get the minimum price
  const prices = variants.map(v => parseFloat(v.retail_price || 0));
  const basePrice = Math.min(...prices) * 100; // Convert to cents
  const markupPrice = product.retail_price ? Math.round(parseFloat(product.retail_price) * 100) : basePrice;

  return {
    id: product.id.toString(),
    printful_product_id: product.id,
    title: product.name,
    description: product.name,
    base_price: basePrice,
    markup_price: markupPrice,
    default_image: defaultImage,
    images: imagesByColor,
    variants: variants.map(v => ({
      id: v.id,
      name: v.name,
      price: Math.round(parseFloat(v.retail_price || 0) * 100), // Convert to cents
      is_enabled: true
    })),
    is_active: true
  };
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Starting Printful product sync...\n');

  try {
    // Fetch all products
    const products = await fetchProducts();

    if (products.length === 0) {
      console.log('\n⚠️  No products found in Printful store.');
      console.log('   Please create products in Printful dashboard first:');
      console.log('   https://www.printful.com/dashboard/default/products\n');
      return;
    }

    // Process each product
    const catalog = [];
    for (const product of products) {
      const processedProduct = await processProduct(product);
      catalog.push(processedProduct);
    }

    // Write catalog to file
    const catalogPath = path.join(__dirname, '../product-catalog.json');
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

    console.log(`\n✅ Sync complete!`);
    console.log(`📦 Products synced: ${catalog.length}`);
    console.log(`📝 Catalog written to: ${catalogPath}`);
    console.log('\nNext steps:');
    console.log('  1. Run: node scripts/generate-import-sql.js');
    console.log('  2. Run: npx wrangler d1 execute cybersmrt-store --file=import-products.sql --remote');
    console.log('  3. Clear KV cache: npx wrangler kv key delete --binding PRODUCT_CACHE "products" --remote');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchProducts, processProduct };
