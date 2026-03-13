// Product Showcase App

class ProductShowcase {
    constructor(config = {}) {
        this.dataPath = config.dataPath || 'data/products.json';
        this.products = [];
        this.filteredProducts = [];
        this.activeTag = 'all';
        this.searchQuery = '';
        this._cardObserver = null;

        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.renderTags();
        this.renderProducts();
        this._createModal();

        const grid = document.getElementById('products-grid');
        grid.addEventListener('click', e => {
            if (e.target.closest('.buy-dropdown')) return;
            const card = e.target.closest('.product-card[data-id]');
            if (!card) return;
            const product = this.products.find(p => p.id === card.dataset.id);
            if (product) this._openModal(product);
        });
    }

    async loadProducts() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) throw new Error('Failed to load products');
            const data = await response.json();
            this.products = data.products;
            this.filteredProducts = [...this.products];
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError();
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterProducts();
        });

        // Tag filter clicks (event delegation)
        const tagFilters = document.getElementById('tag-filters');
        tagFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-btn')) {
                this.activeTag = e.target.dataset.tag;
                this.updateActiveTag();
                this.filterProducts();
            }
        });
    }

    getAllTags() {
        const tagsSet = new Set();
        this.products.forEach(product => {
            product.tags.forEach(tag => tagsSet.add(tag));
        });
        return Array.from(tagsSet).sort();
    }

    renderTags() {
        const tagFilters = document.getElementById('tag-filters');
        const allTags = this.getAllTags();
        
        // Add tag buttons after "All Products"
        allTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn px-4 py-2 rounded-full text-sm font-medium';
            btn.dataset.tag = tag;
            btn.textContent = this.capitalizeTag(tag);
            tagFilters.appendChild(btn);
        });
    }

    capitalizeTag(tag) {
        return tag.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    updateActiveTag() {
        const buttons = document.querySelectorAll('.tag-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tag === this.activeTag);
        });
    }

    filterProducts() {
        this.filteredProducts = this.products.filter(product => {
            // Tag filter
            const matchesTag = this.activeTag === 'all' || 
                product.tags.includes(this.activeTag);
            
            // Search filter
            const matchesSearch = this.searchQuery === '' ||
                product.title.toLowerCase().includes(this.searchQuery) ||
                product.description.toLowerCase().includes(this.searchQuery) ||
                product.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)) ||
                (product.details || []).some(d => d.value.toLowerCase().includes(this.searchQuery));
            
            return matchesTag && matchesSearch;
        });

        this.renderProducts();
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        const emptyState = document.getElementById('empty-state');
        const loadingState = document.getElementById('loading-state');

        // Hide loading state
        loadingState.classList.add('hidden');

        // Show/hide empty state
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // Render product cards
        grid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
        this._observeCards();
        this._setupCardTilt();
    }

    _observeCards() {
        if (this._cardObserver) this._cardObserver.disconnect();
        const cards = document.querySelectorAll('#products-grid .product-card');
        if (!('IntersectionObserver' in window)) {
            cards.forEach(card => card.classList.add('card-visible'));
            return;
        }
        this._cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const index = Array.from(cards).indexOf(card);
                    setTimeout(() => card.classList.add('card-visible'), index * 60);
                    this._cardObserver.unobserve(card);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
        cards.forEach(card => this._cardObserver.observe(card));
    }

    _setupCardTilt() {
        const cards = document.querySelectorAll('#products-grid .product-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                // Remove transition on transform during tilt for smooth tracking
                card.style.transition = 'box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.5s ease';
                const rect = card.getBoundingClientRect();
                const dx = (e.clientX - rect.left) / rect.width - 0.5;
                const dy = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(800px) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg) translateZ(8px) translateY(-6px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transition = '';
                card.style.transform = '';
            });
        });
    }

    createProductCard(product) {
        const linksHtml = product.links.map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer">
                ${this.getMarketplaceIcon(link.icon)}
                <span>Buy on ${link.name}</span>
            </a>
        `).join('');

        const messengerIcon = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.906 1.408 5.504 3.607 7.21V22l3.26-1.799A10.456 10.456 0 0012 20.487c5.523 0 10-4.145 10-9.244C22 6.145 17.523 2 12 2zm1.007 12.432l-2.548-2.717-4.974 2.717 5.476-5.813 2.61 2.717 4.912-2.717-5.476 5.813z"/></svg>`;
        const whatsappIcon  = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

        let contactHtml = '';
        if (product.contact && (product.contact.messenger || product.contact.whatsapp)) {
            const messengerLink = product.contact.messenger
                ? `<a href="${product.contact.messenger}" target="_blank" rel="noopener noreferrer" class="buy-contact-icon" aria-label="Message on Messenger">${messengerIcon}</a>`
                : '';
            const whatsappLink = product.contact.whatsapp
                ? `<a href="${product.contact.whatsapp}" target="_blank" rel="noopener noreferrer" class="buy-contact-icon buy-contact-icon--wa" aria-label="Message on WhatsApp">${whatsappIcon}</a>`
                : '';
            contactHtml = `
                <div class="buy-contact-row">
                    <span class="buy-contact-label">Contact Us</span>
                    <div class="buy-contact-icons">${messengerLink}${whatsappLink}</div>
                </div>`;
        }

        return `
            <article class="product-card rounded-xl shadow-md overflow-hidden" data-id="${product.id}">
                <div class="product-image-container">
                    <img 
                        src="${product.image}" 
                        alt="${product.title}"
                        loading="lazy"
                        onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'"
                    >
                </div>
                <div class="p-4">
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <h2 class="text-lg font-semibold text-gray-900 line-clamp-2">${product.title}</h2>
                        <span class="price-badge px-2 py-1 text-white text-sm font-bold rounded-lg whitespace-nowrap">
                            ${product.price}
                        </span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description}</p>
                    ${product.details && product.details.length ? `
                    <dl class="product-details">
                        ${product.details.map(d => `
                        <div class="product-detail-row">
                            <dt>${d.label}</dt>
                            <dd>${d.value}</dd>
                        </div>
                        `).join('')}
                    </dl>
                    ` : ''}
                    <div class="flex flex-wrap gap-1 mb-4">
                        ${product.tags.map(tag => `
                            <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                ${this.capitalizeTag(tag)}
                            </span>
                        `).join('')}
                    </div>
                    <div class="buy-dropdown w-full">
                        <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                            🛒 Buy Now
                        </button>
                        <div class="buy-dropdown-content">
                            ${linksHtml}${contactHtml}
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    getMarketplaceIcon(iconName) {
        const icons = {
            'ebay': `<svg class="marketplace-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5.869 8.17c-.957 0-1.729.197-2.318.592-.589.394-.883.955-.883 1.679 0 .551.177.983.533 1.297.355.314.874.56 1.557.739l1.03.27c.369.096.638.206.807.331.169.124.253.29.253.495 0 .287-.128.503-.383.648-.256.145-.622.217-1.099.217-.546 0-.965-.1-1.257-.301-.293-.201-.471-.505-.535-.912H2c.064.766.367 1.35.909 1.75.542.402 1.289.603 2.242.603 1.008 0 1.802-.203 2.38-.608.579-.405.868-.98.868-1.727 0-.574-.182-1.022-.546-1.345-.364-.323-.926-.58-1.686-.77l-.912-.229c-.4-.1-.686-.21-.858-.331-.172-.121-.258-.284-.258-.49 0-.27.116-.472.347-.608.231-.136.564-.204.999-.204.455 0 .803.086 1.044.258.24.172.4.437.478.795h1.588c-.077-.724-.355-1.27-.835-1.637-.48-.367-1.152-.55-2.018-.55l.127-.033zM21.999 8.293v5.534h-1.601v-.646c-.362.547-.966.82-1.812.82-.707 0-1.275-.238-1.704-.716-.43-.477-.644-1.114-.644-1.91 0-.81.215-1.455.643-1.933.43-.48.999-.72 1.711-.72.821 0 1.421.269 1.8.807v-.636l1.607-.6zm-2.85 4.601c.425 0 .759-.139.999-.417.241-.277.361-.66.361-1.149 0-.495-.12-.882-.361-1.161-.24-.279-.574-.419-.999-.419-.424 0-.756.14-.996.42-.24.278-.36.667-.36 1.166 0 .49.12.875.36 1.149.24.277.572.416.996.416v-.005zm-10.09-4.6c-.83 0-1.48.244-1.95.73-.47.487-.705 1.148-.705 1.984 0 .818.236 1.467.708 1.95.472.48 1.132.722 1.98.722.613 0 1.137-.114 1.57-.341.434-.227.773-.556 1.016-.987l-1.339-.423c-.176.231-.382.39-.617.479-.236.087-.509.131-.82.131-.42 0-.755-.11-.999-.331-.244-.22-.391-.548-.442-.983h4.353v-.438c0-.81-.23-1.445-.69-1.903-.46-.46-1.1-.688-1.92-.688l-.145-.002zm-.083 1.187c.362 0 .654.106.877.32.222.213.35.512.382.898h-2.59c.046-.392.178-.692.396-.9.218-.212.514-.318.888-.318h.047zm4.34 3.076c-.22 0-.407-.079-.56-.235-.153-.157-.229-.352-.229-.586 0-.225.076-.416.23-.573.152-.157.34-.235.558-.235.22 0 .407.078.56.235.153.157.23.348.23.573 0 .234-.077.429-.23.586-.153.157-.34.235-.56.235z"/></svg>`,
            'amazon': `<svg class="marketplace-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.66.66 0 0 1-.753.075c-1.057-.878-1.247-1.286-1.826-2.122-1.746 1.778-2.981 2.31-5.249 2.31-2.68 0-4.77-1.652-4.77-4.956 0-2.581 1.396-4.334 3.387-5.192 1.727-.756 4.137-.891 5.978-1.099v-.41c0-.753.057-1.642-.386-2.292-.378-.576-1.102-.815-1.742-.815-1.182 0-2.236.607-2.495 1.862-.052.28-.256.555-.54.569l-3.01-.326c-.254-.056-.536-.261-.463-.648.692-3.638 3.978-4.736 6.924-4.736 1.505 0 3.471.4 4.658 1.539 1.505 1.397 1.362 3.262 1.362 5.291v4.793c0 1.44.597 2.073 1.158 2.854.199.28.244.615-.01.82-.634.532-1.762 1.518-2.382 2.072l-.841-.611z"/></svg>`,
            'etsy': `<svg class="marketplace-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8.559 3.004c0-.473.309-.782.782-.782h7.764c1.237 0 2.182.473 2.182 2.037v2.618c0 .545-.327.836-.836.836s-.836-.291-.836-.836V5.259c0-.509-.327-.836-.836-.836H9.341v6.109h4.073c.509 0 .836.327.836.836s-.327.836-.836.836H9.341v6.982h5.236c.509 0 .836-.327.836-.836v-1.618c0-.545.327-.836.836-.836s.836.291.836.836v2.618c0 1.527-.909 2.037-2.182 2.037H9.341c-.473 0-.782-.309-.782-.782V3.004z"/></svg>`,
            'walmart': `<svg class="marketplace-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 7.5 3 8.5l4.5 5L6 20l6-3.5L18 20l-1.5-6.5 4.5-5-6.5-1L12 2z"/></svg>`,
            'default': `<svg class="marketplace-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM9 9h6v6H9z"/></svg>`
        };
        return icons[iconName] || icons['default'];
    }

    _createModal() {
        const el = document.createElement('div');
        el.innerHTML = `
            <div id="product-modal" class="product-modal-overlay"
                 role="dialog" aria-modal="true" aria-labelledby="modal-title-text">
                <div class="product-modal-container">
                    <button class="modal-close-btn" aria-label="Close">✕</button>
                    <div class="product-modal-layout">
                        <div class="modal-image-pane">
                            <img class="modal-img" src="" alt="" loading="lazy">
                        </div>
                        <div class="modal-info-pane">
                            <div class="modal-header">
                                <h2 id="modal-title-text" class="modal-title"></h2>
                                <span class="price-badge modal-price px-3 py-1.5 text-white text-base font-bold rounded-lg whitespace-nowrap"></span>
                            </div>
                            <p class="modal-description"></p>
                            <dl class="product-details modal-details"></dl>
                            <div class="flex flex-wrap gap-1 modal-tags"></div>
                            <div class="buy-dropdown w-full">
                                <button class="w-full text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                                    🛒 Buy Now
                                </button>
                                <div class="buy-dropdown-content modal-buy-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el.firstElementChild);

        const modal = document.getElementById('product-modal');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());
        modal.addEventListener('click', e => { if (e.target === modal) this._closeModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this._closeModal(); });
    }

    _openModal(product) {
        const modal = document.getElementById('product-modal');
        modal.querySelector('.modal-img').src = product.image;
        modal.querySelector('.modal-img').alt = product.title;
        modal.querySelector('.modal-title').textContent = product.title;
        modal.querySelector('.modal-price').textContent = product.price;
        modal.querySelector('.modal-description').textContent = product.description;

        modal.querySelector('.modal-details').innerHTML = (product.details || [])
            .map(d => `<div class="product-detail-row"><dt>${d.label}</dt><dd>${d.value}</dd></div>`)
            .join('');

        modal.querySelector('.modal-tags').innerHTML = (product.tags || [])
            .map(t => `<span class="tag-pill">${t}</span>`)
            .join('');

        modal.querySelector('.modal-buy-content').innerHTML = (product.links || [])
            .map(link => `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer">
                    ${this.getMarketplaceIcon(link.icon)}
                    <span>Buy on ${link.name}</span>
                </a>`)
            .join('');

        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        modal.querySelector('.modal-close-btn').focus();
    }

    _closeModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('is-open');
            document.body.style.overflow = '';
        }
    }

    showError() {
        const grid = document.getElementById('products-grid');
        const loadingState = document.getElementById('loading-state');
        loadingState.classList.add('hidden');
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <p class="text-red-600">Failed to load products. Please try again later.</p>
            </div>
        `;
    }
}

// Each page initializes its own instance via an inline script.
// Example: new ProductShowcase({ dataPath: 'data/calligraphy.json' })
