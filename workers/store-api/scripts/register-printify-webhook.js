/**
 * Register Printify Webhook for Order Status Updates
 *
 * This script registers a webhook with Printify to receive order status notifications.
 *
 * Available Events:
 * - order:created - Order has been created
 * - order:updated - Order details have been updated
 * - order:sent-to-production - Order has been sent to production
 * - order:shipment:created - Shipping label created, order shipped
 * - order:shipment:delivered - Order has been delivered
 *
 * Usage:
 *   node scripts/register-printify-webhook.js
 */

const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImMxNzY3N2YyYjViZWFmOWI1MzU2MWU4N2YwNzUyMGZmZDE4ZGExMjM5YjA3ZjQ0ZmMwYTFmNDhkMjFiYzQ0ODM3NjZmMDFkMTBkNGE1NDc3IiwiaWF0IjoxNzMxMDE4MTg1LjM1MTc1Niwibmf2IjoxNzMxMDE4MTg1LjM1MTc1OX0.ACuGCvQqcA4WYjwxSaG_qEz0m9dWQg_jVT5UcvGp9A43HqY8OqQGfJJk8JFzf84aUEfmcECPyMAm4Nd6dXJE';
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID || '17024115';
const WEBHOOK_URL = 'https://store.cybersmrt.org/webhooks/printify';

async function registerWebhook() {
  console.log('🔔 Registering Printify Webhook...\n');

  // First, list existing webhooks to avoid duplicates
  console.log('📋 Checking existing webhooks...');
  const listResponse = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (listResponse.ok) {
    const existingWebhooks = await listResponse.json();
    console.log(`Found ${existingWebhooks.length} existing webhook(s):\n`);

    existingWebhooks.forEach((webhook, index) => {
      console.log(`Webhook ${index + 1}:`);
      console.log(`  ID: ${webhook.id}`);
      console.log(`  URL: ${webhook.url}`);
      console.log(`  Topic: ${webhook.topic}`);
      console.log(`  Shop ID: ${webhook.shop_id}`);
      console.log('');
    });

    // Check if our webhook already exists
    const existingWebhook = existingWebhooks.find(w => w.url === WEBHOOK_URL);
    if (existingWebhook) {
      console.log('✅ Webhook already registered!');
      console.log(`   ID: ${existingWebhook.id}`);
      console.log(`   Topic: ${existingWebhook.topic}`);
      return;
    }
  } else {
    console.error('⚠️  Failed to list existing webhooks:', listResponse.status, await listResponse.text());
  }

  // Register new webhook for order shipment events
  console.log('\n📝 Registering new webhook...');
  console.log(`   URL: ${WEBHOOK_URL}`);
  console.log(`   Shop ID: ${PRINTIFY_SHOP_ID}\n`);

  const response = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: 'order:shipment:created',
      url: WEBHOOK_URL
    })
  });

  if (response.ok) {
    const webhook = await response.json();
    console.log('✅ Webhook registered successfully!');
    console.log(`   ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Topic: ${webhook.topic}`);
    console.log(`   Shop ID: ${webhook.shop_id}`);

    // Also register delivery webhook
    console.log('\n📝 Registering delivery webhook...');
    const deliveryResponse = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: 'order:shipment:delivered',
        url: WEBHOOK_URL
      })
    });

    if (deliveryResponse.ok) {
      const deliveryWebhook = await deliveryResponse.json();
      console.log('✅ Delivery webhook registered successfully!');
      console.log(`   ID: ${deliveryWebhook.id}`);
      console.log(`   URL: ${deliveryWebhook.url}`);
      console.log(`   Topic: ${deliveryWebhook.topic}`);
      console.log(`   Shop ID: ${deliveryWebhook.shop_id}`);
    } else {
      const errorText = await deliveryResponse.text();
      console.error('❌ Failed to register delivery webhook:', deliveryResponse.status, errorText);
    }

    console.log('\n🎉 Setup complete!');
    console.log('\nYou will now receive webhook notifications for:');
    console.log('  • Order shipped (with tracking info)');
    console.log('  • Order delivered');
    console.log('\nThese will trigger automatic email notifications to customers.');
  } else {
    const errorText = await response.text();
    console.error('❌ Failed to register webhook:', response.status);
    console.error('Response:', errorText);

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.errors) {
        console.error('\nErrors:');
        Object.entries(errorJson.errors).forEach(([field, messages]) => {
          console.error(`  ${field}: ${messages.join(', ')}`);
        });
      }
    } catch (e) {
      // Not JSON, already printed as text
    }
  }
}

// Run the script
registerWebhook().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
