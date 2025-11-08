import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import { createEmailService } from '../../shared/email-service.js';

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
  console.log('[Stripe Init] Checking for Stripe keys...');
  console.log('[Stripe Init] Has STRIPE_SECRET_KEY:', !!env.STRIPE_SECRET_KEY);
  console.log('[Stripe Init] Has STRIPE_TEST_KEY:', !!env.STRIPE_TEST_KEY);

  // Try STRIPE_SECRET_KEY first (for secrets), then STRIPE_TEST_KEY (for env vars)
  const stripeKey = env.STRIPE_SECRET_KEY || env.STRIPE_TEST_KEY;

  console.log('[Stripe Init] Using key:', !!stripeKey);
  console.log('[Stripe Init] Key starts with:', stripeKey?.substring(0, 7));

  if (!stripeKey) {
    throw new Error('Neither STRIPE_SECRET_KEY nor STRIPE_TEST_KEY is set in environment');
  }

  return new Stripe(stripeKey, {
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

// Generate order number in format: CS-YYYYMMDD-XXXXX
function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate 5-digit random number
  const randomNum = String(Math.floor(Math.random() * 100000)).padStart(5, '0');

  return `CS-${dateStr}-${randomNum}`;
}

// Sync a single product from Printify (triggered by webhook)
async function syncProductFromPrintify(env, productId) {
  console.log(`[Product Sync] Starting sync for product ${productId}`);

  try {
    // Clear the products cache to force refresh on next request
    // The actual product sync with images happens via the manual sync script
    // which downloads mockups and generates SQL imports
    await env.PRODUCT_CACHE.delete('products');

    console.log(`[Product Sync] Cleared product cache for ${productId}`);
    console.log(`[Product Sync] Note: Run sync script to update product images and data in D1`);

    return { success: true, productId };
  } catch (error) {
    console.error(`[Product Sync] Error syncing product ${productId}:`, error);
    throw error;
  }
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

    const { items, userId } = body;

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

      // Get image for the specific variant color
      const images = JSON.parse(product.images || '{}');
      let imageUrl = '';

      if (variant && variant.color) {
        // Try to find images for this specific color
        const colorImages = images[variant.color] || images[variant.color.toLowerCase()] || images[variant.color.toUpperCase()];
        if (colorImages && colorImages.length > 0) {
          imageUrl = colorImages[0];
        }
      }

      // Fallback to first available image if no color-specific image found
      if (!imageUrl) {
        const firstColorImages = Object.values(images)[0] || [];
        imageUrl = firstColorImages[0] || '';
      }

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
        user_id: userId || '', // Include user_id if user is signed in
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
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return c.json({ error: 'Invalid signature' }, 400);
    }

    // Log webhook event (ignore if duplicate)
    try {
      await DB.prepare(`
        INSERT INTO webhook_events (source, event_type, event_id, payload)
        VALUES ('stripe', ?, ?, ?)
      `).bind(event.type, event.id, JSON.stringify(event)).run();
    } catch (logError) {
      // Ignore duplicate event errors
      if (!logError.message?.includes('UNIQUE constraint')) {
        console.error('Error logging webhook event:', logError);
      }
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Get full session details (includes shipping)
      const fullSession = await stripe.checkout.sessions.retrieve(session.id);

      // Generate unique order number
      const orderNumber = generateOrderNumber();

      // Extract user_id from metadata if user was signed in during checkout
      const userId = fullSession.metadata?.user_id || null;

      // Update order with customer info, shipping, order number, and user_id
      await DB.prepare(`
        UPDATE orders
        SET payment_status = 'paid',
            status = 'processing',
            stripe_payment_intent_id = ?,
            customer_name = ?,
            customer_email = ?,
            shipping_address = ?,
            order_number = ?,
            user_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_checkout_session_id = ?
      `).bind(
        session.payment_intent,
        fullSession.customer_details?.name || '',
        fullSession.customer_details?.email || '',
        JSON.stringify(fullSession.shipping_details || {}),
        orderNumber,
        userId,
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

        // Send order confirmation email
        try {
          const emailService = createEmailService(c.env, {
            fromEmail: 'CyberSmrt Store <store@cybersmrt.org>'
          });
          const shippingDetails = JSON.parse(order.shipping_address);

          // Format shipping address
          const shippingAddress = [
            order.customer_name,
            shippingDetails.address?.line1,
            shippingDetails.address?.line2,
            `${shippingDetails.address?.city}, ${shippingDetails.address?.state} ${shippingDetails.address?.postal_code}`,
            shippingDetails.address?.country
          ].filter(Boolean).join('\n');

          // Get product details from Stripe line items (includes human-readable variant info)
          const stripeLineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product']
          });

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

          await emailService.send('orderConfirmation', order.customer_email, {
            orderNumber: order.order_number,
            customerName: order.customer_name,
            orderDate: new Date().toLocaleDateString(),
            total: order.total_amount,
            shippingAddress,
            items
          });

          console.log('✅ Order confirmation email sent to:', order.customer_email);
        } catch (emailError) {
          console.error('Failed to send order confirmation email:', emailError);
          // Don't fail the webhook - email is not critical
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

    console.log('[Printify Webhook] Received event:', event.type);

    // Log webhook event (ignore if duplicate)
    try {
      await DB.prepare(`
        INSERT INTO webhook_events (source, event_type, event_id, payload)
        VALUES ('printify', ?, ?, ?)
      `).bind(event.type, event.id || '', JSON.stringify(event)).run();
    } catch (logError) {
      if (!logError.message?.includes('UNIQUE constraint')) {
        console.error('Error logging webhook event:', logError);
      }
    }

    // Handle product update events
    if (event.type === 'product:publish:started' || event.type === 'product:updated') {
      // Product was published or updated in Printify - trigger sync
      const { resource } = event;
      const productId = resource?.id;

      console.log('[Printify Webhook] Product update detected:', productId);

      // Trigger product sync in the background
      c.executionCtx.waitUntil(syncProductFromPrintify(c.env, productId));

      console.log('[Printify Webhook] Product sync triggered');
    }

    // Handle different order events
    if (event.type === 'order:shipment:created') {
      // Order has shipped
      const { resource } = event;
      const printifyOrderId = resource?.id;
      const trackingNumber = resource?.shipments?.[0]?.tracking_number;
      const trackingUrl = resource?.shipments?.[0]?.tracking_url;
      const carrier = resource?.shipments?.[0]?.carrier;

      console.log('[Printify Webhook] Processing shipment:created for order:', printifyOrderId);

      if (printifyOrderId) {
        const updateResult = await DB.prepare(`
          UPDATE orders
          SET status = 'shipped',
              tracking_number = ?,
              tracking_url = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE printify_order_id = ?
        `).bind(trackingNumber || null, trackingUrl || null, printifyOrderId).run();

        console.log('[Printify Webhook] Update result:', updateResult);

        // Get order details for email
        const order = await DB.prepare(
          'SELECT * FROM orders WHERE printify_order_id = ?'
        ).bind(printifyOrderId).first();

        console.log('[Printify Webhook] Order found:', !!order);

        if (order && order.customer_email) {
          console.log('[Printify Webhook] Sending email to:', order.customer_email);
          try {
            const emailService = createEmailService(c.env, {
              fromEmail: 'CyberSmrt Store <store@cybersmrt.org>'
            });

            await emailService.send('orderShipped', order.customer_email, {
              orderNumber: order.order_number,
              customerName: order.customer_name,
              trackingNumber,
              trackingUrl,
              carrier,
              estimatedDelivery: '5-7 business days'
            });

            console.log('✅ Shipped email sent to:', order.customer_email);
          } catch (emailError) {
            console.error('Failed to send shipped email:', emailError);
          }
        } else {
          console.log('[Printify Webhook] No order found or no customer email');
        }
      }
    } else if (event.type === 'order:shipment:delivered') {
      // Order has been delivered
      const { resource } = event;
      const printifyOrderId = resource?.id;
      const deliveryTime = resource?.shipments?.[0]?.delivered_at;

      if (printifyOrderId) {
        await DB.prepare(`
          UPDATE orders
          SET status = 'delivered',
              updated_at = CURRENT_TIMESTAMP
          WHERE printify_order_id = ?
        `).bind(printifyOrderId).run();

        // Get order details for email
        const order = await DB.prepare(
          'SELECT * FROM orders WHERE printify_order_id = ?'
        ).bind(printifyOrderId).first();

        if (order && order.customer_email) {
          try {
            const emailService = createEmailService(c.env, {
              fromEmail: 'CyberSmrt Store <store@cybersmrt.org>'
            });

            await emailService.send('orderDelivered', order.customer_email, {
              orderNumber: order.order_number,
              customerName: order.customer_name,
              deliveryTime: deliveryTime ? new Date(deliveryTime).toLocaleString() : undefined,
              deliveryLocation: 'Your shipping address'
            });

            console.log('✅ Delivered email sent to:', order.customer_email);
          } catch (emailError) {
            console.error('Failed to send delivered email:', emailError);
          }
        }
      }
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

// Get all orders for authenticated user
app.get('/api/orders', async (c) => {
  try {
    const { DB } = c.env;

    // Get access token from Authorization header or cookies (for cross-subdomain auth)
    let token = null;
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Try to get from cookies (cross-subdomain fallback)
      const cookieHeader = c.req.header('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='));
        if (accessTokenCookie) {
          token = accessTokenCookie.split('=')[1];
        }
      }
    }

    if (!token) {
      return c.json({ error: 'Unauthorized - Please sign in to view your purchases' }, 401);
    }

    // Decode JWT to extract user_id
    // JWT structure: header.payload.signature
    let userId;
    try {
      const [, payloadB64] = token.split('.');
      if (!payloadB64) {
        return c.json({ error: 'Invalid token format' }, 401);
      }

      // Decode base64url
      const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      userId = payload.userId || payload.sub;

      if (!userId) {
        return c.json({ error: 'Invalid token - no user ID found' }, 401);
      }

      // TODO: Verify JWT signature for production security
    } catch (jwtError) {
      console.error('JWT decode error:', jwtError);
      return c.json({ error: 'Invalid authentication token' }, 401);
    }

    // Fetch all orders for this user
    const ordersResult = await DB.prepare(`
      SELECT
        o.id,
        o.order_number,
        o.customer_email,
        o.customer_name,
        o.shipping_address,
        o.subtotal,
        o.shipping_cost,
        o.total_amount,
        o.status,
        o.payment_status,
        o.tracking_number,
        o.tracking_url,
        o.stripe_payment_intent_id,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).bind(userId).all();

    if (!ordersResult.results || ordersResult.results.length === 0) {
      return c.json({ orders: [] });
    }

    // Fetch line items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.results.map(async (order) => {
        const itemsResult = await DB.prepare(`
          SELECT
            product_title,
            variant_title,
            quantity,
            unit_price,
            total_price,
            print_areas
          FROM order_items
          WHERE order_id = ?
        `).bind(order.id).all();

        return {
          ...order,
          shipping_address: JSON.parse(order.shipping_address || '{}'),
          items: itemsResult.results.map(item => ({
            ...item,
            print_areas: JSON.parse(item.print_areas || '[]')
          }))
        };
      })
    );

    return c.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Get specific order by order number (with email verification)
app.get('/api/orders/:order_number', async (c) => {
  try {
    const { DB } = c.env;
    const orderNumber = c.req.param('order_number');
    const email = c.req.query('email');

    if (!orderNumber) {
      return c.json({ error: 'Order number is required' }, 400);
    }

    if (!email) {
      return c.json({ error: 'Email is required for order lookup' }, 400);
    }

    // Fetch order with email verification
    const orderResult = await DB.prepare(`
      SELECT
        o.id,
        o.order_number,
        o.customer_email,
        o.customer_name,
        o.shipping_address,
        o.subtotal,
        o.shipping_cost,
        o.total_amount,
        o.status,
        o.payment_status,
        o.tracking_number,
        o.tracking_url,
        o.stripe_payment_intent_id,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.order_number = ? AND LOWER(o.customer_email) = LOWER(?)
    `).bind(orderNumber, email).first();

    if (!orderResult) {
      return c.json({ error: 'Order not found or email does not match' }, 404);
    }

    // Fetch line items for this order
    const itemsResult = await DB.prepare(`
      SELECT
        product_title,
        variant_title,
        quantity,
        unit_price,
        total_price,
        print_areas
      FROM order_items
      WHERE order_id = ?
    `).bind(orderResult.id).all();

    const order = {
      ...orderResult,
      shipping_address: JSON.parse(orderResult.shipping_address || '{}'),
      items: itemsResult.results.map(item => ({
        ...item,
        print_areas: JSON.parse(item.print_areas || '[]')
      }))
    };

    return c.json({ order });
  } catch (error) {
    console.error('Error fetching order by number:', error);
    return c.json({ error: 'Failed to fetch order' }, 500);
  }
});

// Get store metrics (admin only)
app.get('/api/admin/store/metrics', async (c) => {
  try {
    const { DB } = c.env;

    // TODO: Add admin authentication check here
    // For now, this endpoint should be protected by Cloudflare Access or similar

    // Get overall metrics
    const [totalOrders, totalRevenue, recentOrders, topProducts] = await Promise.all([
      // Total orders
      DB.prepare('SELECT COUNT(*) as count FROM orders WHERE payment_status = ?')
        .bind('paid')
        .first(),

      // Total revenue
      DB.prepare('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = ?')
        .bind('paid')
        .first(),

      // Recent orders (last 30 days)
      DB.prepare(`
        SELECT COUNT(*) as count, SUM(total_amount) as total
        FROM orders
        WHERE payment_status = ?
        AND created_at >= datetime('now', '-30 days')
      `)
        .bind('paid')
        .first(),

      // Top products by quantity sold
      DB.prepare(`
        SELECT
          json_extract(value, '$.productId') as product_id,
          SUM(json_extract(value, '$.quantity')) as total_quantity
        FROM orders, json_each(line_items)
        WHERE payment_status = 'paid'
        GROUP BY product_id
        ORDER BY total_quantity DESC
        LIMIT 5
      `).all()
    ]);

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      (topProducts.results || []).map(async (item) => {
        const product = await DB.prepare('SELECT id, title FROM products WHERE id = ?')
          .bind(item.product_id)
          .first();
        return {
          productId: item.product_id,
          productTitle: product?.title || 'Unknown Product',
          totalQuantity: item.total_quantity
        };
      })
    );

    // Calculate 30-day growth
    const prevMonthOrders = await DB.prepare(`
      SELECT COUNT(*) as count, SUM(total_amount) as total
      FROM orders
      WHERE payment_status = ?
      AND created_at >= datetime('now', '-60 days')
      AND created_at < datetime('now', '-30 days')
    `)
      .bind('paid')
      .first();

    const orderGrowth = prevMonthOrders.count > 0
      ? ((recentOrders.count - prevMonthOrders.count) / prevMonthOrders.count) * 100
      : 0;

    const revenueGrowth = prevMonthOrders.total > 0
      ? ((recentOrders.total - prevMonthOrders.total) / prevMonthOrders.total) * 100
      : 0;

    return c.json({
      totalOrders: totalOrders?.count || 0,
      totalRevenue: totalRevenue?.total || 0,
      recentOrders: {
        count: recentOrders?.count || 0,
        total: recentOrders?.total || 0,
        growth: Math.round(orderGrowth * 10) / 10
      },
      recentRevenue: {
        total: recentOrders?.total || 0,
        growth: Math.round(revenueGrowth * 10) / 10
      },
      topProducts: topProductsWithDetails,
      averageOrderValue: totalOrders?.count > 0
        ? Math.round((totalRevenue?.total || 0) / totalOrders.count)
        : 0
    });
  } catch (error) {
    console.error('Error fetching store metrics:', error);
    return c.json({ error: 'Failed to fetch metrics' }, 500);
  }
});

export default app;
