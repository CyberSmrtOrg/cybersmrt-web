/**
 * Update Printify Webhooks to New Domain
 *
 * This script deletes old webhooks pointing to store.cybersmrt.org
 * and creates new ones pointing to cybersmrt.org/store
 *
 * Usage:
 *   node scripts/update-printify-webhooks.js
 */

const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImY5OTBiMzI4YTk1YjVlZTA0MzQzODA3NmJkMTUxY2IyZTA2NmEyOTEzODY2NzQ1MjQ2ZDBmMTc4ZWU2MmM5M2ZlYmJmZDgxZmEwOTI5MGQ1IiwiaWF0IjoxNzYyNTU2MjUxLjU4OTc0NSwibmJmIjoxNzYyNTU2MjUxLjU4OTc0NywiZXhwIjoxNzk0MDkyMjUxLjU3MDExOCwic3ViIjoiMjUyNTU3MTkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.sHLngjJ1A6aAkK27ggbJ3wobBU_5r8TFSW9ndCpWUW4pKEhffuGcnukfSNz2tr0axE98sSkGMFG7_H7gJrW6I5M1djNZnhL6XTpWxddAYvwW9gsCgsIMrdmDD6TP4w9CrG7PrfdtrHy4Ubj3XmlwzkjWEvbwK8ZqOGLaUBK6Hs7nlqZ1isf70Wl6IbMUVDpQmaeaX-Iul-SrzhNkoxVBceLmvLlM3PylViRMq79XvzSDMV5DPerR6Aw9xFYq8rblZk87_b-l8wvLyDUPFT7Z2JDJ8iFgGLLSV00C1ZKCe6_ItVgq2PTRLLtb0EXMxJInU9CV0wA270606e8fdet1vbnGLJj-E9N-NjuwTApyZ7Iw0Tdggl5gc7jQWaPbuWZAZmUaKToEDmTrlU7UHieexyntxYImGcwrJD5j_Vk2FgueWDKvZf_woTLlVbUAVY5Z16_t1sJ1UIzaISuOjrKMG2oz0AZA7URI3KcNzcmrjFXv_7Pg1_y6PXGy20-pQbklaK7RvF0qTaX7JHcGEJhIK3WvSd0CYShJUn3fjCI3Q089ueLybJw2UtGW-vFwLgW82UaJ64iSdAYLjoER8L0LhTEXELZpQOyv9yZKH7kS8tMC8-V0k1NJFFwapU37B8Hr_qDCehAJKPmH4Dky9osTie_e9eQrTdqgvpKqijUoH6o';
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID || '25132762';
const OLD_WEBHOOK_URL = 'https://store.cybersmrt.org/webhooks/printify';
const NEW_WEBHOOK_URL = 'https://cybersmrt.org/store/webhooks/printify';

async function updateWebhooks() {
  console.log('🔄 Updating Printify Webhooks to New Domain...\n');

  // Step 1: List existing webhooks
  console.log('📋 Fetching existing webhooks...');
  const listResponse = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!listResponse.ok) {
    console.error('❌ Failed to list webhooks:', listResponse.status, await listResponse.text());
    return;
  }

  const existingWebhooks = await listResponse.json();
  console.log(`Found ${existingWebhooks.length} existing webhook(s)\n`);

  // Display all webhooks
  existingWebhooks.forEach((webhook, index) => {
    console.log(`Webhook ${index + 1}:`);
    console.log(`  ID: ${webhook.id}`);
    console.log(`  URL: ${webhook.url}`);
    console.log(`  Topic: ${webhook.topic}`);
    console.log('');
  });

  // Step 2: Delete old webhooks
  const oldWebhooks = existingWebhooks.filter(w => w.url === OLD_WEBHOOK_URL);

  if (oldWebhooks.length === 0) {
    console.log('✅ No old webhooks found to delete\n');
  } else {
    console.log(`🗑️  Deleting ${oldWebhooks.length} old webhook(s)...\n`);

    for (const webhook of oldWebhooks) {
      console.log(`  Deleting webhook ${webhook.id} (${webhook.topic})...`);
      const deleteResponse = await fetch(
        `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks/${webhook.id}.json`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (deleteResponse.ok) {
        console.log(`  ✅ Deleted ${webhook.topic}`);
      } else {
        console.error(`  ❌ Failed to delete ${webhook.id}:`, deleteResponse.status, await deleteResponse.text());
      }
    }
  }

  // Step 3: Check if new webhooks already exist
  const newWebhooks = existingWebhooks.filter(w => w.url === NEW_WEBHOOK_URL);
  const topics = ['order:shipment:created', 'order:shipment:delivered'];
  const existingTopics = newWebhooks.map(w => w.topic);
  const missingTopics = topics.filter(t => !existingTopics.includes(t));

  if (missingTopics.length === 0) {
    console.log('\n✅ All webhooks already configured for new domain!');
    return;
  }

  // Step 4: Create new webhooks
  console.log(`\n📝 Creating ${missingTopics.length} new webhook(s)...\n`);

  for (const topic of missingTopics) {
    console.log(`  Creating webhook for ${topic}...`);
    const createResponse = await fetch(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic,
          url: NEW_WEBHOOK_URL
        })
      }
    );

    if (createResponse.ok) {
      const webhook = await createResponse.json();
      console.log(`  ✅ Created webhook ${webhook.id} for ${topic}`);
    } else {
      const errorText = await createResponse.text();
      console.error(`  ❌ Failed to create webhook:`, createResponse.status, errorText);
    }
  }

  console.log('\n🎉 Webhook migration complete!');
  console.log(`\nNew webhook URL: ${NEW_WEBHOOK_URL}`);
  console.log('\nActive webhooks:');
  console.log('  • order:shipment:created (order shipped with tracking)');
  console.log('  • order:shipment:delivered (order delivered)');
}

// Run the script
updateWebhooks().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
