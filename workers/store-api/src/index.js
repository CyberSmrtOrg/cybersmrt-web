import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';

// Store API on dedicated subdomain: store.cybersmrt.org
const app = new Hono({ strict: false });

// CORS for cybersmrt.org
app.use('/*', cors({
  origin: ['https://cybersmrt.org', 'https://www.cybersmrt.org', 'https://store.cybersmrt.org', 'http://localhost:8787'],
  credentials: true,
}));

// ======================
// Stripe & Printify Helpers
// ======================

function getStripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
}

async function printifyRequest(env, endpoint, method = 'GET', body = null) {
  const url = `https://api.printify.com/v1${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Printify API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ======================
// Routes
// ======================

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'cybersmrt-store-api' });
});

// Get all products (catalog)
app.get('/products', async (c) => {
  try {
    const { DB, PRODUCT_CACHE } = c.env;

    // Try cache first (KV)
    const cached = await PRODUCT_CACHE.get('products', 'json');
    if (cached) {
      return c.json({ products: cached, source: 'cache' });
    }

    // Get from D1
    const result = await DB.prepare(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC'
    ).all();

    const products = result.results || [];

    // Parse JSON fields
    const parsedProducts = products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      variants: JSON.parse(p.variants || '[]'),
    }));

    // Cache for 5 minutes
    await PRODUCT_CACHE.put('products', JSON.stringify(parsedProducts), {
      expirationTtl: 300,
    });

    return c.json({ products: parsedProducts, source: 'database' });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// Get single product
app.get('/products/:id', async (c) => {
  try {
    const { DB } = c.env;
    const productId = c.req.param('id');

    const result = await DB.prepare(
      'SELECT * FROM products WHERE id = ? AND is_active = 1'
    ).bind(productId).first();

    if (!result) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const product = {
      ...result,
      images: JSON.parse(result.images || '[]'),
      variants: JSON.parse(result.variants || '[]'),
    };

    return c.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

// Get Printify catalog (for admin/setup)
app.get('/printify/blueprints', async (c) => {
  try {
    const blueprints = await printifyRequest(c.env, '/catalog/blueprints.json');
    return c.json({ blueprints });
  } catch (error) {
    console.error('Error fetching Printify blueprints:', error);
    return c.json({ error: 'Failed to fetch blueprints' }, 500);
  }
});

// Get blueprint variants
app.get('/printify/blueprints/:blueprintId/variants', async (c) => {
  try {
    const { blueprintId } = c.req.param();
    const { printProviderId } = c.req.query();

    if (!printProviderId) {
      return c.json({ error: 'printProviderId required' }, 400);
    }

    const variants = await printifyRequest(
      c.env,
      `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
    );

    return c.json({ variants });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return c.json({ error: 'Failed to fetch variants' }, 500);
  }
});

// Create Stripe Checkout Session
app.post('/checkout/create', async (c) => {
  try {
    const { DB } = c.env;
    const stripe = getStripe(c.env);
    const body = await c.req.json();

    const { items } = body;

    if (!items || !items.length) {
      return c.json({ error: 'No items in cart' }, 400);
    }

    // Calculate totals
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await DB.prepare(
        'SELECT * FROM products WHERE id = ? AND is_active = 1'
      ).bind(item.productId).first();

      if (!product) {
        return c.json({ error: `Product ${item.productId} not found` }, 404);
      }

      const variants = JSON.parse(product.variants || '[]');
      const variant = variants.find(v => v.id === item.variantId);
      const price = variant?.price || product.markup_price;

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      // Get first image from images_by_color
      const images = JSON.parse(product.images || '{}');
      const firstColorImages = Object.values(images)[0] || [];
      const imageUrl = firstColorImages[0] || '';

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            description: variant ? `${variant.color || ''} ${variant.size || ''}`.trim() : '',
            images: imageUrl ? [imageUrl.startsWith('http') ? imageUrl : `https://cybersmrt.org${imageUrl}`] : [],
          },
          unit_amount: price, // Stripe expects cents
        },
        quantity: item.quantity,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'], // Common Printify destinations
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 500, // $5.00 flat rate shipping
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 10,
              },
            },
          },
        },
      ],
      success_url: `https://store.cybersmrt.org/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://store.cybersmrt.org/`,
      metadata: {
        orderType: 'store',
        items: JSON.stringify(items),
      },
    });

    // Create pending order
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await DB.prepare(`
      INSERT INTO orders (
        id, stripe_checkout_session_id, customer_email,
        shipping_address, line_items, subtotal, shipping_cost, total_amount,
        status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')
    `).bind(
      orderId,
      session.id,
      '', // Email will be filled in from webhook
      '{}', // Shipping address will be filled in from webhook
      JSON.stringify(items),
      subtotal,
      500, // Flat shipping
      subtotal + 500
    ).run();

    return c.json({
      sessionId: session.id,
      checkout_url: session.url,
      orderId,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return c.json({ error: 'Failed to create checkout session', details: error.message }, 500);
  }
});

