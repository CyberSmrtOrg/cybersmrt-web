#!/usr/bin/env node
/**
 * Import products to D1 database via Cloudflare API
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ACCOUNT_ID = '39819a9c82ee4fd1e7bb0522a57ef16c';
const DATABASE_ID = 'b6469b14-e613-44fc-aa9a-75d86c46a911';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ Error: CLOUDFLARE_API_TOKEN environment variable not set');
  process.exit(1);
}

// Read SQL file
const sqlPath = path.join(__dirname, '../import-products.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// Split SQL into individual statements by looking for complete INSERT...ON CONFLICT blocks
const statements = [];
const lines = sqlContent.split('\n');
let currentStatement = [];
let inStatement = false;

for (const line of lines) {
  // Start collecting when we hit an INSERT
  if (line.trim().startsWith('INSERT INTO')) {
    inStatement = true;
    currentStatement = [line];
  } else if (inStatement) {
    currentStatement.push(line);
    // End when we hit the semicolon at the end of ON CONFLICT
    if (line.trim().endsWith(';')) {
      statements.push(currentStatement.join('\n').trim());
      currentStatement = [];
      inStatement = false;
    }
  }
}

console.log('🚀 Starting D1 import via Cloudflare API');
console.log('==========================================\n');
console.log(`📦 Found ${statements.length} SQL statements to execute`);
console.log(`🎯 Target: Database ${DATABASE_ID}\n`);

async function executeSQL(sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql: sql
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function importProducts() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Skip comment-only statements
    if (stmt.startsWith('--')) continue;

    // Extract product name from comment if available
    const commentMatch = stmt.match(/^--\s*(.+)/m);
    const productName = commentMatch ? commentMatch[1] : `Statement ${i + 1}`;

    try {
      console.log(`⏳ Importing: ${productName}...`);

      const result = await executeSQL(stmt);

      if (result.success) {
        successCount++;
        console.log(`✅ Success: ${productName}`);
      } else {
        errorCount++;
        console.error(`❌ Failed: ${productName}`, result.errors);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Error importing ${productName}:`, error.message);
    }
  }

  console.log('\n==========================================');
  console.log('📊 Import Summary');
  console.log('==========================================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📦 Total: ${successCount + errorCount}\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some imports failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All products imported successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Clear KV cache (if applicable)');
    console.log('   2. Test the merch store at https://cybersmrt.org/merch');
    console.log('   3. Verify products load correctly\n');
  }
}

importProducts().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
