#!/usr/bin/env node
/**
 * Import synced products from JSON to D1 database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const catalogPath = path.join(__dirname, '../product-catalog.json');
const products = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

console.log('🚀 Importing products to D1 database');
console.log('=====================================\n');
console.log(`Found ${products.length} products in catalog\n`);

for (const product of products) {
  console.log(`📦 Importing: ${product.title}`);

  const sql = `
    INSERT INTO products (
      id, printify_blueprint_id, printify_print_provider_id, printify_product_id,
      title, description, base_price, markup_price, images, variants, category, is_active
    ) VALUES (
      '${product.id}',
      ${product.printify_blueprint_id || 'NULL'},
      NULL,
      '${product.printify_product_id}',
      '${product.title.replace(/'/g, "''")}',
      '${(product.description || '').replace(/'/g, "''").substring(0, 500)}',
      ${product.price},
      ${product.price},
      '${JSON.stringify([{ src: product.image_url, is_default: true }]).replace(/'/g, "''")}',
      '${JSON.stringify(product.variants).replace(/'/g, "''")}',
      '${product.category}',
      1
    ) ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      markup_price = excluded.markup_price,
      images = excluded.images,
      variants = excluded.variants,
      category = excluded.category,
      updated_at = CURRENT_TIMESTAMP;
  `;

  try {
    execSync(
      `npx wrangler d1 execute cybersmrt-merch --command="${sql.replace(/"/g, '\\"')}"`,
      { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
    );
    console.log(`   ✅ Imported\n`);
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
  }
}

console.log('✅ Import complete!');
