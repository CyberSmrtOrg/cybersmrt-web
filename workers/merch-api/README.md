# CyberSmrt Merch API

Cloudflare Worker for handling merchandise store operations with Stripe payment processing and Printify print-on-demand fulfillment.

## Features

- **On-demand product creation** - Products created dynamically when orders are placed
- **Stripe integration** - Checkout sessions with nonprofit discount rates (2.2% + $0.30)
- **Printify fulfillment** - Automatic order submission to Printify for production and shipping
- **Custom domain** - Branded checkout at pay.cybersmrt.org
- **Webhook handlers** - Automated payment and shipping status updates
- **Product caching** - KV-based caching for fast catalog responses
- **Order tracking** - Complete order lifecycle management

## Architecture

```
Customer → Frontend (cybersmrt.org/merch)
           ↓
        Merch API Worker (pay.cybersmrt.org)
           ↓
        Stripe Checkout → Payment
           ↓
        Webhook → Order Processing
           ↓
        Printify API → Fulfillment
```

## Setup Instructions

### 1. Create D1 Database

Since the API token lacks D1 permissions, create the database via Cloudflare Dashboard:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **D1 SQL Database**
3. Click **Create Database**
4. Name it: `cybersmrt-merch`
5. Copy the Database ID
6. Update `wrangler.toml` - uncomment the D1 binding and add the ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cybersmrt-merch"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID
```

### 2. Initialize Database Schema

**Option A: Via Cloudflare Dashboard (Recommended if API token lacks permissions)**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → D1
2. Click on `cybersmrt-merch` database
3. Go to **Console** tab
4. Copy and paste the contents of `schema.sql` into the SQL editor
5. Click **Execute**

**Option B: Via Wrangler CLI**

If your API token has D1 write permissions:

```bash
cd workers/merch-api
npx wrangler d1 execute cybersmrt-merch --file=schema.sql --remote
```

**Verify Tables Created:**

```bash
npx wrangler d1 execute cybersmrt-merch --command="SELECT name FROM sqlite_master WHERE type='table'" --remote
```

This creates 6 tables:
- `products` - Product catalog with Printify mapping
- `orders` - Order records with payment and fulfillment status
- `order_items` - Individual line items per order
- `printify_blueprints` - Cache of Printify product blueprints
- `webhook_events` - Log of all webhook events (Stripe + Printify)
- `shipping_rates` - Calculated shipping costs by zone

### 3. Configure Secrets

Set up all required environment variables:

```bash
cd workers/merch-api

# Stripe keys (from Stripe Dashboard)
npx wrangler secret put STRIPE_SECRET_KEY
# Enter your sk_live_... or sk_test_... key

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Enter your whsec_... webhook signing secret

# Printify credentials
npx wrangler secret put PRINTIFY_API_TOKEN
# Enter your Printify API token

npx wrangler secret put PRINTIFY_SHOP_ID
# Enter your Printify shop ID (numeric)
```

**Where to find these values:**

- **Stripe Secret Key**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys) → API keys → Secret key
- **Stripe Webhook Secret**: [Stripe Webhooks](https://dashboard.stripe.com/webhooks) → Add endpoint → Signing secret
- **Printify API Token**: [Printify Settings](https://printify.com/app/account/api) → Generate token
- **Printify Shop ID**: [Printify Shops](https://printify.com/app/shops) → Shop settings → Shop ID

### 4. Configure Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter endpoint URL: `https://store.cybersmrt.org/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` (see step 3)

### 5. Configure Printify Webhook

