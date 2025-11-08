const fs = require('fs');

const data = JSON.parse(fs.readFileSync('check-products.json', 'utf-8'));

console.log('Total products:', data.products.length);

data.products.forEach(p => {
  console.log('\n' + p.title);
  console.log('  Has images field:', typeof p.images !== 'undefined');

  if (p.images) {
    const keys = Object.keys(p.images);
    console.log('  Image variants:', keys.length);
    console.log('  First variant:', keys[0]);

    if (p.images[keys[0]]) {
      console.log('  First image:', p.images[keys[0]][0]);
    }
  }
});
