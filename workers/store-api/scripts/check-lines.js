const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../product-catalog.json');
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const hoodie = data.find(p => p.title.includes('Trust No One') && p.title.includes('Hoodie'));
const lines = hoodie.description.split('\n');

console.log('Lines containing Trust/Encrypt/rm:');
lines.forEach((line, i) => {
  if (line.includes('Trust No One') || line.includes('Encrypt') || line.includes('rm -rf')) {
    console.log(`Line ${i}: "${line}"`);
  }
});
