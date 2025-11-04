# Merch API Setup Checklist

Follow these steps to complete the setup and deployment of the CyberSmrt Merch API.

## ✅ Completed

- [x] D1 database created: `cybersmrt-merch` (ID: `b6469b14-e613-44fc-aa9a-75d86c46a911`)
- [x] KV namespace created: `PRODUCT_CACHE` (ID: `89d8c4f59d794c36888770244e4bdbbf`)
- [x] Worker code implemented
- [x] wrangler.toml configured with custom domain routes
- [x] Dependencies installed (hono, stripe)
- [x] Local database schema initialized

## 🔲 TODO: Initialize Remote Database

**Option 1: Via Cloudflare Dashboard (Recommended)**

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **D1 SQL Database**
3. Click on database: **cybersmrt-merch**
4. Click the **Console** tab
5. Copy the entire contents of `schema.sql` (89 lines)
6. Paste into the SQL console
7. Click **Execute**
8. Verify success - you should see 6 tables created

**Option 2: Fix API Token Permissions**

If you want to use CLI instead:

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Edit your API token
3. Add permission: **D1** → **Edit**
4. Save token
5. Run: `npx wrangler d1 execute cybersmrt-merch --file=schema.sql --remote`

## 🔲 TODO: Configure Secrets

You'll need to set 4 secrets. Run these commands and paste in the values when prompted:

```bash
cd workers/merch-api

# Get from: https://dashboard.stripe.com/apikeys
npx wrangler secret put STRIPE_SECRET_KEY

# Get from: https://dashboard.stripe.com/webhooks (after creating webhook endpoint)
npx wrangler secret put STRIPE_WEBHOOK_SECRET

# Get from: https://printify.com/app/account/api
npx wrangler secret put PRINTIFY_API_TOKEN

# Get from: https://printify.com/app/shops (numeric ID in shop settings)
npx wrangler secret put PRINTIFY_SHOP_ID
```

### Where to Find These Values:

**STRIPE_SECRET_KEY:**
- https://dashboard.stripe.com/apikeys
- Use your **Secret key** (starts with `sk_live_...` or `sk_test_...`)

**STRIPE_WEBHOOK_SECRET:**
- https://dashboard.stripe.com/webhooks
- Click "Add endpoint"
- Endpoint URL: `https://pay.cybersmrt.org/api/merch/webhooks/stripe`
- Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy the **Signing secret** (starts with `whsec_...`)

**PRINTIFY_API_TOKEN:**
- https://printify.com/app/account/api
- Click "Generate new token"
- Copy the token (long alphanumeric string)

**PRINTIFY_SHOP_ID:**
- https://printify.com/app/shops
- Click on your shop
- Go to Settings → the Shop ID is shown (numeric, e.g., `12345`)

## 🔲 TODO: Configure Stripe Custom Domain

1. Go to: https://dashboard.stripe.com/settings/checkout
2. Under **Custom domain**, click "Add domain"
3. Enter: `pay.cybersmrt.org`
4. Stripe will show DNS verification instructions
5. Verify your CNAME record is pointing to Cloudflare Workers (should already be set up)
6. Wait for Stripe to verify (can take a few minutes)

## 🔲 TODO: Configure Printify Webhook

1. Go to: https://printify.com/app/account/webhooks
2. Click "Add webhook"
3. URL: `https://pay.cybersmrt.org/api/merch/webhooks/printify`
4. Select events:
   - `order:shipment:created`
   - `order:shipment:delivered`
5. Save

## 🔲 TODO: Deploy Worker

Once all the above is complete:

```bash
cd workers/merch-api
npx wrangler deploy --env=""
```

Expected output:
```
✨ Success! Deployed to:
  https://pay.cybersmrt.org
```

## 🔲 TODO: Test Deployment

### 1. Health Check
```bash
curl https://pay.cybersmrt.org/health
```

Expected: `{"status":"ok","service":"cybersmrt-merch-api"}`

### 2. Products Endpoint
```bash
curl https://pay.cybersmrt.org/api/merch/products
```

Expected: `{"products":[],"source":"database"}` (empty until products added)

### 3. Printify Connection
```bash
curl https://pay.cybersmrt.org/api/merch/printify/blueprints
```

Expected: JSON array of Printify product blueprints

## 🔲 TODO: Add First Product

Use the admin endpoint to add your first product:

```bash
curl -X POST https://pay.cybersmrt.org/api/merch/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "blueprintId": 3,
    "printProviderId": 99,
    "title": "CyberSmrt Logo T-Shirt",
    "description": "Premium cotton tee with CyberSmrt logo",
    "basePrice": 1200,
    "markupPrice": 2500,
    "images": ["https://example.com/tshirt.jpg"],
    "variants": []
  }'
```

**Note:** You'll want to add authentication to admin endpoints before production use.

## Next Steps After Deployment

1. **Build Frontend** - Create merch store pages at `/pages/merch/`
2. **Add Products** - Use Printify API to browse blueprints and add products
3. **Test Checkout Flow** - Complete a test purchase end-to-end
4. **Add Authentication** - Secure admin endpoints
5. **Monitor Logs** - Use `npx wrangler tail` to monitor live traffic

## Monitoring & Logs

View live logs:
```bash
cd workers/merch-api
npx wrangler tail
```

Check D1 database:
```bash
npx wrangler d1 execute cybersmrt-merch --command="SELECT * FROM products" --remote
npx wrangler d1 execute cybersmrt-merch --command="SELECT * FROM orders ORDER BY created_at DESC LIMIT 10" --remote
npx wrangler d1 execute cybersmrt-merch --command="SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10" --remote
```

## Troubleshooting

**"Authentication error" during deployment**
- Your API token may lack Worker deployment permissions
- Go to https://dash.cloudflare.com/profile/api-tokens and verify permissions

**Webhook signature verification fails**
- Ensure you're using the webhook signing secret, not the API secret key
- Regenerate webhook secret if needed

**Products not appearing**
- Check product `is_active` flag is 1
- Clear KV cache: manually delete `products` key in dashboard
- Verify D1 has data: `npx wrangler d1 execute cybersmrt-merch --command="SELECT * FROM products" --remote`

**Printify order fails**
- Check webhook_events table for error details
- Verify PRINTIFY_SHOP_ID is correct numeric ID
- Ensure PRINTIFY_API_TOKEN hasn't expired

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Printify API Docs](https://developers.printify.com/)
- [Full README](./README.md)