1. Go to [Printify Settings](https://printify.com/app/account/webhooks)
2. Add new webhook
3. Enter URL: `https://store.cybersmrt.org/webhooks/printify`
4. Select events:
   - `order:shipment:created`
   - `order:shipment:delivered`

### 6. Configure Custom Stripe Domain

1. Go to [Stripe Settings](https://dashboard.stripe.com/settings/checkout) → Checkout settings
2. Under **Custom domain**, add: `pay.cybersmrt.org`
3. Stripe will provide DNS verification records
4. Ensure your CNAME record `pay.cybersmrt.org` points to Cloudflare Workers (already configured in wrangler.toml routes)

### 7. Install Dependencies

```bash
cd workers/merch-api
npm install
```

### 8. Deploy

Deploy to production:

```bash
npx wrangler deploy
```

Deploy to development environment:

```bash
npx wrangler deploy --env development
```

## API Endpoints

### Public Endpoints

#### Get Product Catalog
```
GET /api/merch/products
Response: { products: [...], source: "cache"|"database" }
```

#### Get Single Product
```
GET /api/merch/products/:id
Response: { product: {...} }
```

#### Create Checkout Session
```
POST /api/merch/checkout
Body: {
  items: [
    {
      productId: "PROD_...",
      variantId: 123,
      variantTitle: "Size L - Black",
      quantity: 2,
      printAreas: {...}
    }
  ],
  customerEmail: "customer@example.com",
  shippingAddress: {
    firstName: "John",
    lastName: "Doe",
    address1: "123 Main St",
    address2: "",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "US",
    phone: "+1234567890"
  }
}
Response: {
  sessionId: "cs_...",
  url: "https://checkout.stripe.com/...",
  orderId: "ORD_..."
}
```

### Webhook Endpoints

#### Stripe Webhook
```
POST /api/merch/webhooks/stripe
Headers: { "stripe-signature": "..." }
```

#### Printify Webhook
```
POST /api/merch/webhooks/printify
```

### Admin Endpoints

#### Add Product to Catalog
```
POST /api/merch/admin/products
Body: {
  blueprintId: 3,
  printProviderId: 99,
  title: "CyberSmrt Logo T-Shirt",
  description: "Premium cotton tee with CyberSmrt logo",
  basePrice: 1200,
  markupPrice: 2500,
  images: ["https://..."],
  variants: [...]
}
Response: { success: true, productId: "PROD_..." }
```

#### Get Printify Blueprints (for setup)
```
GET /api/merch/printify/blueprints
Response: { blueprints: [...] }
```

#### Get Blueprint Variants
```
GET /api/merch/printify/blueprints/:blueprintId/variants?printProviderId=99
Response: { variants: [...] }
```

## Testing

### Local Development

Run locally with:
```bash
npx wrangler dev
```

This starts a local server at `http://localhost:8787`

### Test Endpoints

Health check:
```bash
curl https://store.cybersmrt.org/health
```

Get products (requires DB setup):
```bash
curl https://store.cybersmrt.org/products
```

### Test with Stripe CLI

Install Stripe CLI and forward webhooks to local development:

```bash
stripe listen --forward-to localhost:8787/webhooks/stripe
stripe trigger checkout.session.completed
```

## Order Flow

1. **Customer browses catalog** → Frontend calls `GET /api/merch/products`
2. **Customer adds to cart** → Frontend builds order items
3. **Customer clicks checkout** → Frontend calls `POST /api/merch/checkout`
4. **Stripe checkout opens** → Customer enters payment and shipping
5. **Payment succeeds** → Stripe webhook fires `checkout.session.completed`
6. **Order submitted to Printify** → `submitOrderToPrintify()` creates on-demand order
7. **Printify produces item** → Item is printed and prepared
8. **Printify ships item** → Webhook fires `order:shipment:created`
9. **Order marked shipped** → Customer receives tracking number

## Database Schema

### Products Table
Stores product catalog with pricing and Printify mapping.

**Key fields:**
- `id` - Internal product ID (PROD_...)
- `printify_blueprint_id` - Printify product type (e.g., 3 = t-shirt)
- `printify_print_provider_id` - Production facility
- `markup_price` - Customer-facing price in cents
- `base_price` - Cost from Printify in cents
- `variants` - JSON array of sizes/colors

### Orders Table
Complete order records from checkout to fulfillment.

**Key fields:**
- `stripe_checkout_session_id` - Stripe session reference
- `printify_order_id` - Printify order reference
- `status` - pending | processing | fulfilled | shipped | cancelled
- `payment_status` - unpaid | paid | refunded
- `tracking_number` - Shipping tracking code

### Webhook Events Table
Audit log of all webhook events for debugging.

## Pricing Strategy

The worker is configured for **nonprofit Stripe rates** (2.2% + $0.30).

**Example pricing:**
- Printify base cost: $12.00
- Your markup price: $25.00
- Stripe fee (2.2%): $0.55
- Stripe fixed fee: $0.30
- **Net profit**: $11.15 per item

Calculate pricing in `POST /api/merch/checkout` handler.

## Caching Strategy

Product catalog is cached in KV for 5 minutes to reduce D1 reads:

```javascript
// Try cache first
const cached = await PRODUCT_CACHE.get('products', 'json');
if (cached) return c.json({ products: cached, source: 'cache' });

// Fall back to database
const products = await DB.prepare('SELECT * FROM products...').all();

// Update cache
await PRODUCT_CACHE.put('products', JSON.stringify(products), {
  expirationTtl: 300, // 5 minutes
});
```

Cache is cleared when products are added/updated via admin endpoints.

## Security Considerations

- ✅ Webhook signature verification (Stripe)
- ✅ CORS limited to cybersmrt.org origins
- ✅ Secrets stored in Cloudflare (not in code)
- ✅ SQL injection prevention (parameterized queries)
- ⚠️ Admin endpoints need authentication layer (TODO)

## Troubleshooting

### "Authentication error" when deploying
Your API token lacks D1 permissions. Create D1 database via dashboard (see Setup step 1).

### Webhook signature verification fails
Ensure you're using the correct `STRIPE_WEBHOOK_SECRET` from the webhook endpoint configuration, not the API secret key.

### Printify API returns 401
Check that `PRINTIFY_API_TOKEN` is set correctly and hasn't expired.

### Products not appearing
1. Check D1 database has products: `npx wrangler d1 execute cybersmrt-merch --command="SELECT * FROM products"`
2. Clear KV cache: Delete the `products` key manually via dashboard
3. Check product `is_active` flag is set to 1

### Order not submitted to Printify
Check webhook_events table for errors:
```bash
npx wrangler d1 execute cybersmrt-merch --command="SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10"
```

## Next Steps

1. ✅ Worker backend complete
2. ✅ Database schema created
3. ✅ KV namespace configured
4. ⏳ Manual D1 database creation needed
5. ⏳ Secrets configuration needed
6. ⏳ Frontend development (catalog, product pages, checkout)
7. ⏳ Product seeding (add first products via admin endpoint)
8. ⏳ End-to-end testing
9. ⏳ Production deployment

## Support

For issues or questions:
- Check [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- Check [Stripe API Docs](https://stripe.com/docs/api)
- Check [Printify API Docs](https://developers.printify.com/)
- File issue on GitHub: [cybersmrt-web issues](https://github.com/cybersmrt/cybersmrt-web/issues)
