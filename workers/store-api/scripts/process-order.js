/**
 * Manually process an existing order
 * Usage: node scripts/process-order.js <session_id>
 */

import Stripe from 'stripe';
import { createEmailService } from '../../shared/email-service.js';

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('❌ Please provide a session ID');
  console.log('Usage: node scripts/process-order.js <session_id>');
  process.exit(1);
}

// Load environment variables from .dev.vars if available
let env = {};
try {
  const fs = await import('fs');
  const content = fs.readFileSync('.dev.vars', 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.log('ℹ️  No .dev.vars file found, using environment variables');
  env = process.env;
}

async function processOrder() {
  try {
    console.log('\n🔄 Processing order for session:', sessionId);

    // Initialize Stripe
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });

    // Get session details from Stripe
    console.log('📡 Fetching session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('✅ Session found:');
    console.log('   Customer:', session.customer_details?.email);
    console.log('   Amount:', `$${(session.amount_total / 100).toFixed(2)}`);
    console.log('   Status:', session.payment_status);

    if (session.payment_status !== 'paid') {
      console.error('❌ Session payment status is not "paid":', session.payment_status);
      process.exit(1);
    }

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `CS-${dateStr}-${randomStr}`;

    console.log('📦 Generated order number:', orderNumber);

    // Format shipping address for email
    const shippingAddress = [
      session.customer_details?.name,
      session.shipping_details?.address?.line1,
      session.shipping_details?.address?.line2,
      `${session.shipping_details?.address?.city}, ${session.shipping_details?.address?.state} ${session.shipping_details?.address?.postal_code}`,
      session.shipping_details?.address?.country
    ].filter(Boolean).join('\n');

    // Fetch actual line items from Stripe with product details
    console.log('📦 Fetching line items from Stripe...');
    const stripeLineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      expand: ['data.price.product']
    });

    // Build items array from actual Stripe line items
    const items = stripeLineItems.data.map((lineItem) => {
      // Get variant description from product (e.g., "Black XL")
      const variantDescription = lineItem.price?.product?.description || '';

      return {
        title: lineItem.description,
        variant: variantDescription,
        quantity: lineItem.quantity,
        price: lineItem.amount_total
      };
    });

    console.log('✅ Found line items:', items.map(i => `${i.title} (${i.variant})`).join(', '));

    // Send order confirmation email
    console.log('\n📧 Sending order confirmation email...');
    const emailService = createEmailService(env);

    await emailService.send('orderConfirmation', session.customer_details.email, {
      orderNumber,
      customerName: session.customer_details.name,
      orderDate: new Date().toLocaleDateString(),
      total: session.amount_total,
      shippingAddress,
      items
    });

    console.log('✅ Order confirmation email sent to:', session.customer_details.email);

    console.log('\n✨ Order processed successfully!');
    console.log('   Order Number:', orderNumber);
    console.log('   Customer Email:', session.customer_details.email);
    console.log('   Total:', `$${(session.amount_total / 100).toFixed(2)}`);
    console.log('\nℹ️  Note: This order has NOT been submitted to Printify automatically.');
    console.log('   You will need to manually create the order in your Printify dashboard.');

  } catch (error) {
    console.error('\n❌ Error processing order:', error.message);
    console.error(error);
    process.exit(1);
  }
}

processOrder();
