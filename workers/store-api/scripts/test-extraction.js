function extractSize(title) {
  const parts = title.split('/').map(p => p.trim());
  const dimensionPattern = /^(\d+[""″]\s*[\u00D7×x]\s*\d+[""″]|\d+oz)$/i;
  for (const part of parts) {
    if (dimensionPattern.test(part)) {
      return part;
    }
  }
  const sizePattern = /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i;
  for (const part of parts) {
    const sizeMatch = part.match(sizePattern);
    if (sizeMatch) {
      return sizeMatch[1].toUpperCase();
    }
  }
  return null;
}

function extractColor(title) {
  const parts = title.split('/').map(p => p.trim());
  if (parts.length !== 2) return null;
  const dimensionPattern = /^(\d+[""″]\s*[\u00D7×x]\s*\d+[""″]|\d+oz)$/i;
  const clothingSizePattern = /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i;
  if (dimensionPattern.test(parts[0]) || clothingSizePattern.test(parts[0])) {
    return parts[1];
  } else if (dimensionPattern.test(parts[1]) || clothingSizePattern.test(parts[1])) {
    return parts[0];
  }
  return null;
}

const tests = [
  '3" × 3" / White',
  'Black / L',
  'M / Navy',
  'Black'
];

tests.forEach(t => {
  console.log('Title:', t);
  console.log('  Size:', extractSize(t));
  console.log('  Color:', extractColor(t));
  console.log();
});
