/* /assets/js/store.js */

// Prevent duplicate execution
if (typeof window.STORE_LOADED === 'undefined') {
window.STORE_LOADED = true;

(function() {
'use strict';

// ============================================
// Configuration
// ============================================
// Temporarily using workers.dev URL while Pages DNS propagates
window.API_BASE_URL = window.API_BASE_URL || 'https://cybersmrt-store-api.tony-398.workers.dev';
const API_BASE_URL = window.API_BASE_URL;

// ============================================
// State Management
// ============================================
const Store = {
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

      // Transform API response to match frontend expectations
      this.products = (data.products || []).map(p => {
        // Parse images from JSON string if needed
        const imagesByColor = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;

        // Get first color's first image as default
        const firstColor = Object.keys(imagesByColor)[0];
        const defaultImage = imagesByColor[firstColor]?.[0] || null;

        return {
          ...p,
          name: p.title,
          price: p.markup_price,
          image_url: defaultImage,
          images: imagesByColor,
          category: this.detectCategory(p.title)
        };
      });

      this.renderProducts();
    } catch (error) {
      console.error('Failed to load products:', error);
      this.renderProductError();
    }
  },

  // Detect category from product title
  detectCategory(title) {
    const lower = title.toLowerCase();
    if (lower.includes('shirt') || lower.includes('tee') || lower.includes('tank') || lower.includes('polo')) {
      return 'apparel';
    }
    if (lower.includes('sticker')) {
      return 'stickers';
    }
    if (lower.includes('hat') || lower.includes('cap') || lower.includes('bag')) {
      return 'accessories';
    }
    if (lower.includes('tech') || lower.includes('usb') || lower.includes('mouse')) {
      return 'tech';
    }
    return 'apparel'; // default
  },

  // Convert color name to hex value for display
  getColorHex(colorName) {
    const colorMap = {
      // Basic colors
      'Black': '#000000',
      'White': '#FFFFFF',
      'Navy': '#001F3F',
      'Gray': '#808080',
      'Grey': '#808080',
      'Red': '#FF0000',
      'Blue': '#0074D9',
      'Green': '#2ECC40',
      'Yellow': '#FFDC00',
      'Orange': '#FF851B',
      'Pink': '#FF69B4',
      'Purple': '#B10DC9',
      'Brown': '#8B4513',
      'Beige': '#F5F5DC',
      'Maroon': '#800000',
      'Olive': '#808000',
      'Teal': '#008080',
      'Cyan': '#00FFFF',
      'Magenta': '#FF00FF',
      'Lime': '#00FF00',
      'Silver': '#C0C0C0',
      'Gold': '#FFD700',

      // Printify-specific colors
      'Leaf': '#4A7C59',
      'Kelly': '#006B3C',
      'Kelly Green': '#006B3C',
      'Athletic Heather': '#B3B3B3',
      'Dark Grey': '#505050',
      'Dark Gray': '#505050',
      'True Royal': '#1E3A8A',
      'Royal Blue': '#4169E1',
      'Heather Blue': '#8FB4D9',
      'Light Blue': '#87CEEB',
      'Heather Grey': '#D3D3D3',
      'Heather Gray': '#D3D3D3',
      'Ash': '#B2BEB5',
      'Ash Grey': '#B2BEB5',
      'Sport Grey': '#B3B3B3',
      'Charcoal': '#36454F',
      'Forest Green': '#228B22',
      'Irish Green': '#009A63',
      'Military Green': '#5A7247',
      'Cardinal': '#C41E3A',
      'Burgundy': '#800020',
      'Team Purple': '#764ba2',
      'Heather Prism Lilac': '#C8A2D0'
    };
    return colorMap[colorName] || '#667eea'; // Default to brand purple if unknown
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

  // Helper function to sort sizes in proper order
  sortSizes(sizes) {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
    return sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      // If both sizes are in our order list, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only one is in the list, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Otherwise sort alphabetically
      return a.localeCompare(b);
    });
  },

  // Render single product card (simplified - just image carousel, name, price)
  renderProductCard(product) {
    // Get all colors and sizes
    const colors = Object.keys(product.images || {});
    const unsortedSizes = [...new Set(product.variants?.map(v => v.size).filter(Boolean))] || [];
    const sizes = this.sortSizes(unsortedSizes);
    const currentCardColor = product._cardColor || colors[0];
    const currentCardSize = product._cardSize || sizes[0];
    const previewImages = product.images?.[currentCardColor] || [product.image_url];
    const hasMultipleImages = previewImages.length > 1;
    const hasMultipleColors = colors.length > 1;
    const hasSizes = sizes.length > 0;

    const defaultPrice = product.price || 0;

    return `
      <article class="product-card" data-product-id="${product.id}" data-current-color="${currentCardColor}" data-current-size="${currentCardSize}" onclick="Store.openProductModal('${product.id}')">
        <div class="product-image-carousel">
          ${hasMultipleImages ? `
            <button class="carousel-btn carousel-prev" onclick="event.stopPropagation(); Store.cardCarouselPrev('${product.id}')">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          ` : ''}

          <div class="carousel-images" data-carousel="${product.id}">
            ${previewImages.map((img, idx) => `
              <img src="${img}" alt="${product.name}" class="${idx === 0 ? 'active' : ''}" loading="lazy">
            `).join('')}
          </div>

          ${hasMultipleImages ? `
            <button class="carousel-btn carousel-next" onclick="event.stopPropagation(); Store.cardCarouselNext('${product.id}')">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <div class="carousel-dots">
              ${previewImages.map((_, idx) => `
                <span class="dot ${idx === 0 ? 'active' : ''}" onclick="event.stopPropagation(); Store.cardCarouselGoto('${product.id}', ${idx})"></span>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="product-info-simple">
          <span class="product-category-tag">${this.formatCategory(product.category)}</span>
          <h3 class="product-title-simple">${product.name}</h3>
          <div class="product-price-simple">$${(defaultPrice / 100).toFixed(2)}</div>

          <div class="card-options-row">
            ${hasMultipleColors ? `
              <div class="card-color-selector">
                ${colors.map(color => `
                  <button class="card-color-dot ${color === currentCardColor ? 'active' : ''}"
                          style="background-color: ${this.getColorHex(color)};"
                          onclick="event.stopPropagation(); Store.changeCardColor('${product.id}', '${color}')"
                          title="${color}"
                          aria-label="View ${color} variant">
                  </button>
                `).join('')}
              </div>
            ` : ''}

            ${hasSizes ? `
              <div class="card-size-selector">
                ${sizes.map(size => {
                  const isAvailable = product.variants.some(v =>
                    v.size === size && v.color === currentCardColor && v.isAvailable !== false
                  );
                  const isSelected = size === currentCardSize;
                  return `
                    <button class="card-size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'out-of-stock' : ''}"
                            onclick="event.stopPropagation(); ${isAvailable ? `Store.changeCardSize('${product.id}', '${size}')` : 'return false;'}"
                            ${!isAvailable ? 'disabled' : ''}
                            title="${isAvailable ? size : size + ' - Out of Stock'}">
                      ${size}
                      ${!isAvailable ? '<span class="out-of-stock-label">Out</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>

          <button class="card-add-to-cart-btn" onclick="event.stopPropagation(); Store.quickAddToCart('${product.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      onclick="Store.selectOption('${product.id}', 'size', '${size}')"
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
                      onclick="Store.selectOption('${product.id}', 'color', '${color}')"
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
            <button class="remove-item-btn" onclick="Store.removeFromCart(${index})">Remove</button>
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
        <button class="cta-btn" onclick="Store.loadProducts()" style="margin-top: 1rem;">Retry</button>
      </div>
    `;
  },

  // Card carousel navigation
  cardCarouselPrev(productId) {
    const carousel = document.querySelector(`[data-carousel="${productId}"]`);
    if (!carousel) return;

    const images = carousel.querySelectorAll('img');
    const activeIdx = Array.from(images).findIndex(img => img.classList.contains('active'));
    const newIdx = activeIdx === 0 ? images.length - 1 : activeIdx - 1;

    images[activeIdx].classList.remove('active');
    images[newIdx].classList.add('active');

    // Track the current index for this product
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product._cardImageIndex = newIdx;
    }

    this.updateCarouselDots(productId, newIdx);
  },

  cardCarouselNext(productId) {
    const carousel = document.querySelector(`[data-carousel="${productId}"]`);
    if (!carousel) return;

    const images = carousel.querySelectorAll('img');
    const activeIdx = Array.from(images).findIndex(img => img.classList.contains('active'));
    const newIdx = (activeIdx + 1) % images.length;

    images[activeIdx].classList.remove('active');
    images[newIdx].classList.add('active');

    // Track the current index for this product
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product._cardImageIndex = newIdx;
    }

    this.updateCarouselDots(productId, newIdx);
  },

  cardCarouselGoto(productId, index) {
    const carousel = document.querySelector(`[data-carousel="${productId}"]`);
    if (!carousel) return;

    const images = carousel.querySelectorAll('img');
    images.forEach((img, idx) => {
      img.classList.toggle('active', idx === index);
    });

    // Track the current index for this product
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product._cardImageIndex = index;
    }

    this.updateCarouselDots(productId, index);
  },

  updateCarouselDots(productId, activeIndex) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;

    const dots = card.querySelectorAll('.carousel-dots .dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIndex);
    });
  },

  // Change color on product card
  changeCardColor(productId, color) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Preserve the current carousel index (default to 0 if not set)
    const currentIndex = product._cardImageIndex || 0;

    // Update internal state
    product._cardColor = color;
    // Keep the same carousel index to stay on the same pose

    // Find and update the card
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) {
      console.warn('[changeCardColor] Card not found for product:', productId);
      return;
    }

    // Update images
    const carousel = card.querySelector('.carousel-images');
    if (!carousel) {
      console.warn('[changeCardColor] Carousel not found for product:', productId);
      return;
    }

    const newImages = product.images[color] || [];
    console.log('[changeCardColor] Changing to color:', color, 'Images:', newImages, 'Preserving index:', currentIndex);

    // Determine which image should be active (stay on same pose/index)
    const activeIndex = Math.min(currentIndex, newImages.length - 1);

    // Always replace HTML to force a fresh render and avoid browser caching issues
    console.log('[changeCardColor] Replacing carousel images (forcing fresh render)');
    carousel.innerHTML = newImages.map((img, idx) => `
      <img src="${img}" alt="${product.name}" class="${idx === activeIndex ? 'active' : ''}" loading="eager">
    `).join('');

    console.log('[changeCardColor] Carousel updated. Active images:', carousel.querySelectorAll('img.active').length);

    // Update carousel dots if multiple images
    const dotsContainer = card.querySelector('.carousel-dots');
    if (dotsContainer && newImages.length > 1) {
      dotsContainer.innerHTML = newImages.map((_, idx) => `
        <span class="dot ${idx === activeIndex ? 'active' : ''}" onclick="event.stopPropagation(); Store.cardCarouselGoto('${productId}', ${idx})"></span>
      `).join('');
    }

    // Update color selector active state
    card.querySelectorAll('.card-color-dot').forEach(btn => {
      btn.classList.toggle('active', btn.title === color);
    });

    // Update size buttons availability based on new color
    const sizeSelectorContainer = card.querySelector('.card-size-selector');
    if (sizeSelectorContainer && product.variants) {
      const unsortedSizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
      const sizes = this.sortSizes(unsortedSizes);
      const currentCardSize = product._cardSize || sizes[0];

      sizeSelectorContainer.innerHTML = sizes.map(size => {
        const isAvailable = product.variants.some(v =>
          v.size === size && v.color === color && v.isAvailable !== false
        );
        const isSelected = size === currentCardSize;
        return `
          <button class="card-size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'out-of-stock' : ''}"
                  onclick="event.stopPropagation(); ${isAvailable ? `Store.changeCardSize('${productId}', '${size}')` : 'return false;'}"
                  ${!isAvailable ? 'disabled' : ''}
                  title="${isAvailable ? size : size + ' - Out of Stock'}">
            ${size}
            ${!isAvailable ? '<span class="out-of-stock-label">Out</span>' : ''}
          </button>
        `;
      }).join('');
    }

    // Update data attribute
    card.setAttribute('data-current-color', color);
  },

  // Change size on product card
  changeCardSize(productId, size) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Update internal state
    product._cardSize = size;

    // Update data attribute and visual state
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (card) {
      card.setAttribute('data-current-size', size);

      // Update size button selection state
      card.querySelectorAll('.card-size-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim().startsWith(size));
      });
    }
  },

  // Open product detail modal
  openProductModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Store current modal state
    this.modalProduct = product;
    this.modalSelectedColor = Object.keys(product.images || {})[0];
    this.modalSelectedSize = null;
    this.modalImageIndex = 0;

    // Render and show modal
    const modalHTML = this.renderProductModal(product);
    const modalContainer = document.getElementById('productModal');
    if (modalContainer) {
      modalContainer.innerHTML = modalHTML;
      modalContainer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  // Close product modal
  closeProductModal() {
    const modalContainer = document.getElementById('productModal');
    if (modalContainer) {
      modalContainer.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.modalProduct = null;
  },

  // Render product modal
  renderProductModal(product) {
    const colors = Object.keys(product.images || {});
    const sizes = [...new Set(product.variants?.map(v => v.size).filter(Boolean))] || [];

    const currentImages = product.images[this.modalSelectedColor] || [];

    return `
      <div class="modal-overlay" onclick="Store.closeProductModal()"></div>
      <div class="modal-content" onclick="event.stopPropagation()">
        <button class="modal-close-btn" onclick="Store.closeProductModal()">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <div class="modal-grid">
          <!-- Left: Image Carousel -->
          <div class="modal-image-section">
            <div class="modal-carousel">
              ${currentImages.length > 1 ? `
                <button class="modal-carousel-btn modal-carousel-prev" onclick="Store.modalPrevImage()">
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
              ` : ''}

              <img id="modalMainImage" src="${currentImages[this.modalImageIndex] || product.image_url}" alt="${product.name}" onclick="openImageZoom('${currentImages[this.modalImageIndex] || product.image_url}')">

              ${currentImages.length > 1 ? `
                <button class="modal-carousel-btn modal-carousel-next" onclick="Store.modalNextImage()">
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              ` : ''}
            </div>

            ${currentImages.length > 1 ? `
              <div class="modal-thumbnails">
                ${currentImages.map((img, idx) => `
                  <img src="${img}"
                       class="modal-thumbnail ${idx === this.modalImageIndex ? 'active' : ''}"
                       onclick="Store.modalGotoImage(${idx})"
                       alt="View ${idx + 1}">
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Right: Product Details -->
          <div class="modal-details-section">
            <h2 class="modal-title">${product.name}</h2>
            <div class="modal-price">$${(product.price / 100).toFixed(2)}</div>
            <p class="modal-description">${product.description || ''}</p>

            ${colors.length > 1 ? `
              <div class="modal-option-group">
                <label class="modal-option-label">Color</label>
                <div class="modal-color-options">
                  ${colors.map(color => `
                    <button class="modal-color-btn ${color === this.modalSelectedColor ? 'selected' : ''}"
                            onclick="Store.selectModalColor('${color}')"
                            title="${color}">
                      ${color}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${sizes.length > 0 ? `
              <div class="modal-option-group">
                <label class="modal-option-label">Size</label>
                <div class="modal-size-options">
                  ${sizes.map(size => `
                    <button class="modal-size-btn ${size === this.modalSelectedSize ? 'selected' : ''}"
                            onclick="Store.selectModalSize('${size}')">
                      ${size}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <button class="modal-add-to-cart" onclick="Store.addToCartFromModal()">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Modal image navigation
  modalPrevImage() {
    const images = this.modalProduct.images[this.modalSelectedColor];
    this.modalImageIndex = this.modalImageIndex === 0 ? images.length - 1 : this.modalImageIndex - 1;
    this.updateModalImage();
  },

  modalNextImage() {
    const images = this.modalProduct.images[this.modalSelectedColor];
    this.modalImageIndex = (this.modalImageIndex + 1) % images.length;
    this.updateModalImage();
  },

  modalGotoImage(index) {
    this.modalImageIndex = index;
    this.updateModalImage();
  },

  updateModalImage() {
    const img = document.getElementById('modalMainImage');
    const images = this.modalProduct.images[this.modalSelectedColor];
    if (img && images) {
      img.src = images[this.modalImageIndex];
      img.onclick = () => openImageZoom(images[this.modalImageIndex]);

      // Update thumbnail active state
      document.querySelectorAll('.modal-thumbnail').forEach((thumb, idx) => {
        thumb.classList.toggle('active', idx === this.modalImageIndex);
      });
    }
  },

  // Select color in modal (changes images)
  selectModalColor(color) {
    this.modalSelectedColor = color;
    // Preserve the current image index to stay on the same pose
    const currentIndex = this.modalImageIndex || 0;

    // Update color buttons
    document.querySelectorAll('.modal-color-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent.trim() === color);
    });

    // Update images
    const images = this.modalProduct.images[color];
    const img = document.getElementById('modalMainImage');
    if (img && images) {
      // Stay on the same pose/index if available
      const activeIndex = Math.min(currentIndex, images.length - 1);
      this.modalImageIndex = activeIndex;
      img.src = images[activeIndex];
      img.onclick = () => openImageZoom(images[activeIndex]);

      // Update thumbnails
      const thumbnailsContainer = document.querySelector('.modal-thumbnails');
      if (thumbnailsContainer && images.length > 1) {
        thumbnailsContainer.innerHTML = images.map((imgSrc, idx) => `
          <img src="${imgSrc}"
               class="modal-thumbnail ${idx === activeIndex ? 'active' : ''}"
               onclick="Store.modalGotoImage(${idx})"
               alt="View ${idx + 1}">
        `).join('');
      }
    }
  },

  // Select size in modal
  selectModalSize(size) {
    this.modalSelectedSize = size;
    document.querySelectorAll('.modal-size-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent.trim() === size);
    });
  },

  // Add to cart from modal
  addToCartFromModal() {
    if (!this.modalProduct) return;

    // Find matching variant
    const variant = this.modalProduct.variants?.find(v =>
      v.color === this.modalSelectedColor &&
      (this.modalSelectedSize ? v.size === this.modalSelectedSize : true)
    );

    if (!variant && this.modalSelectedSize) {
      alert('Please select a size');
      return;
    }

    const cartItem = {
      productId: this.modalProduct.id,
      name: this.modalProduct.name,
      price: variant?.price || this.modalProduct.price,
      image: this.modalProduct.images[this.modalSelectedColor]?.[0],
      variantId: variant?.id,
      size: this.modalSelectedSize,
      color: this.modalSelectedColor,
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
    this.closeProductModal();
    openCart(); // Open cart sidebar to show added item
  },

  // Quick add to cart from product card
  quickAddToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Get current selections from card
    const currentColor = product._cardColor || Object.keys(product.images || {})[0];
    let currentSize = product._cardSize;

    // If no size selected and product has sizes, use first available size for this color
    if (!currentSize && product.variants) {
      const variantsForColor = product.variants.filter(v => v.color === currentColor && v.size);
      if (variantsForColor.length > 0) {
        currentSize = variantsForColor[0].size;
      }
    }

    // Find matching variant
    const variant = product.variants?.find(v =>
      v.color === currentColor &&
      (currentSize ? v.size === currentSize : !v.size)
    );

    if (!variant) {
      console.error('No variant found for', { productId, currentColor, currentSize, availableVariants: product.variants });
      alert('Please select a size before adding to cart.');
      return;
    }

    const cartItem = {
      productId: product.id,
      name: product.name,
      price: variant.price || product.price,
      image: product.images[currentColor]?.[0],
      variantId: variant.id,
      size: currentSize || null,
      color: currentColor,
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
    openCart(); // Open cart sidebar to show added item
  },

  // Empty the cart
  emptyCart() {
    if (this.cart.length === 0) return;

    if (confirm('Are you sure you want to empty your cart?')) {
      this.cart = [];
      this.saveCart();
      this.updateCartUI();
    }
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
  Store.currentCategory = category;

  // Update button states
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(category) || (category === 'all' && btn.textContent === 'All Items'));
  });

  Store.renderProducts();
}

async function proceedToCheckout() {
  const btn = document.getElementById('checkoutBtn');

  if (!btn || btn.disabled) return;

  try {
    btn.disabled = true;
    btn.textContent = 'Creating checkout session...';

    // Create checkout session (Stripe will collect email and shipping)
    const response = await fetch(`${API_BASE_URL}/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: Store.cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        }))
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
  Store.init();
  console.log('✅ Store initialized');
});

// Close cart on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('cartSidebar')?.classList.contains('open')) {
    closeCart();
  }
});

// ============================================
// Image Zoom Functions
// ============================================
function openImageZoom(imageSrc) {
  const zoomModal = document.getElementById('imageZoomModal');
  const zoomImage = document.getElementById('zoomImage');

  if (zoomModal && zoomImage) {
    zoomImage.src = imageSrc;
    zoomModal.classList.add('active');
  }
}

function closeImageZoom() {
  const zoomModal = document.getElementById('imageZoomModal');
  if (zoomModal) {
    zoomModal.classList.remove('active');
  }
}

// Close zoom on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeImageZoom();
  }
});

// Expose globally for inline event handlers
window.Store = Store;
window.openCart = openCart;
window.closeCart = closeCart;
window.filterCategory = filterCategory;
window.proceedToCheckout = proceedToCheckout;
window.openImageZoom = openImageZoom;
window.closeImageZoom = closeImageZoom;

})(); // End IIFE
} // End duplicate check
