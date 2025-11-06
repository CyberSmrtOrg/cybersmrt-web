#!/usr/bin/env node
/**
 * Export clean JSON of all Printify products
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const PRINTIFY_API_TOKEN = process.env.PRINTIFY_API_TOKEN;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;

async function fetchProducts() {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json`);

    const options = {
      headers: {
        'Authorization': `Bearer ${PRINTIFY_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
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
    }).on('error', reject);
  });
}

async function main() {
  console.log('📥 Fetching products from Printify...');

  const response = await fetchProducts();
  const outputPath = path.join(__dirname, '../../../printify-products-clean.json');

  fs.writeFileSync(outputPath, JSON.stringify(response, null, 2));

  console.log(`✅ Saved to ${outputPath}`);
  console.log(`   Total products: ${response.data?.length || 0}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
