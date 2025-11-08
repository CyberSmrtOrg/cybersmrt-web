const fs = require('fs');

// Read the original product
const product = JSON.parse(fs.readFileSync('tshirt-original.json', 'utf-8'));

// Create a minimal payload with only variants
const updatePayload = {
  variants: product.variants.map(variant => {
    const title = variant.title.toLowerCase();
    let price;

    if (title.includes('5xl') || title.includes('4xl')) {
      price = 4000; // $40
    } else if (title.includes('3xl')) {
      price = 3500; // $35
    } else {
      price = 3000; // $30
    }

    return {
      id: variant.id,
      price: price,
      is_enabled: variant.is_enabled
    };
  })
};

// Write the minimal update payload
fs.writeFileSync('tshirt-variants-update.json', JSON.stringify(updatePayload, null, 2));

console.log('✅ Created minimal variants-only update payload');
console.log(`📊 Total variants: ${updatePayload.variants.length}`);
console.log('\nSample pricing (first 5):');
updatePayload.variants.slice(0, 5).forEach(v => {
  const original = product.variants.find(ov => ov.id === v.id);
  console.log(`  ${original.title}: $${(v.price / 100).toFixed(2)}`);
});
