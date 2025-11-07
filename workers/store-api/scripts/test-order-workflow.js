/**
 * Test Order Workflow - End-to-End Testing
 *
 * This script helps test the complete order workflow:
 * 1. Stripe checkout (test mode)
 * 2. Order creation in database
 * 3. Printify order submission
 * 4. Webhook events (shipped, delivered)
 * 5. Email notifications
 *
 * Usage:
 *   node scripts/test-order-workflow.js [command]
 *
 * Commands:
 *   test-webhook-shipped   - Simulate a "shipped" webhook from Printify
 *   test-webhook-delivered - Simulate a "delivered" webhook from Printify
 *   list-orders           - List recent orders from database
 *   test-email            - Test email sending directly
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://store.cybersmrt.org/webhooks/printify';
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImY5OTBiMzI4YTk1YjVlZTA0MzQzODA3NmJkMTUxY2IyZTA2NmEyOTEzODY2NzQ1MjQ2ZDBmMTc4ZWU2MmM5M2ZlYmJmZDgxZmEwOTI5MGQ1IiwiaWF0IjoxNzYyNTU2MjUxLjU4OTc0NSwibmJmIjoxNzYyNTU2MjUxLjU4OTc0NywiZXhwIjoxNzk0MDkyMjUxLjU3MDExOCwic3ViIjoiMjUyNTU3MTkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.sHLngjJ1A6aAkK27ggbJ3wobBU_5r8TFSW9ndCpWUW4pKEhffuGcnukfSNz2tr0axE98sSkGMFG7_H7gJrW6I5M1djNZnhL6XTpWxddAYvwW9gsCgsIMrdmDD6TP4w9CrG7PrfdtrHy4Ubj3XmlwzkjWEvbwK8ZqOGLaUBK6Hs7nlqZ1isf70Wl6IbMUVDpQmaeaX-Iul-SrzhNkoxVBceLmvLlM3PylViRMq79XvzSDMV5DPerR6Aw9xFYq8rblZk87_b-l8wvLyDUPFT7Z2JDJ8iFgGLLSV00C1ZKCe6_ItVgq2PTRLLtb0EXMxJInU9CV0wA270606e8fdet1vbnGLJj-E9N-NjuwTApyZ7Iw0Tdggl5gc7jQWaPbuWZAZmUaKToEDmTrlU7UHieexyntxYImGcwrJD5j_Vk2FgueWDKvZf_woTLlVbUAVY5Z16_t1sJ1UIzaISuOjrKMG2oz0AZA7URI3KcNzcmrjFXv_7Pg1_y6PXGy20-pQbklaK7RvF0qTaX7JHcGEJhIK3WvSd0CYShJUn3fjCI3Q089ueLybJw2UtGW-vFwLgW82UaJ64iSdAYLjoER8L0LhTEXELZpQOyv9yZKH7kS8tMC8-V0k1NJFFwapU37B8Hr_qDCehAJKPmH4Dky9osTie_e9eQrTdqgvpKqijUoH6o';
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID || '25132762';

// ==============================================
// TEST: Simulate "Order Shipped" webhook
// ==============================================
async function testShippedWebhook() {
  console.log('🧪 Testing "Order Shipped" Webhook...\n');

  // You'll need to get a real Printify order ID from your database
  const printifyOrderId = process.argv[3];

  if (!printifyOrderId) {
    console.error('❌ Please provide a Printify order ID as the second argument');
    console.error('   Example: node scripts/test-order-workflow.js test-webhook-shipped <printify_order_id>');
    console.error('\n   To get an order ID, run: node scripts/test-order-workflow.js list-orders');
    process.exit(1);
  }

  const shippedEvent = {
    id: `test-${Date.now()}`,
    type: 'order:shipment:created',
    resource: {
      id: printifyOrderId,
      shipments: [{
        tracking_number: 'TEST-1Z999AA10123456784',
        tracking_url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
        carrier: 'UPS',
        created_at: new Date().toISOString()
      }]
    }
  };

  console.log('📦 Simulating shipment event:');
  console.log('   Order ID:', printifyOrderId);
  console.log('   Tracking:', shippedEvent.resource.shipments[0].tracking_number);
  console.log('   Carrier:', shippedEvent.resource.shipments[0].carrier);
  console.log();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shippedEvent)
    });

    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      console.log('   Expected results:');
      console.log('   • Order status updated to "shipped"');
      console.log('   • Tracking info saved to database');
      console.log('   • Email sent to customer with tracking link');
    } else {
      const error = await response.text();
      console.error('❌ Webhook failed:', response.status);
      console.error('   Response:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// ==============================================
// TEST: Simulate "Order Delivered" webhook
// ==============================================
async function testDeliveredWebhook() {
  console.log('🧪 Testing "Order Delivered" Webhook...\n');

  const printifyOrderId = process.argv[3];

  if (!printifyOrderId) {
    console.error('❌ Please provide a Printify order ID as the second argument');
    console.error('   Example: node scripts/test-order-workflow.js test-webhook-delivered <printify_order_id>');
    console.error('\n   To get an order ID, run: node scripts/test-order-workflow.js list-orders');
    process.exit(1);
  }

  const deliveredEvent = {
    id: `test-${Date.now()}`,
    type: 'order:shipment:delivered',
    resource: {
      id: printifyOrderId,
      shipments: [{
        delivered_at: new Date().toISOString(),
        tracking_number: 'TEST-1Z999AA10123456784',
        tracking_url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784'
      }]
    }
  };

  console.log('📬 Simulating delivery event:');
  console.log('   Order ID:', printifyOrderId);
  console.log('   Delivered at:', deliveredEvent.resource.shipments[0].delivered_at);
  console.log();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveredEvent)
    });

    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      console.log('   Expected results:');
      console.log('   • Order status updated to "delivered"');
      console.log('   • Email sent to customer with delivery confirmation');
    } else {
      const error = await response.text();
      console.error('❌ Webhook failed:', response.status);
      console.error('   Response:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// ==============================================
// LIST: Recent orders from Printify
// ==============================================
async function listOrders() {
  console.log('📋 Fetching recent Printify orders...\n');

  try {
    const response = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/orders.json`, {
      headers: {
        'Authorization': `Bearer ${PRINTIFY_API_KEY}`
      }
    });

    if (response.ok) {
      const orders = await response.json();

      if (orders.data && orders.data.length > 0) {
        console.log(`Found ${orders.data.length} order(s):\n`);

        orders.data.slice(0, 10).forEach((order, index) => {
          console.log(`${index + 1}. Order ID: ${order.id}`);
          console.log(`   Status: ${order.status}`);
          console.log(`   Metadata Label: ${order.metadata?.order_label || 'N/A'}`);
          console.log(`   Created: ${order.created_at}`);

          if (order.shipments && order.shipments.length > 0) {
            console.log(`   Tracking: ${order.shipments[0].tracking_number || 'N/A'}`);
          }
          console.log();
        });

        console.log('To test webhooks, use one of these order IDs:');
        console.log(`  node scripts/test-order-workflow.js test-webhook-shipped ${orders.data[0].id}`);
      } else {
        console.log('No orders found in Printify');
        console.log('\nTo create a test order:');
        console.log('1. Go to https://store.cybersmrt.org');
        console.log('2. Use Stripe test card: 4242 4242 4242 4242');
        console.log('3. Complete checkout');
        console.log('4. Wait a few seconds for order to sync to Printify');
        console.log('5. Run this command again to see the order');
      }
    } else {
      const error = await response.text();
      console.error('❌ Failed to fetch orders:', response.status);
      console.error('   Response:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// ==============================================
// TEST: Email notification directly
// ==============================================
async function testEmail() {
  console.log('📧 Testing Email Notification...\n');

  const emailType = process.argv[3] || 'shipped';
  const testEmail = process.argv[4] || 'anthony.rossi1983@gmail.com';

  console.log(`Sending test "${emailType}" email to: ${testEmail}`);
  console.log('Note: This requires RESEND_API_KEY to be set in your environment\n');

  const emailData = {
    orderNumber: 'TEST-' + Date.now(),
    customerName: 'Test Customer',
    trackingNumber: '1Z999AA10123456784',
    trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
    carrier: 'UPS',
    estimatedDelivery: '3-5 business days',
    deliveryTime: new Date().toLocaleString(),
    deliveryLocation: 'Front Porch'
  };

  console.log('Test data:', JSON.stringify(emailData, null, 2));
  console.log('\n⚠️  This is a direct API test - emails must be sent via the worker');
  console.log('Use the webhook test commands instead to test the full flow');
}

// ==============================================
// GUIDE: Complete testing workflow
// ==============================================
function printGuide() {
  console.log('🧪 Complete Order Workflow Testing Guide\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('STEP 1: Create Test Order on Store');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('1. Go to https://store.cybersmrt.org');
  console.log('2. Add products to cart');
  console.log('3. Checkout with Stripe test card:');
  console.log('   • Card: 4242 4242 4242 4242');
  console.log('   • Expiry: Any future date');
  console.log('   • CVC: Any 3 digits');
  console.log('   • ZIP: Any 5 digits');
  console.log('4. Complete checkout');
  console.log('5. Note the order number (CS-XXXXXXXX-XXXXX)\n');

  console.log('STEP 2: Verify Order in Database & Printify');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Run: node scripts/test-order-workflow.js list-orders');
  console.log('This will show all recent Printify orders with their IDs\n');

  console.log('STEP 3: Test "Order Shipped" Webhook');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Run: node scripts/test-order-workflow.js test-webhook-shipped <order_id>');
  console.log('Expected: Order status → "shipped", customer gets tracking email\n');

  console.log('STEP 4: Test "Order Delivered" Webhook');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('Run: node scripts/test-order-workflow.js test-webhook-delivered <order_id>');
  console.log('Expected: Order status → "delivered", customer gets delivery email\n');

  console.log('STEP 5: Verify Results');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('• Check customer email inbox for notifications');
  console.log('• Check https://store.cybersmrt.org/orders (sign in)');
  console.log('• Verify tracking info displays correctly');
  console.log('• Check Cloudflare logs: cd workers/store-api && npx wrangler tail\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Available Commands:');
  console.log('  list-orders              - List recent Printify orders');
  console.log('  test-webhook-shipped     - Simulate shipped webhook');
  console.log('  test-webhook-delivered   - Simulate delivered webhook');
  console.log('  test-email               - Test email sending');
  console.log('  guide                    - Show this guide\n');
}

// ==============================================
// MAIN
// ==============================================
const command = process.argv[2] || 'guide';

switch (command) {
  case 'test-webhook-shipped':
    testShippedWebhook().catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
    break;

  case 'test-webhook-delivered':
    testDeliveredWebhook().catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
    break;

  case 'list-orders':
    listOrders().catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
    break;

  case 'test-email':
    testEmail();
    break;

  case 'guide':
  default:
    printGuide();
    break;
}
