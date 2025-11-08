const fs = require('fs');

// Read the original product
const product = JSON.parse(fs.readFileSync('tshirt-original.json', 'utf-8'));

// Update pricing based on size
product.variants.forEach(variant => {
  const title = variant.title.toLowerCase();

  if (title.includes('5xl') || title.includes('4xl')) {
    variant.price = 4000; // $40
  } else if (title.includes('3xl')) {
    variant.price = 3500; // $35
  } else {
    variant.price = 3000; // $30
  }
});

// Write updated product
fs.writeFileSync('tshirt-updated.json', JSON.stringify(product, null, 2));

// Show pricing summary
console.log('\nPricing Summary:');
console.log('================');
product.variants.forEach(v => {
  console.log(`${v.title.padEnd(30)} $${(v.price / 100).toFixed(2)}`);
});
