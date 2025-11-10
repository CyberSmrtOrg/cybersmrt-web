const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../product-catalog.json');
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const polo = data.find(p => p.title.includes('Polo'));
const lines = polo.description.split('\n');

console.log('Total lines:', lines.length);
console.log('\nSample lines:');
lines.forEach((line, i) => {
  if (i < 5 || line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
    console.log(`Line ${i}: "${line.substring(0, 100)}"`);
  }
});

console.log('\nLines with bullets:');
const bulletLines = lines.filter(line => {
  const trimmed = line.trim();
  return trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^[\u2022\u2023\u2043]/);
});
console.log(`Found ${bulletLines.length} bullet lines`);
bulletLines.forEach(line => console.log(`  "${line.substring(0, 80)}"`));
