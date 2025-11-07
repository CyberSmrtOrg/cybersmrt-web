/**
 * Query Orders from D1 Database
 *
 * This script helps you query orders from your Cloudflare D1 database
 * to find orders that have printify_order_id set for testing webhooks.
 *
 * Usage:
 *   node scripts/query-orders.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function queryOrders() {
  console.log('📋 Querying orders from D1 database...\n');

  try {
    // Query recent orders with printify_order_id
    const { stdout, stderr } = await execPromise(
      'npx wrangler d1 execute cybersmrt-store --command "SELECT id, order_number, printify_order_id, customer_email, customer_name, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10"',
      { cwd: '.' }
    );

    if (stderr && !stderr.includes('Executing')) {
      console.error('Error:', stderr);
      return;
    }

    console.log(stdout);

    console.log('\n💡 To test webhooks:');
    console.log('1. Find an order with a printify_order_id from the list above');
    console.log('2. Run: node scripts/test-order-workflow.js test-webhook-shipped <printify_order_id>');
    console.log('\nOr create a new test order:');
    console.log('1. Go to https://store.cybersmrt.org');
    console.log('2. Add items to cart');
    console.log('3. Checkout with test card: 4242 4242 4242 4242');
    console.log('4. Wait 10-15 seconds for Printify sync');
    console.log('5. Run this script again to see the new order with printify_order_id');

  } catch (error) {
    console.error('Failed to query database:', error.message);
  }
}

queryOrders();
