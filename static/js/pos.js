class FullScreenPOS {
    constructor() {
        this.cart = [];
        this.products = [];
        this.categories = new Set();
        this.currentCategory = 'all';
        this.init();
    }

    async init() {
        if (!document.getElementById('productsContainer')) return;
        console.log('🎯 FullScreen POS initializing');
        await this.loadProducts();
        this.initEvents();
        this.updateCartBadge();
        this.loadCartFromStorage();
        this.updateCartModal();
    }

    async loadProducts(search = '') {
        try {
            this.showLoader(true);
            let url = '/api/products';
            if (search) url += `?search=${encodeURIComponent(search)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            this.products = await res.json();
            this.renderProducts();
            this.extractCategories();
            this.updateStats();
            this.showLoader(false);
        } catch (e) {
            console.error(e);
            this.toast('Failed to load products', 'error');
            this.showLoader(false);
        }
    }

    renderProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        if (!this.products.length) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>No products</p></div>`;
            return;
        }

        container.innerHTML = this.products.map(p => {
            const stockClass = p.quantity <= 0 ? 'out' : (p.quantity < 10 ? 'low' : '');
            const stockText = p.quantity <= 0 ? 'Out of stock' : (p.quantity < 10 ? `Only ${p.quantity} left` : `${p.quantity} in stock`);
            return `
            <div class="product-card" data-id="${p.id}" data-price="${p.price}" data-stock="${p.quantity}">
                <div class="product-status ${stockClass}"></div>
                <div class="product-icon"><i class="fas fa-${this.getIcon(p.category)}"></i></div>
                <div class="product-name">${this.shorten(p.name, 30)}</div>
                <div class="product-price">Rs ${(p.price||0).toFixed(2)}</div>
                <div class="product-stock"><i class="fas fa-cubes"></i> ${stockText}</div>
                <button class="add-to-cart-btn" onclick="pos.addToCart(${p.id})" ${p.quantity <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>`;
        }).join('');
    }

    getIcon(cat) {
        const icons = { Electronics:'microchip', Clothing:'tshirt', Food:'apple-alt', Furniture:'chair', Stationery:'pen', Home:'home' };
        return icons[cat] || 'box';
    }

    extractCategories() {
        this.categories.clear();
        this.products.forEach(p => { if (p.category) this.categories.add(p.category); });
        this.renderCategories();
    }

    renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        let html = `<div class="category-pill active" data-category="all">ALL (${this.products.length})</div>`;
        [...this.categories].sort().forEach(cat => {
            const count = this.products.filter(p => p.category === cat).length;
            html += `<div class="category-pill" data-category="${cat}">${cat} (${count})</div>`;
        });
        container.innerHTML = html;
        document.querySelectorAll('.category-pill').forEach(p => {
            p.onclick = () => this.filterByCategory(p.dataset.category);
        });
    }

    filterByCategory(cat) {
        this.currentCategory = cat;
        document.querySelectorAll('.category-pill').forEach(p => p.classList.toggle('active', p.dataset.category === cat));
        const filtered = cat === 'all' ? this.products : this.products.filter(p => p.category === cat);
        const container = document.getElementById('productsContainer');
        if (!filtered.length) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>No products in ${cat}</p></div>`;
            return;
        }
        container.innerHTML = filtered.map(p => {
            const stockClass = p.quantity <= 0 ? 'out' : (p.quantity < 10 ? 'low' : '');
            const stockText = p.quantity <= 0 ? 'Out of stock' : (p.quantity < 10 ? `Only ${p.quantity} left` : `${p.quantity} in stock`);
            return `
            <div class="product-card" data-id="${p.id}" data-price="${p.price}" data-stock="${p.quantity}">
                <div class="product-status ${stockClass}"></div>
                <div class="product-icon"><i class="fas fa-${this.getIcon(p.category)}"></i></div>
                <div class="product-name">${this.shorten(p.name, 30)}</div>
                <div class="product-price">Rs ${(p.price||0).toFixed(2)}</div>
                <div class="product-stock"><i class="fas fa-cubes"></i> ${stockText}</div>
                <button class="add-to-cart-btn" onclick="pos.addToCart(${p.id})" ${p.quantity <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>`;
        }).join('');
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.quantity <= 0) {
            this.toast('Product not available', 'error');
            return;
        }
        const existing = this.cart.find(i => i.id === productId);
        if (existing) {
            if (existing.qty >= product.quantity) {
                this.toast(`Only ${product.quantity} left`, 'error');
                return;
            }
            existing.qty++;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                qty: 1,
                maxStock: product.quantity
            });
        }
        this.updateCartBadge();
        this.updateCartModal();
        this.saveCartToStorage();
        this.toast(`${product.name} added to cart`, 'success');
    }

    updateCartBadge() {
        const totalItems = this.cart.reduce((s, i) => s + i.qty, 0);
        const badge = document.getElementById('floatingCartCount');
        if (badge) badge.textContent = totalItems;
    }

    updateCartModal() {
        const container = document.getElementById('cartItemsModal');
        const subtotalEl = document.getElementById('modalSubtotal');
        const taxEl = document.getElementById('modalTax');
        const totalEl = document.getElementById('modalTotal');
        if (!container) return;

        if (!this.cart.length) {
            container.innerHTML = `<div class="empty-cart" style="text-align:center; padding:40px;"><i class="fas fa-shopping-cart fa-3x"></i><p>Your cart is empty</p></div>`;
            if (subtotalEl) subtotalEl.textContent = 'Rs 0.00';
            if (taxEl) taxEl.textContent = 'Rs 0.00';
            if (totalEl) totalEl.textContent = 'Rs 0.00';
            return;
        }

        container.innerHTML = this.cart.map((item, idx) => {
            const total = item.price * item.qty;
            return `
            <div class="cart-item-modal">
                <div class="cart-item-row">
                    <span>${this.shorten(item.name, 20)}</span>
                    <span>Rs ${item.price.toFixed(2)}</span>
                </div>
                <div class="cart-item-controls">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="pos.updateQty(${idx}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="pos.updateQty(${idx}, 1)">+</button>
                    </div>
                    <div>Rs ${total.toFixed(2)}</div>
                    <button class="remove-item" onclick="pos.removeItem(${idx})"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
        }).join('');

        const subtotal = this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const tax = subtotal * 0.01;
        const total = subtotal + tax;

        if (subtotalEl) subtotalEl.textContent = `Rs ${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `Rs ${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `Rs ${total.toFixed(2)}`;
    }

    updateQty(idx, delta) {
        const item = this.cart[idx];
        const newQty = item.qty + delta;
        if (newQty < 1) {
            this.removeItem(idx);
            return;
        }
        const product = this.products.find(p => p.id === item.id);
        if (product && newQty > product.quantity) {
            this.toast(`Only ${product.quantity} available`, 'error');
            return;
        }
        item.qty = newQty;
        this.updateCartBadge();
        this.updateCartModal();
        this.saveCartToStorage();
    }

    removeItem(idx) {
        const removed = this.cart.splice(idx, 1)[0];
        this.updateCartBadge();
        this.updateCartModal();
        this.saveCartToStorage();
        this.toast(`${removed.name} removed`, 'info');
    }

    clearCart() {
        if (!this.cart.length) return;
        if (confirm('Clear entire cart?')) {
            this.cart = [];
            this.updateCartBadge();
            this.updateCartModal();
            this.saveCartToStorage();
            this.toast('Cart cleared', 'info');
        }
    }

    // ========== CHECKOUT MODIFIED: Redirect to receipt page ==========
    async checkoutFromModal() {
        if (!this.cart.length) {
            this.toast('Cart empty', 'error');
            return;
        }
        const total = this.cart.reduce((s, i) => s + (i.price * i.qty), 0) * 1.01;
        if (!confirm(`Total: Rs ${total.toFixed(2)}\nConfirm sale?`)) return;

        // Close cart modal
        this.closeCart();

        const btn = document.querySelector('.btn-checkout-modal');
        const original = btn.innerText;
        btn.innerText = 'Processing...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: this.cart.map(i => ({ product_id: i.id, quantity: i.qty }))
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                localStorage.setItem('lastTransaction', JSON.stringify(data.transaction));
                this.toast('Sale completed!', 'success');
                
                // NEW: Redirect to separate receipt page
                window.location.href = `/receipt/${data.transaction.id}`;
                
                // Clear cart (will happen after redirect, but we do it anyway)
                this.cart = [];
                this.updateCartBadge();
                this.updateCartModal();
                this.saveCartToStorage();
                await this.loadProducts(); // refresh stock (though page will reload)
            } else {
                this.toast(data.error || 'Checkout failed', 'error');
            }
        } catch (e) {
            this.toast('Network error', 'error');
        } finally {
            btn.innerText = original;
            btn.disabled = false;
        }
    }

    // The old showReceipt method is no longer used, but kept for reference.
    // It will not be called because we redirected above.

    scanBarcode() {
        const input = document.getElementById('barcodeInput');
        const code = input.value.trim();
        if (!code) return;
        const product = this.products.find(p => p.barcode === code);
        if (product && product.quantity > 0) {
            this.addToCart(product.id);
            input.value = '';
        } else {
            this.toast('Product not found', 'error');
        }
    }

    search() {
        const val = document.getElementById('searchInput')?.value || '';
        this.loadProducts(val);
    }

    updateStats() {
        const el = document.getElementById('productCount');
        if (el) el.textContent = this.products.length;
    }

    shorten(s, max) { return s?.length > max ? s.substring(0,max)+'…' : s; }

    showLoader(show) {
        const loader = document.getElementById('productsLoader');
        const grid = document.getElementById('productsContainer');
        if (loader) loader.style.display = show ? 'block' : 'none';
        if (grid) grid.style.display = show ? 'none' : 'grid';
    }

    toast(msg, type) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed;bottom:90px;right:30px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
            document.body.appendChild(container);
        }
        const colors = { success:'#10b981', error:'#ef4444', info:'#3b82f6' };
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
        const toast = document.createElement('div');
        toast.style.cssText = `background:#1f2937; color:white; padding:12px 20px; border-radius:12px; display:flex; align-items:center; gap:10px; border-left:4px solid ${colors[type]}; box-shadow:0 5px 12px rgba(0,0,0,0.2); min-width:240px;`;
        toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]}"></i> ${msg}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    saveCartToStorage() {
        try { localStorage.setItem('posCart', JSON.stringify(this.cart)); } catch(e) {}
    }
    loadCartFromStorage() {
        try {
            const saved = localStorage.getItem('posCart');
            if (saved) { this.cart = JSON.parse(saved); this.updateCartBadge(); this.updateCartModal(); }
        } catch(e) {}
    }

    openCart() {
        const modal = document.getElementById('cartModal');
        if (modal) modal.style.display = 'block';
    }
    closeCart() {
        const modal = document.getElementById('cartModal');
        if (modal) modal.style.display = 'none';
    }

    initEvents() {
        const search = document.getElementById('searchInput');
        if (search) {
            let timer;
            search.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => this.search(), 400);
            });
        }
        const barcode = document.getElementById('barcodeInput');
        if (barcode) barcode.addEventListener('keypress', e => { if (e.key === 'Enter') this.scanBarcode(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'F1') { e.preventDefault(); this.clearCart(); }
            if (e.key === 'F2') { e.preventDefault(); this.openCart(); }
        });
        window.onclick = (e) => {
            const modal = document.getElementById('cartModal');
            if (e.target === modal) this.closeCart();
        };
    }
}

let pos;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('productsContainer')) {
        pos = new FullScreenPOS();
        window.pos = pos;
    }
});