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

const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImY5OTBiMzI4YTk1YjVlZTA0MzQzODA3NmJkMTUxY2IyZTA2NmEyOTEzODY2NzQ1MjQ2ZDBmMTc4ZWU2MmM5M2ZlYmJmZDgxZmEwOTI5MGQ1IiwiaWF0IjoxNzYyNTU2MjUxLjU4OTc0NSwibmJmIjoxNzYyNTU2MjUxLjU4OTc0NywiZXhwIjoxNzk0MDkyMjUxLjU3MDExOCwic3ViIjoiMjUyNTU3MTkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.sHLngjJ1A6aAkK27ggbJ3wobBU_5r8TFSW9ndCpWUW4pKEhffuGcnukfSNz2tr0axE98sSkGMFG7_H7gJrW6I5M1djNZnhL6XTpWxddAYvwW9gsCgsIMrdmDD6TP4w9CrG7PrfdtrHy4Ubj3XmlwzkjWEvbwK8ZqOGLaUBK6Hs7nlqZ1isf70Wl6IbMUVDpQmaeaX-Iul-SrzhNkoxVBceLmvLlM3PylViRMq79XvzSDMV5DPerR6Aw9xFYq8rblZk87_b-l8wvLyDUPFT7Z2JDJ8iFgGLLSV00C1ZKCe6_ItVgq2PTRLLtb0EXMxJInU9CV0wA270606e8fdet1vbnGLJj-E9N-NjuwTApyZ7Iw0Tdggl5gc7jQWaPbuWZAZmUaKToEDmTrlU7UHieexyntxYImGcwrJD5j_Vk2FgueWDKvZf_woTLlVbUAVY5Z16_t1sJ1UIzaISuOjrKMG2oz0AZA7URI3KcNzcmrjFXv_7Pg1_y6PXGy20-pQbklaK7RvF0qTaX7JHcGEJhIK3WvSd0CYShJUn3fjCI3Q089ueLybJw2UtGW-vFwLgW82UaJ64iSdAYLjoER8L0LhTEXELZpQOyv9yZKH7kS8tMC8-V0k1NJFFwapU37B8Hr_qDCehAJKPmH4Dky9osTie_e9eQrTdqgvpKqijUoH6o';
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID || '25132762';
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
