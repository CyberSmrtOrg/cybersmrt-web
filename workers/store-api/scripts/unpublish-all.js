#!/usr/bin/env node
/**
 * Unpublish all Printify products
 * Calls publishing_failed endpoint for all products in the shop
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const PRINTIFY_API_TOKEN = process.env.PRINTIFY_API_TOKEN;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const API_BASE = 'https://api.printify.com/v1';

function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fetchProducts() {
  console.log('📥 Fetching products...\n');

  const response = await httpsRequest(`${API_BASE}/shops/${PRINTIFY_SHOP_ID}/products.json`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRINTIFY_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.data || [];
}

async function unpublishProduct(productId, title) {
  const url = `${API_BASE}/shops/${PRINTIFY_SHOP_ID}/products/${productId}/publishing_failed.json`;

  try {
    const response = await httpsRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRINTIFY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Using custom merch workflow' })
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${productId}: ${title}`);
      return true;
    } else {
      console.log(`⚠️  ${productId}: ${title} - HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${productId}: ${title} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Unpublishing all Printify products');
  console.log('=========================================\n');

  try {
    const products = await fetchProducts();
    console.log(`Found ${products.length} products\n`);

    let success = 0;
    let failed = 0;

    for (const product of products) {
      const result = await unpublishProduct(product.id, product.title);
      if (result) success++;
      else failed++;

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
