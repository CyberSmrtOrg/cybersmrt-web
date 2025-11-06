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
  let products = response.data || [];

  // Use "Copy of CyberSmrt Logo T-Shirt" for correct mockup selection
  // but keep original T-Shirt ID for database consistency
  products = products.filter(p => p.id !== '690bf241c66e799d2a0647ca'); // Remove Copy product from normal flow

  // Replace original T-Shirt with Copy product (which has correct mockups)
  const tshirtIndex = products.findIndex(p => p.id === '690a2bd79473e932c707f2df');
  if (tshirtIndex !== -1) {
    products[tshirtIndex] = { ...products[tshirtIndex], _useCopyMockups: true };
  }

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

  // Get full product details - use Copy product for T-Shirt mockups
  const fetchId = product._useCopyMockups ? '690bf241c66e799d2a0647ca' : product.id;
  if (product._useCopyMockups) {
    console.log(`   📸 Using mockups from "Copy of CyberSmrt Logo T-Shirt"`);
  }
  const details = await fetchProductDetails(fetchId);

  // Extract variant information
  const variants = details.variants?.filter(v => v.is_enabled) || [];

  // Group variants by color to get unique colors
  const colorMap = new Map();
  variants.forEach(v => {
    const color = extractColor(v.title);
    if (color && !colorMap.has(color)) {
      colorMap.set(color, v.id);
    }
  });

  console.log(`   🎨 Found ${colorMap.size} unique colors`);

  // Group images by mockup type (camera label)
  // Only use images that are selected for publishing (is_selected_for_publishing: true)
  const images = details.images || [];
  const imagesByColor = {};
  let totalImagesDownloaded = 0;

  // First, filter to only selected images
  const selectedImages = images.filter(img => img.is_selected_for_publishing === true);
  console.log(`   📷 Found ${selectedImages.length} selected mockup images`);

  // Identify unique mockup types from the selected images
  const mockupTypes = new Set();
  selectedImages.forEach(img => {
    const camera = img.src.match(/camera_label=([^&]*)/)?.[1] || 'default';
    mockupTypes.add(camera);
  });
  const mockupTypesList = Array.from(mockupTypes);
  console.log(`   📷 Selected mockup types: ${mockupTypesList.join(', ')}`);

  for (const [color, variantId] of colorMap.entries()) {
    // For each color, find one image of each selected mockup type
    const colorImages = [];

    for (const mockupType of mockupTypesList) {
      // Find a selected image with this mockup type that includes this variant ID
      const matchingImage = selectedImages.find(img => {
        const camera = img.src.match(/camera_label=([^&]*)/)?.[1] || 'default';
        const hasVariant = img.variant_ids && img.variant_ids.includes(variantId);
        return camera === mockupType && hasVariant;
      });

      if (matchingImage) {
        colorImages.push(matchingImage);
      }
    }

    console.log(`   📸 ${color}: found ${colorImages.length} selected mockup types`);

    if (colorImages.length === 0) continue;

    // Sanitize color name for filename (remove invalid characters)
    const colorSlug = color.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '');     // Remove leading/trailing dashes
    const colorImagePaths = [];

    for (let i = 0; i < colorImages.length; i++) {
      const img = colorImages[i];
      const filename = `${product.id}_${colorSlug}_${i + 1}.jpg`;
      const filepath = path.join(imagesDir, filename);

      try {
        await downloadImage(img.src, filepath);
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

  // Get first color's first image as the default
  const firstColor = Array.from(colorMap.keys())[0];
  const defaultImage = imagesByColor[firstColor]?.[0] || null;

  // Prepare product data for database
  // Use original product ID/title if this is the Copy product
  const originalId = product.id; // This will be the original T-Shirt ID
  const originalTitle = product.title; // This will be "CyberSmrt Logo T-Shirt"

  const productData = {
    id: originalId,
    title: originalTitle,
    description: cleanDescription(details.description),
    price: variants[0]?.price || 0,
    category: detectCategory(originalTitle, details.tags),
    image_url: defaultImage,
    images_by_color: imagesByColor, // NEW: Images organized by color
    printify_blueprint_id: details.blueprint_id,
    printify_product_id: originalId,
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
 * Handles both formats: "Color / Size" and "Size / Color"
 */
function extractSize(title) {
  const sizePattern = /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i;
  const sizeMatch = title.match(sizePattern);
  return sizeMatch ? sizeMatch[1].toUpperCase() : null;
}

/**
 * Extract color from variant title
 * Handles both formats: "Color / Size" and "Size / Color"
 */
function extractColor(title) {
  const parts = title.split('/').map(p => p.trim());

  if (parts.length !== 2) {
    return null; // No color variant
  }

  // Check which part is the size
  const sizePattern = /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i;

  if (sizePattern.test(parts[0])) {
    // Format: "Size / Color" - color is second part
    return parts[1];
  } else {
    // Format: "Color / Size" - color is first part
    return parts[0];
  }
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
