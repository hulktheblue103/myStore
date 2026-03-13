// HeroSlider — fetches JSON, filters featured products, builds auto-playing slider.

class HeroSlider {
    constructor({ dataPath, containerId } = {}) {
        this.dataPath = dataPath || 'data/products.json';
        this.containerId = containerId || 'hero-slider';
        this.slides = [];
        this.currentIndex = 0;
        this.autoPlayTimer = null;
        this._hovered = false;
        this._track = null;
        this._init();
    }

    async _init() {
        try {
            const res = await fetch(this.dataPath);
            if (!res.ok) throw new Error('Failed to fetch slider data');
            const data = await res.json();
            this.slides = (data.products || []).filter(p => p.featured === true);
        } catch (e) {
            console.error('HeroSlider:', e);
            this.slides = [];
        }
        this._render();
    }

    _render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (this.slides.length === 0) {
            container.style.display = 'none';
            return;
        }

        const hasMultiple = this.slides.length > 1;

        container.innerHTML = `
            <div class="slide-track-wrapper">
                <div class="slide-track" id="${this.containerId}-track">
                    ${this.slides.map((s, i) => this._slideHTML(s, i)).join('')}
                </div>
            </div>
            ${hasMultiple ? `
            <button class="slider-arrow slider-arrow-prev" aria-label="Previous slide">
                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
            </button>
            <button class="slider-arrow slider-arrow-next" aria-label="Next slide">
                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
            </button>
            <div class="slider-dots">
                ${this.slides.map((_, i) => `
                    <button class="slider-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>
                `).join('')}
            </div>
            ` : ''}
        `;

        this._track = container.querySelector('.slide-track');

        // Activate first slide: Ken Burns + content entrance animation
        requestAnimationFrame(() => {
            const firstSlide = container.querySelector('.hero-slide');
            if (firstSlide) firstSlide.classList.add('is-active');
            const firstContent = container.querySelector('.hero-slide-content');
            if (firstContent) firstContent.classList.add('animating');
        });

        if (hasMultiple) {
            container.querySelector('.slider-arrow-prev').addEventListener('click', () => {
                this.prev();
                this._resetAutoPlay();
            });
            container.querySelector('.slider-arrow-next').addEventListener('click', () => {
                this.next();
                this._resetAutoPlay();
            });
            container.querySelector('.slider-dots').addEventListener('click', (e) => {
                const dot = e.target.closest('.slider-dot');
                if (dot) {
                    this.goTo(parseInt(dot.dataset.index, 10));
                    this._resetAutoPlay();
                }
            });
            this._startAutoPlay();
            this._setupSwipe(container);
            container.addEventListener('mouseenter', () => { this._hovered = true; clearInterval(this.autoPlayTimer); });
            container.addEventListener('mouseleave', () => { this._hovered = false; this._startAutoPlay(); });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(this.autoPlayTimer);
            } else if (hasMultiple) {
                this._startAutoPlay();
            }
        });
    }

    _slideHTML(product, i) {
        const firstLink = product.links && product.links[0];
        return `
            <div class="hero-slide" role="group" aria-label="Slide ${i + 1} of ${this.slides.length}">
                <div class="hero-slide-image">
                    <img
                        src="${product.image}"
                        alt="${product.title}"
                        loading="${i === 0 ? 'eager' : 'lazy'}"
                        onerror="this.src='https://via.placeholder.com/600x420?text=No+Image'"
                    >
                </div>
                <div class="hero-slide-content">
                    <h2>${product.title}</h2>
                    <p>${product.description}</p>
                    ${product.details && product.details.length ? `
                    <dl class="product-details product-details--slider">
                        ${product.details.map(d => `
                        <div class="product-detail-row">
                            <dt>${d.label}</dt>
                            <dd>${d.value}</dd>
                        </div>
                        `).join('')}
                    </dl>
                    ` : ''}
                    <div class="hero-slide-price">${product.price}</div>
                    ${firstLink ? `<a class="hero-slide-buy" href="${firstLink.url}" target="_blank" rel="noopener noreferrer">Shop Now</a>` : ''}
                </div>
            </div>
        `;
    }

    goTo(index) {
        this.currentIndex = ((index % this.slides.length) + this.slides.length) % this.slides.length;
        if (this._track) {
            this._track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        }
        const container = document.getElementById(this.containerId);
        if (container) {
            // Update dot active states
            container.querySelectorAll('.slider-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === this.currentIndex);
            });

            // Ken Burns: restart animation on newly active slide
            container.querySelectorAll('.hero-slide').forEach((slide, i) => {
                if (i === this.currentIndex) {
                    slide.classList.remove('is-active');
                    void slide.offsetWidth; // force reflow to restart animation
                    slide.classList.add('is-active');
                } else {
                    slide.classList.remove('is-active');
                }
            });

            // Content stagger: replay entrance on newly active slide
            const activeContent = container.querySelectorAll('.hero-slide-content')[this.currentIndex];
            if (activeContent) {
                activeContent.classList.remove('animating');
                void activeContent.offsetWidth;
                activeContent.classList.add('animating');
            }
        }
    }

    next() { this.goTo(this.currentIndex + 1); }
    prev() { this.goTo(this.currentIndex - 1); }

    _startAutoPlay() {
        clearInterval(this.autoPlayTimer);
        this.autoPlayTimer = setInterval(() => this.next(), 4000);
    }

    _resetAutoPlay() {
        if (!this._hovered) this._startAutoPlay();
    }

    _setupSwipe(container) {
        let startX = 0;
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        container.addEventListener('touchend', (e) => {
            const delta = startX - e.changedTouches[0].clientX;
            if (Math.abs(delta) > 50) {
                delta > 0 ? this.next() : this.prev();
                this._resetAutoPlay();
            }
        }, { passive: true });
    }
}
