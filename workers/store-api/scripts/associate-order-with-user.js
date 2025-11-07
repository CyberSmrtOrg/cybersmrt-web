import Stripe from 'stripe';

const sessionId = process.argv[2];
const userEmail = process.argv[3];

if (!sessionId || !userEmail) {
  console.error('❌ Please provide session ID and user email');
  console.log('Usage: node scripts/associate-order-with-user.js <session_id> <user_email>');
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

async function associateOrder() {
  try {
    console.log('\n🔄 Associating order with user profile...');
    console.log('Session:', sessionId);
    console.log('User Email:', userEmail);

    // Initialize Stripe
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });

    // Fetch user ID from auth API
    console.log('\n📡 Looking up user ID...');
    const authResponse = await fetch(`https://api.cybersmrt.org/admin/users/by-email/${encodeURIComponent(userEmail)}`, {
      headers: {
        'Authorization': `Bearer ${env.ADMIN_API_KEY || ''}`
      }
    });

    if (!authResponse.ok) {
      console.log('⚠️  Could not fetch user ID from auth API');
      console.log('Please provide user ID manually as 4th argument');
      process.exit(1);
    }

    const userData = await authResponse.json();
    const userId = userData.user?.id;

    if (!userId) {
      console.error('❌ No user found with email:', userEmail);
      process.exit(1);
    }

    console.log('✅ Found user ID:', userId);

    // Get session details from Stripe
    console.log('\n📡 Fetching session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('✅ Session found');
    console.log('   Amount:', `$${(session.amount_total / 100).toFixed(2)}`);
    console.log('   Status:', session.payment_status);

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `CS-${dateStr}-${randomStr}`;

    console.log('\n📦 Generated order number:', orderNumber);

    // Note: In a real implementation, you would insert this into the D1 database
    // For now, just output the SQL that should be run

    const lineItems = JSON.parse(session.metadata.items || '[]');

    console.log('\n📝 Order details to insert:');
    console.log({
      orderNumber,
      userId,
      email: session.customer_details.email,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      lineItems,
      total: session.amount_total,
      status: 'processing',
      paymentStatus: 'paid'
    });

    console.log('\n✅ Order is ready to be associated with user profile');
    console.log('\nℹ️  To complete this, run the following wrangler command:');
    console.log(`
npx wrangler d1 execute cybersmrt-store --remote --command "
UPDATE orders
SET user_id = '${userId}'
WHERE stripe_checkout_session_id = '${sessionId}'
"
    `.trim());

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

associateOrder();
