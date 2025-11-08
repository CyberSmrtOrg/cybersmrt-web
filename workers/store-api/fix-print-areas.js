const fs = require('fs');

// Read the updated product
const product = JSON.parse(fs.readFileSync('tshirt-updated.json', 'utf-8'));

// Remove placeholders with empty images arrays from print_areas
product.print_areas = product.print_areas.map(area => {
  return {
    ...area,
    placeholders: area.placeholders.filter(placeholder => {
      // Only keep placeholders that have images
      return placeholder.images && placeholder.images.length > 0;
    })
  };
});

// Write the fixed product
fs.writeFileSync('tshirt-fixed.json', JSON.stringify(product, null, 2));

console.log('✅ Fixed print_areas - removed empty image placeholders');
console.log('\nRemaining placeholders:');
product.print_areas.forEach((area, i) => {
  console.log(`\nPrint Area ${i}:`);
  area.placeholders.forEach(pl => {
    console.log(`  - ${pl.position}: ${pl.images.length} image(s)`);
  });
});
