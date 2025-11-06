const data = require('./copy-tshirt.json');

console.log('Total images:', data.images.length);
console.log('\nAll mockup types:');

data.images.forEach((img, i) => {
  const camera = img.src.match(/camera_label=([^&]*)/)?.[1] || 'none';
  console.log(`${i+1}. position="${img.position}" camera="${camera}" variants=${img.variant_ids?.length || 0}`);
});