// Get checkout session details (for success page)
app.get('/checkout/session/:sessionId', async (c) => {
  try {
    const { DB } = c.env;
    const stripe = getStripe(c.env);
    const sessionId = c.req.param('sessionId');

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const order = await DB.prepare(
      'SELECT id, status, customer_email FROM orders WHERE stripe_checkout_session_id = ?'
    ).bind(sessionId).first();

    return c.json({
      order_id: order?.id,
      status: order?.status || 'processing',
      customer_email: session.customer_details?.email || order?.customer_email,
      amount_total: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});

// Stripe webhook handler
app.post('/webhooks/stripe', async (c) => {
  try {
    const { DB } = c.env;
    const stripe = getStripe(c.env);

    const signature = c.req.header('stripe-signature');
    const body = await c.req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return c.json({ error: 'Invalid signature' }, 400);
    }

    // Log webhook event
    await DB.prepare(`
      INSERT INTO webhook_events (source, event_type, event_id, payload)
      VALUES ('stripe', ?, ?, ?)
    `).bind(event.type, event.id, JSON.stringify(event)).run();

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Get full session details (includes shipping)
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['shipping_details'],
      });

      // Update order with customer info and shipping
      await DB.prepare(`
        UPDATE orders
        SET payment_status = 'paid',
            status = 'processing',
            stripe_payment_intent_id = ?,
            customer_name = ?,
            customer_email = ?,
            shipping_address = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_checkout_session_id = ?
      `).bind(
        session.payment_intent,
        fullSession.customer_details?.name || '',
        fullSession.customer_details?.email || '',
        JSON.stringify(fullSession.shipping_details || {}),
        session.id
      ).run();

      // Get order details
      const order = await DB.prepare(
        'SELECT * FROM orders WHERE stripe_checkout_session_id = ?'
      ).bind(session.id).first();

      if (order) {
        // Submit order to Printify (on-demand)
        try {
          await submitOrderToPrintify(c.env, order);
        } catch (printifyError) {
          console.error('Failed to submit to Printify:', printifyError);
          // Don't fail the webhook - we'll retry later
        }
      }
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook handler failed' }, 500);
  }
});

// Submit order to Printify (on-demand product creation)
async function submitOrderToPrintify(env, order) {
  const { DB, PRINTIFY_SHOP_ID } = env;
  const lineItems = JSON.parse(order.line_items);
  const shippingAddress = JSON.parse(order.shipping_address);

  // Create Printify order with on-demand products
  const printifyLineItems = [];

  for (const item of lineItems) {
    const product = await DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(item.productId).first();

    if (!product) continue;

    // Build line item for Printify
    printifyLineItems.push({
      product_id: product.id, // This will be created on-the-fly
      variant_id: item.variantId,
      quantity: item.quantity,
      print_provider_id: product.printify_print_provider_id,
      blueprint_id: product.printify_blueprint_id,
      print_areas: item.printAreas || {},
    });
  }

  const printifyOrder = {
    external_id: order.id,
    label: `CyberSmrt Order ${order.id}`,
    line_items: printifyLineItems,
    shipping_method: 1, // Standard shipping
    send_shipping_notification: true,
    address_to: {
      first_name: shippingAddress.firstName || order.customer_name?.split(' ')[0] || '',
      last_name: shippingAddress.lastName || order.customer_name?.split(' ').slice(1).join(' ') || '',
      email: order.customer_email,
      phone: shippingAddress.phone || '',
      country: shippingAddress.country || 'US',
      region: shippingAddress.state || '',
      address1: shippingAddress.address1 || '',
      address2: shippingAddress.address2 || '',
      city: shippingAddress.city || '',
      zip: shippingAddress.zip || '',
    },
  };

  const response = await printifyRequest(
    env,
    `/shops/${PRINTIFY_SHOP_ID}/orders.json`,
    'POST',
    printifyOrder
  );

  // Update order with Printify ID
  await DB.prepare(`
    UPDATE orders
    SET printify_order_id = ?,
        printify_response = ?,
        status = 'fulfilled',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(response.id, JSON.stringify(response), order.id).run();

  return response;
}

// Printify webhook handler
app.post('/webhooks/printify', async (c) => {
  try {
    const { DB } = c.env;
    const event = await c.req.json();

    // Log webhook event
    await DB.prepare(`
      INSERT INTO webhook_events (source, event_type, event_id, payload)
      VALUES ('printify', ?, ?, ?)
    `).bind(event.type, event.id || '', JSON.stringify(event)).run();

    // Handle order status updates
    if (event.type === 'order:shipment:created') {
      const { order_id, tracking_number, tracking_url } = event.data;

      await DB.prepare(`
        UPDATE orders
        SET status = 'shipped',
            tracking_number = ?,
            tracking_url = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE printify_order_id = ?
      `).bind(tracking_number, tracking_url, order_id).run();
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Printify webhook error:', error);
    return c.json({ error: 'Webhook handler failed' }, 500);
  }
});

// Admin: Add product to catalog
app.post('/admin/products', async (c) => {
  try {
    const { DB, PRODUCT_CACHE } = c.env;
    const body = await c.req.json();

    const {
      blueprintId,
      printProviderId,
      title,
      description,
      basePrice,
      markupPrice,
      images,
      variants,
    } = body;

    if (!blueprintId || !printProviderId || !title || !markupPrice) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const productId = `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await DB.prepare(`
      INSERT INTO products (
        id, printify_blueprint_id, printify_print_provider_id,
        title, description, base_price, markup_price, images, variants
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      productId,
      blueprintId,
      printProviderId,
      title,
      description || '',
      basePrice || 0,
      markupPrice,
      JSON.stringify(images || []),
      JSON.stringify(variants || [])
    ).run();

    // Clear cache
    await PRODUCT_CACHE.delete('products');

    return c.json({ success: true, productId });
  } catch (error) {
    console.error('Error adding product:', error);
    return c.json({ error: 'Failed to add product' }, 500);
  }
});

export default app;
