/**
 * CyberSmrt Universal Search System
 * Searches across main site content, blog posts, tools, and store products
 */

class CyberSmrtSearch {
  constructor() {
    this.searchIndex = [];
    this.storeProducts = [];
    this.isIndexLoaded = false;
    this.isStoreLoaded = false;

    // Initialize search
    this.init();
  }

  /**
   * Initialize search system
   */
  async init() {
    // Load search index
    await this.loadSearchIndex();

    // Load store products if we're on the store or if user searches
    this.loadStoreProducts();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Load main site search index
   */
  async loadSearchIndex() {
    try {
      // Build index from static content
      this.searchIndex = [
        // Main Pages
        { title: 'Home', url: '/', type: 'page', description: 'CyberSmrt - Nonprofit Cybersecurity Education' },
        { title: 'About Us', url: '/pages/about/', type: 'page', description: 'Learn about our mission and team' },
        { title: 'Mission', url: '/pages/about/mission', type: 'page', description: 'Our mission to bridge the cybersecurity skills gap' },
        { title: 'Team', url: '/pages/about/team', type: 'page', description: 'Meet the CyberSmrt team' },
        { title: 'Impact', url: '/pages/about/impact', type: 'page', description: 'Our impact on communities' },

        // Programs
        { title: 'Programs', url: '/pages/programs', type: 'page', description: 'All our cybersecurity programs' },
        { title: 'K-12 Curriculum', url: '/pages/programs/k12-curriculum.html', type: 'program', description: 'Free cybersecurity curriculum for K-12 schools' },
        { title: 'MSSP-lite Services', url: '/pages/programs/mssp-lite.html', type: 'program', description: 'Affordable managed security services' },
        { title: 'Workforce Development', url: '/pages/programs/workforce-dev.html', type: 'program', description: 'Cybersecurity career training programs' },
        { title: 'Community Outreach', url: '/pages/programs/community-outreach.html', type: 'program', description: 'Free cybersecurity workshops and events' },

        // Tools
        { title: 'Tools', url: '/pages/tools/', type: 'page', description: 'Free cybersecurity tools' },
        { title: 'Password Checker', url: '/pages/tools/password-checker', type: 'tool', description: 'Check password strength and security' },
        { title: 'Phishing Detector', url: '/pages/tools/phishing-detector', type: 'tool', description: 'Detect phishing emails and URLs' },
        { title: 'QR Code Tester', url: '/pages/tools/qr-tester', type: 'tool', description: 'Test QR codes for safety' },

        // Get Involved
        { title: 'Donate', url: '/pages/get-involved/donate.html', type: 'page', description: 'Support our mission with a donation' },
        { title: 'Volunteer', url: '/pages/get-involved/volunteer.html', type: 'page', description: 'Volunteer with CyberSmrt' },
        { title: 'Partner With Us', url: '/pages/get-involved/partner', type: 'page', description: 'Partnership opportunities' },

        // Blog
        { title: 'Blog', url: '/pages/blog/', type: 'page', description: 'CyberSmrt blog articles' },

        // Store
        { title: 'Store', url: '/store', type: 'page', description: 'Shop CyberSmrt merchandise' },
        { title: 'Order Lookup', url: '/store/order-lookup', type: 'page', description: 'Track your order' },

        // Contact
        { title: 'Contact', url: '/pages/contact', type: 'page', description: 'Get in touch with us' },
      ];

      this.isIndexLoaded = true;
      console.log('✅ Search index loaded:', this.searchIndex.length, 'items');
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  /**
   * Load store products for search
   */
  async loadStoreProducts() {
    try {
      console.log('🛍️ Loading store products for search...');
      const response = await fetch('/store/api/products');
      console.log('Store API response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Store API data:', data);

        this.storeProducts = (data.products || []).map(p => ({
          title: p.title,
          url: `/store#product-${p.id}`,
          type: 'product',
          description: p.description || p.title,
          price: p.markup_price ? `$${(p.markup_price / 100).toFixed(2)}` : '',
          image: p.default_image,
          tags: p.tags || []
        }));
        this.isStoreLoaded = true;
        console.log('✅ Store products loaded:', this.storeProducts.length, 'products');
      } else {
        console.warn('Store API returned non-OK status:', response.status);
      }
    } catch (error) {
      console.warn('Could not load store products for search:', error);
      // Add fallback static store items for common searches
      this.storeProducts = [
        {
          title: 'CyberSmrt T-Shirt',
          url: '/store',
          type: 'product',
          description: 'Official CyberSmrt branded t-shirt',
          tags: ['shirt', 'tshirt', 't-shirt', 'apparel', 'clothing']
        },
        {
          title: 'CyberSmrt Hoodie',
          url: '/store',
          type: 'product',
          description: 'Official CyberSmrt branded hoodie',
          tags: ['hoodie', 'sweatshirt', 'apparel', 'clothing']
        },
        {
          title: 'CyberSmrt Sticker',
          url: '/store',
          type: 'product',
          description: 'Official CyberSmrt stickers',
          tags: ['sticker', 'decal', 'accessories']
        }
      ];
      console.log('Using fallback store products:', this.storeProducts.length);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Wait for header to be loaded (since it's dynamically loaded)
    const trySetup = () => {
      const searchInputs = document.querySelectorAll('.header-search input, #search-input');

      if (searchInputs.length === 0) {
        // Header not loaded yet, try again
        setTimeout(trySetup, 100);
        return;
      }

      console.log('✅ Search: Found', searchInputs.length, 'search inputs');

      searchInputs.forEach(input => {
        // Remove existing listeners if any
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // Search on input
        newInput.addEventListener('input', (e) => {
          const query = e.target.value.trim();
          if (query.length >= 4) {
            this.performSearch(query);
          } else {
            this.hideResults();
          }
        });

        // Search on Enter
        newInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const query = e.target.value.trim();
            if (query.length >= 4) {
              this.performSearch(query);
            }
          }
        });
      });

      // Close results when clicking outside (only add once)
      if (!this.clickListenerAdded) {
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.header-search') && !e.target.closest('.search-results-modal')) {
            this.hideResults();
          }
        });
        this.clickListenerAdded = true;
      }
    };

    // Start trying to set up
    setTimeout(trySetup, 100);
  }

  /**
   * Perform search across all content
   */
  performSearch(query) {
    const normalizedQuery = query.toLowerCase();
    const results = [];
    const seenUrls = new Set();

    // Search main site content (static index)
    this.searchIndex.forEach(item => {
      const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
      const descMatch = item.description.toLowerCase().includes(normalizedQuery);

      if (titleMatch || descMatch) {
        results.push({
          ...item,
          relevance: titleMatch ? 10 : 5
        });
        seenUrls.add(item.url);
      }
    });

    // Search store products
    this.storeProducts.forEach(product => {
      const titleMatch = product.title.toLowerCase().includes(normalizedQuery);
      const descMatch = product.description.toLowerCase().includes(normalizedQuery);
      const tagsMatch = product.tags && product.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));

      if (titleMatch || descMatch || tagsMatch) {
        results.push({
          ...product,
          relevance: titleMatch ? 10 : (tagsMatch ? 8 : 4)
        });
        seenUrls.add(product.url);
      }
    });

    // Search current page DOM content
    const pageContent = this.searchPageContent(normalizedQuery);
    pageContent.forEach(item => {
      if (!seenUrls.has(item.url)) {
        results.push(item);
        seenUrls.add(item.url);
      }
    });

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Show results
    this.showResults(results, query);
  }

  /**
   * Search current page DOM content for matching text
   */
  searchPageContent(query) {
    const results = [];
    const currentUrl = window.location.pathname;

    // Search through main content sections
    const contentSelectors = [
      'main', 'article', '.section', '.content',
      'h1', 'h2', 'h3', 'p', 'li'
    ];

    contentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Skip header, footer, nav, and script elements
        if (element.closest('header, footer, nav, script, style, .no-translate')) {
          return;
        }

        const text = element.textContent;
        if (text && text.toLowerCase().includes(query)) {
          // Get a snippet of the matching text
          const index = text.toLowerCase().indexOf(query);
          const start = Math.max(0, index - 50);
          const end = Math.min(text.length, index + query.length + 50);
          const snippet = (start > 0 ? '...' : '') +
                         text.substring(start, end).trim() +
                         (end < text.length ? '...' : '');

          // Try to get a meaningful title
          let title = document.title || 'Current Page';

          // If it's a heading, use that as the title
          if (element.tagName.match(/^H[1-6]$/)) {
            title = element.textContent.trim();
          }
          // If element has an ID, try to create an anchor link
          const elementId = element.id || element.closest('[id]')?.id;
          const url = elementId ? `${currentUrl}#${elementId}` : currentUrl;

          // Check if we already have a result for this URL
          const existing = results.find(r => r.url === url && r.title === title);
          if (!existing) {
            results.push({
              title: title,
              url: url,
              type: 'page-content',
              description: snippet,
              relevance: element.tagName.match(/^H[1-6]$/) ? 7 : 3
            });
          }
        }
      });
    });

    return results;
  }

  /**
   * Show search results
   */
  showResults(results, query) {
    // Create or get results container
    let resultsContainer = document.getElementById('search-results-modal');

    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'search-results-modal';
      resultsContainer.className = 'search-results-modal';
      document.body.appendChild(resultsContainer);
    }

    // Build results HTML
    let html = `
      <div class="search-results-overlay" onclick="window.cyberSmrtSearch.hideResults()"></div>
      <div class="search-results-content">
        <div class="search-results-header">
          <h3>Search Results for "${query}"</h3>
          <button class="search-close-btn" onclick="window.cyberSmrtSearch.hideResults()" aria-label="Close search">✕</button>
        </div>
        <div class="search-results-list">
    `;

    if (results.length === 0) {
      html += `
        <div class="search-no-results">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <p>No results found for "${query}"</p>
          <p class="search-hint">Try a different search term or browse our <a href="/">main page</a></p>
        </div>
      `;
    } else {
      // Group results by type
      const grouped = {};
      results.forEach(result => {
        if (!grouped[result.type]) grouped[result.type] = [];
        grouped[result.type].push(result);
      });

      // Display each group
      Object.entries(grouped).forEach(([type, items]) => {
        html += `<div class="search-results-group">`;
        html += `<h4 class="search-group-title">${this.getTypeLabel(type)}</h4>`;

        items.forEach(item => {
          html += `
            <a href="${item.url}" class="search-result-item">
              ${item.image ? `<img src="${item.image}" alt="${item.title}" class="search-result-image">` : ''}
              <div class="search-result-content">
                <div class="search-result-title">${this.highlightQuery(item.title, query)}</div>
                <div class="search-result-description">${this.highlightQuery(item.description, query)}</div>
                ${item.price ? `<div class="search-result-price">${item.price}</div>` : ''}
              </div>
              <svg class="search-result-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          `;
        });

        html += `</div>`;
      });
    }

    html += `
        </div>
      </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide search results
   */
  hideResults() {
    const resultsContainer = document.getElementById('search-results-modal');
    if (resultsContainer) {
      resultsContainer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Get friendly label for content type
   */
  getTypeLabel(type) {
    const labels = {
      'page': 'Pages',
      'program': 'Programs',
      'tool': 'Tools',
      'product': 'Store Products',
      'blog': 'Blog Posts',
      'page-content': 'Page Content'
    };
    return labels[type] || type;
  }

  /**
   * Highlight search query in text
   */
  highlightQuery(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Initialize global search
window.cyberSmrtSearch = new CyberSmrtSearch();
