/* /assets/js/merch-store.js */

'use strict';

// ============================================
// Configuration
// ============================================
const API_BASE_URL = 'https://pay.cybersmrt.org';

// ============================================
// State Management
// ============================================
const MerchStore = {
  products: [],
  cart: [],
  currentCategory: 'all',

  // Initialize from localStorage
  init() {
    this.loadCart();
    this.loadProducts();
    this.updateCartUI();
  },

  // Load cart from localStorage
  loadCart() {
    try {
      const saved = localStorage.getItem('cybersmrt_cart');
      this.cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to load cart from localStorage:', e);
      this.cart = [];
    }
  },

  // Save cart to localStorage
  saveCart() {
    try {
      localStorage.setItem('cybersmrt_cart', JSON.stringify(this.cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  },

  // Load products from API
  async loadProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      this.products = data.products || [];
      this.renderProducts();
    } catch (error) {
      console.error('Failed to load products:', error);
      this.renderProductError();
    }
  },

  // Render products grid
  renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const filtered = this.currentCategory === 'all'
      ? this.products
      : this.products.filter(p => p.category === this.currentCategory);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="loading">
          <p>No products available in this category yet.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(product => this.renderProductCard(product)).join('');
  },

  // Render single product card
  renderProductCard(product) {
    const hasVariants = product.variants && product.variants.length > 0;
    const defaultPrice = hasVariants ? product.variants[0].price : (product.price || 0);

    return `
      <article class="product-card" data-product-id="${product.id}" data-category="${product.category}">
        <div class="product-image">
          ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy">` : ''}
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        </div>

        <div class="product-info">
          <div class="product-category">${this.formatCategory(product.category)}</div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description}</p>

          <div class="product-pricing">
            <span class="product-price" data-product-price="${product.id}">$${(defaultPrice / 100).toFixed(2)}</span>
            <span class="product-impact">Funds ${product.impact || 'our mission'}</span>
          </div>

          ${hasVariants ? this.renderVariantOptions(product) : ''}

          <button
            class="add-to-cart-btn"
            onclick="MerchStore.addToCart('${product.id}')"
            data-product-btn="${product.id}"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Add to Cart
          </button>
        </div>
      </article>
    `;
  },

  // Render variant options (size, color, etc.)
  renderVariantOptions(product) {
    if (!product.variants || product.variants.length === 0) return '';

    // Extract unique sizes and colors
    const sizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
    const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];

    let html = '<div class="product-options">';

    if (sizes.length > 0) {
      html += `
        <div class="option-group">
          <label class="option-label">Size:</label>
          <div class="option-buttons" data-option-type="size" data-product-id="${product.id}">
            ${sizes.map(size => `
              <button class="option-btn ${size === sizes[0] ? 'selected' : ''}"
                      onclick="MerchStore.selectOption('${product.id}', 'size', '${size}')"
                      data-option-value="${size}">
                ${size}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (colors.length > 0) {
      html += `
        <div class="option-group">
          <label class="option-label">Color:</label>
          <div class="option-buttons" data-option-type="color" data-product-id="${product.id}">
            ${colors.map(color => `
              <button class="option-btn ${color === colors[0] ? 'selected' : ''}"
                      onclick="MerchStore.selectOption('${product.id}', 'color', '${color}')"
                      data-option-value="${color}">
                ${color}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  },

  // Format category name
  formatCategory(category) {
    const map = {
      'apparel': 'Apparel',
      'accessories': 'Accessories',
      'tech': 'Tech Gear',
      'stickers': 'Stickers'
    };
    return map[category] || category;
  },

  // Select variant option
  selectOption(productId, optionType, value) {
    // Update button states
    const container = document.querySelector(`[data-option-type="${optionType}"][data-product-id="${productId}"]`);
    if (!container) return;

    container.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.optionValue === value);
    });

    // Update price based on selected variant
    this.updateProductPrice(productId);
  },

  // Update product price based on selected variants
  updateProductPrice(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product || !product.variants || product.variants.length === 0) return;

    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;

    const selectedSize = card.querySelector('[data-option-type="size"] .option-btn.selected')?.dataset.optionValue;
    const selectedColor = card.querySelector('[data-option-type="color"] .option-btn.selected')?.dataset.optionValue;

    // Find matching variant
    const variant = product.variants.find(v =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor)
    );

    if (variant && variant.price) {
      const priceEl = card.querySelector(`[data-product-price="${productId}"]`);
      if (priceEl) {
        priceEl.textContent = `$${(variant.price / 100).toFixed(2)}`;
      }
    }
  },

  // Get currently selected variant for a product
  getSelectedVariant(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return null;

    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return product.variants?.[0] || null;

    const selectedSize = card.querySelector('[data-option-type="size"] .option-btn.selected')?.dataset.optionValue;
    const selectedColor = card.querySelector('[data-option-type="color"] .option-btn.selected')?.dataset.optionValue;

    if (!product.variants || product.variants.length === 0) {
      return null;
    }

    return product.variants.find(v =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor)
    ) || product.variants[0];
  },

  // Add product to cart
  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }

    const variant = this.getSelectedVariant(productId);
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: variant?.price || product.price || 0,
      image: product.image_url,
      variantId: variant?.id,
      size: variant?.size,
      color: variant?.color,
      quantity: 1
    };

    // Check if item already in cart
    const existingIndex = this.cart.findIndex(item =>
      item.productId === cartItem.productId &&
      item.variantId === cartItem.variantId
    );

    if (existingIndex >= 0) {
      this.cart[existingIndex].quantity += 1;
    } else {
      this.cart.push(cartItem);
    }

    this.saveCart();
    this.updateCartUI();
    this.showAddedFeedback(productId);
  },

  // Show feedback when item added
  showAddedFeedback(productId) {
    const btn = document.querySelector(`[data-product-btn="${productId}"]`);
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      Added!
    `;
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1500);
  },

  // Remove item from cart
  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateCartUI();
  },

  // Update cart UI
  updateCartUI() {
    // Update cart count
    const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = count;

    // Update cart items
    const itemsContainer = document.getElementById('cartItems');
    if (!itemsContainer) return;

    if (this.cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some awesome merch to support our mission!</p>
        </div>
      `;
      document.getElementById('checkoutBtn')?.setAttribute('disabled', 'disabled');
    } else {
      itemsContainer.innerHTML = this.cart.map((item, index) => `
        <div class="cart-item">
          <div class="cart-item-image">
            ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
          </div>
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-options">
              ${item.size ? `Size: ${item.size}` : ''}
              ${item.size && item.color ? ' • ' : ''}
              ${item.color ? `Color: ${item.color}` : ''}
            </div>
            <div class="cart-item-price">$${(item.price / 100).toFixed(2)} × ${item.quantity}</div>
            <button class="remove-item-btn" onclick="MerchStore.removeFromCart(${index})">Remove</button>
          </div>
        </div>
      `).join('');
      document.getElementById('checkoutBtn')?.removeAttribute('disabled');
    }

    // Update total
    const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = `$${(total / 100).toFixed(2)}`;
  },

  // Render product error
  renderProductError() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="loading">
        <p>Unable to load products. Please try again later.</p>
        <button class="cta-btn" onclick="MerchStore.loadProducts()" style="margin-top: 1rem;">Retry</button>
      </div>
    `;
  }
};

// ============================================
// UI Functions
// ============================================
function openCart() {
  document.getElementById('cartSidebar')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

function filterCategory(category) {
  MerchStore.currentCategory = category;

  // Update button states
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(category) || (category === 'all' && btn.textContent === 'All Items'));
  });

  MerchStore.renderProducts();
}

async function proceedToCheckout() {
  const btn = document.getElementById('checkoutBtn');
  if (!btn || btn.disabled) return;

  try {
    btn.disabled = true;
    btn.textContent = 'Creating checkout session...';

    // Create checkout session
    const response = await fetch(`${API_BASE_URL}/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: MerchStore.cart.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity
        })),
        success_url: `${window.location.origin}/pages/merch/success.html`,
        cancel_url: `${window.location.origin}/pages/merch/`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const data = await response.json();

    if (data.checkout_url) {
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } else {
      throw new Error('No checkout URL received');
    }

  } catch (error) {
    console.error('Checkout error:', error);
    alert(`Checkout failed: ${error.message}. Please try again.`);
    btn.disabled = false;
    btn.textContent = 'Proceed to Checkout';
  }
}

// ============================================
// Initialize on page load
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  MerchStore.init();
  console.log('✅ Merch store initialized');
});

// Close cart on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('cartSidebar')?.classList.contains('open')) {
    closeCart();
  }
});

// Expose globally for inline event handlers
window.MerchStore = MerchStore;
window.openCart = openCart;
window.closeCart = closeCart;
window.filterCategory = filterCategory;
window.proceedToCheckout = proceedToCheckout;
