#!/usr/bin/env node
/**
 * Generate SQL import file from product catalog
 */

const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../product-catalog.json');
const products = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

console.log('🚀 Generating SQL import file');
console.log('================================\n');

let sql = `-- CyberSmrt Product Catalog Import
-- Generated: ${new Date().toISOString()}
-- Products: ${products.length}

`;

for (const product of products) {
  console.log(`📦 Processing: ${product.title}`);

  // Escape single quotes and clean description
  const title = product.title.replace(/'/g, "''");
  const description = (product.description || '')
    .replace(/'/g, "''")
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);

  // Store images_by_color for frontend carousel functionality
  const imagesData = product.images_by_color || {};
  const images = JSON.stringify(imagesData).replace(/'/g, "''");
  const variants = JSON.stringify(product.variants).replace(/'/g, "''");

  sql += `
-- ${product.title}
INSERT INTO products (
  id, printify_blueprint_id, printify_print_provider_id,
  title, description, base_price, markup_price, images, variants, is_active
) VALUES (
  '${product.id}',
  ${product.printify_blueprint_id || 'NULL'},
  99,
  '${title}',
  '${description}',
  ${product.price},
  ${product.price},
  '${images}',
  '${variants}',
  1
) ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  markup_price = excluded.markup_price,
  images = excluded.images,
  variants = excluded.variants,
  updated_at = CURRENT_TIMESTAMP;

`;
}

const outputPath = path.join(__dirname, '../import-products.sql');
fs.writeFileSync(outputPath, sql);

console.log(`\n✅ SQL file generated: ${outputPath}`);
console.log('\nTo import:');
console.log('  npx wrangler d1 execute cybersmrt-merch --file=import-products.sql --remote');
console.log('  or use Cloudflare Dashboard D1 console\n');
