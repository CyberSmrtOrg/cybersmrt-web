const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../product-catalog.json');
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const shirt = data.find(p => p.title.includes('Incident Response Plan'));
const lines = shirt.description.split('\n');

console.log('All lines with lengths:');
lines.forEach((line, i) => {
  console.log(`Line ${i} (${line.length} chars): "${line.substring(0, 100)}"`);
});

console.log('\n\nProblematic lines (containing "My incident" or similar):');
lines.forEach((line, i) => {
  if (line.includes('panel') || line.includes('My incident') || line.includes('comic')) {
    console.log(`Line ${i} (${line.length} chars): "${line}"`);
  }
});
