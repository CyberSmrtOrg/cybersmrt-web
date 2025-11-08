const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

async function exploreCatalog() {
  const response = await fetch('https://api.printful.com/products', {
    headers: {
      'Authorization': `Bearer ${PRINTFUL_API_KEY}`
    }
  });

  const data = await response.json();
  console.log('Total products in catalog:', data.result.length);

  // Check for Bella+Canvas 3001 (popular t-shirt)
  const bella3001 = data.result.filter(p =>
    p.type.includes('3001') || (p.brand && p.brand.includes('Bella'))
  );
  console.log('\n=== Bella + Canvas T-Shirts ===');
  bella3001.slice(0, 5).forEach(p => {
    console.log(`  ${p.id}: ${p.type}`);
  });

  // Look for Polo shirts
  console.log('\n=== Polo Shirts ===');
  const polos = data.result.filter(p => p.type.includes('Polo'));
  polos.slice(0, 5).forEach(p => {
    console.log(`  ${p.id}: ${p.type}`);
  });
  if (polos.length === 0) console.log('  (None found)');

  // Look for Tank Tops
  console.log('\n=== Tank Tops ===');
  const tanks = data.result.filter(p => p.type.includes('Tank'));
  tanks.slice(0, 5).forEach(p => {
    console.log(`  ${p.id}: ${p.type}`);
  });
  if (tanks.length === 0) console.log('  (None found)');

  // Stickers
  console.log('\n=== Stickers ===');
  const stickers = data.result.filter(p => p.type.toLowerCase().includes('sticker'));
  stickers.slice(0, 5).forEach(p => {
    console.log(`  ${p.id}: ${p.type}`);
  });
}

exploreCatalog().catch(console.error);
