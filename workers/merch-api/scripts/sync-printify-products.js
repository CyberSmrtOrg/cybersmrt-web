#!/usr/bin/env node
/**
 * Printify Product Sync Script
 *
 * This script:
 * 1. Fetches all products from Printify
 * 2. Downloads product mockup images
 * 3. Syncs product data to D1 database
 * 4. Optionally calls publishing_failed for products
 *
 * Usage:
 *   node sync-printify-products.js
 *   node sync-printify-products.js --unpublish 690a3876af1cb82d8d09e50b,<id2>,<id3>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const PRINTIFY_API_TOKEN = process.env.PRINTIFY_API_TOKEN;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const API_BASE = 'https://api.printify.com/v1';

// Command line arguments
const args = process.argv.slice(2);
const unpublishFlag = args.find(arg => arg.startsWith('--unpublish'));
const unpublishIds = unpublishFlag ? unpublishFlag.split('=')[1]?.split(',') : [];

/**
 * Make API request to Printify
 */
async function printifyRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${PRINTIFY_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

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
 * Call publishing_failed for a product
 */
async function unpublishProduct(productId) {
  console.log(`📤 Calling publishing_failed for product ${productId}...`);

  try {
    const result = await printifyRequest(
      `/shops/${PRINTIFY_SHOP_ID}/products/${productId}/publishing_failed.json`,
      'POST',
      { reason: 'Manual unpublish for custom workflow' }
    );
    console.log(`✅ Successfully unpublished ${productId}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to unpublish ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all products from Printify
 */
async function fetchProducts() {
  console.log('📥 Fetching products from Printify...');

  const response = await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/products.json`);
  const products = response.data || [];

  console.log(`✅ Found ${products.length} products`);
  return products;
}

/**
 * Get detailed product information
 */
async function fetchProductDetails(productId) {
  console.log(`📥 Fetching details for product ${productId}...`);
  return await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`);
}

/**
 * Process product and download mockups
 */
async function processProduct(product) {
  console.log(`\n🔄 Processing: ${product.title}`);
  console.log(`   ID: ${product.id}`);

  // Create images directory if it doesn't exist
  const imagesDir = path.join(__dirname, '../../../assets/images/merch');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Get full product details
  const details = await fetchProductDetails(product.id);

  // Download primary mockup image
  const images = details.images || [];
  const primaryImage = images.find(img => img.is_default) || images[0];

  if (primaryImage) {
    const filename = `${product.id}.jpg`;
    const filepath = path.join(imagesDir, filename);

    console.log(`   📸 Downloading mockup: ${primaryImage.src}`);
    await downloadImage(primaryImage.src, filepath);
    console.log(`   ✅ Saved to: ${filepath}`);
  }

  // Extract variant information
  const variants = details.variants?.filter(v => v.is_enabled) || [];

  // Prepare product data for database
  const productData = {
    id: details.id,
    title: details.title,
    description: cleanDescription(details.description),
    price: variants[0]?.price || 0,
    category: detectCategory(details.title, details.tags),
    image_url: primaryImage ? `/assets/images/merch/${product.id}.jpg` : null,
    printify_blueprint_id: details.blueprint_id,
    printify_product_id: details.id,
    variants: variants.map(v => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      size: extractSize(v.title),
      color: extractColor(v.title),
      is_available: v.is_available
    })),
    tags: details.tags || [],
    created_at: new Date().toISOString()
  };

  console.log(`   💾 Prepared data for DB sync`);
  console.log(`   📦 Variants: ${variants.length}`);

  return productData;
}

/**
 * Clean product description - strip HTML and extract meaningful text
 */
function cleanDescription(description) {
  if (!description) return '';

  // Strip all HTML tags
  let cleaned = description.replace(/<[^>]*>/g, ' ');

  // Remove extra whitespace and newlines
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Try to extract the actual product description (usually after size table data)
  // Look for common description patterns
  const descMatch = cleaned.match(/(?:This|Made from|Features|Perfect for|Ideal for)[^.]+\./);
  if (descMatch) {
    // Found a sentence-like description, extract from there to end
    const startIdx = cleaned.indexOf(descMatch[0]);
    cleaned = cleaned.substring(startIdx);
  }

  // Limit to reasonable length (first 500 chars of actual description)
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500) + '...';
  }

  return cleaned;
}

/**
 * Detect product category from title and tags
 */
function detectCategory(title, tags = []) {
  const titleLower = title.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();

  if (titleLower.includes('shirt') || titleLower.includes('tee') || titleLower.includes('tank')) {
    return 'apparel';
  }
  if (titleLower.includes('hat') || titleLower.includes('cap')) {
    return 'accessories';
  }
  if (titleLower.includes('mug') || titleLower.includes('bottle')) {
    return 'accessories';
  }
  if (titleLower.includes('sticker')) {
    return 'stickers';
  }
  if (allTags.includes('tech')) {
    return 'tech';
  }

  return 'apparel'; // default
}

/**
 * Extract size from variant title
 * Format: "Color / Size" or just "Size"
 */
function extractSize(title) {
  const parts = title.split('/').map(p => p.trim());

  // If there's a /, size is the second part
  if (parts.length > 1) {
    const sizeMatch = parts[1].match(/\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i);
    return sizeMatch ? sizeMatch[1].toUpperCase() : parts[1];
  }

  // Otherwise try to match size in the whole title
  const sizeMatch = title.match(/\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i);
  return sizeMatch ? sizeMatch[1].toUpperCase() : null;
}

/**
 * Extract color from variant title
 * Format: "Color / Size" - color comes BEFORE the /
 */
function extractColor(title) {
  const parts = title.split('/').map(p => p.trim());

  // If there's a /, color is the first part
  if (parts.length > 1) {
    return parts[0];
  }

  // If no /, might just be a size (no color variant)
  return null;
}

/**
 * Save product data to JSON file (for now, until we integrate with D1)
 */
function saveProductData(products) {
  const outputPath = path.join(__dirname, '../product-catalog.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`\n💾 Product catalog saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 CyberSmrt Printify Product Sync');
  console.log('=====================================\n');

  try {
    // Step 1: Unpublish products if requested
    if (unpublishIds.length > 0) {
      console.log(`📤 Unpublishing ${unpublishIds.length} products...`);
      for (const productId of unpublishIds) {
        await unpublishProduct(productId.trim());
      }
      console.log('');
    }

    // Step 2: Fetch all products
    const products = await fetchProducts();

    // Step 3: Process each product
    const processedProducts = [];
    for (const product of products) {
      try {
        const processed = await processProduct(product);
        processedProducts.push(processed);
      } catch (error) {
        console.error(`❌ Error processing ${product.id}:`, error.message);
      }
    }

    // Step 4: Save product data
    saveProductData(processedProducts);

    console.log('\n✅ Sync complete!');
    console.log(`   Products processed: ${processedProducts.length}`);
    console.log(`   Images downloaded: ${processedProducts.filter(p => p.image_url).length}`);

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchProducts, processProduct, unpublishProduct };
