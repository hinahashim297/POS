let products = [];
let cart = [];
let categories = [];
let html5QrCode = null;

// ===== BARCODE SCANNER FUNCTIONS =====
function openScanner() {
    const modal = document.getElementById('scanner-modal');
    if (modal) {
        modal.style.display = 'block';
    }
    
    html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "user" },
        { fps: 10, qrbox: { width: 280, height: 150 } },
        (decodedText) => {
            playBeep();
            document.getElementById('barcodeInput').value = decodedText;
            
            // Find product by barcode
            const product = products.find(p => p.barcode === decodedText);
            if (product) {
                addToCart(product.id);
                showToast('OK: Product added: ' + product.name, 'success');
            } else {
                // Search by barcode
                fetch(`/api/products?search=${encodeURIComponent(decodedText)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.length > 0) {
                            addToCart(data[0].id);
                            showToast('OK: Product added: ' + data[0].name, 'success');
                        } else {
                            showToast('⚠️ Product not found', 'warning');
                        }
                    });
            }
            closeScanner();
        },
        (error) => {
            console.log("Scanning...");
        }
    ).catch(err => {
        console.error("Camera error:", err);
        alert("Unable to access camera. Please check permissions.");
        closeScanner();
    });
}

function closeScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            const modal = document.getElementById('scanner-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }).catch(err => {
            console.error("Error stopping scanner:", err);
            const modal = document.getElementById('scanner-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    } else {
        const modal = document.getElementById('scanner-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.2;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
        audioContext.resume();
    } catch(e) {
        console.log("Beep not supported");
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.background = type === 'success' ? '#10b981' : '#f59e0b';
    toast.style.color = 'white';
    toast.innerHTML = `
        <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ===== CHECKOUT MODAL VARIABLES =====
let currentTotalAmount = 0;
let currentPaymentMethod = 'cash';
let isModalOpen = false;

// OK: FIXED: selectPaymentMethod with proper modal handling
function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active'));
    // Find the clicked card and add active class
    const clickedCard = document.querySelector(`.method-card[data-method="${method}"]`);
    if (clickedCard) clickedCard.classList.add('active');
    
    const qrSection = document.getElementById('qrSection');
    const cashSection = document.getElementById('cashSection');
    const digitalSection = document.getElementById('digitalSection');
    
    qrSection.style.display = 'none';
    cashSection.style.display = 'none';
    digitalSection.style.display = 'none';
    
    if (method === 'cash') {
        cashSection.style.display = 'block';
        setTimeout(() => document.getElementById('receivedAmount').focus(), 100);
    } else if (method === 'easypaisa' || method === 'jazzcash') {
        qrSection.style.display = 'block';
        digitalSection.style.display = 'block';
        document.getElementById('qrProviderName').innerText = method.toUpperCase();
        setTimeout(() => document.getElementById('transactionId').focus(), 100);
    } else if (method === 'card') {
        digitalSection.style.display = 'block';
        setTimeout(() => document.getElementById('transactionId').focus(), 100);
    }
}

// OK: FIXED: calculateChange with NEGATIVE VAULT PREVENTION
function calculateChange() {
    let received = parseFloat(document.getElementById('receivedAmount').value) || 0;
    const negativeError = document.getElementById('negativeError');
    const receivedInput = document.getElementById('receivedAmount');
    
    // OK: NEGATIVE CHECK - NO NEGATIVE VAULT ALLOWED
    if (receivedInput.value.startsWith('-') || received < 0) {
        negativeError.style.display = 'block';
        receivedInput.value = 0;
        received = 0;
    } else {
        negativeError.style.display = 'none';
    }
    
    const change = received - currentTotalAmount;
    const changeElement = document.getElementById('changeAmount');
    const completeBtn = document.getElementById('completeTransactionBtn');
    
    if (change >= 0 && received > 0) {
        changeElement.innerText = currencySymbol + ' ' + change.toLocaleString(undefined, {minimumFractionDigits: 2});
        changeElement.style.color = '#10b981';
        completeBtn.disabled = false;
    } else if (received === 0) {
        changeElement.innerText = currencySymbol + ' 0.00';
        changeElement.style.color = '#10b981';
        completeBtn.disabled = true;
    } else {
        changeElement.innerText = currencySymbol + ' 0.00';
        changeElement.style.color = '#ef4444';
        completeBtn.disabled = true;
    }
}

function openCheckoutModal() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    if (discountValue < 0) discountValue = 0;
    const discountType = document.querySelector('input[name="discountType"]:checked').value;
    let discountAmount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
    let afterDiscount = Math.max(0, subtotal - discountAmount);
    let taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    if (taxRate < 0) taxRate = 0;
    let taxAmount = afterDiscount * (taxRate / 100);
    let total = afterDiscount + taxAmount;
    
    currentTotalAmount = total;
    document.getElementById('modalTotalAmount').innerText = currencySymbol + ' ' + total.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('receivedAmount').value = '';
    document.getElementById('changeAmount').innerText = currencySymbol + ' 0.00';
    document.getElementById('transactionId').value = '';
    document.getElementById('checkoutModal').style.display = 'flex';
    isModalOpen = true;
    
    // Reset to Cash method by default
    currentPaymentMethod = 'cash';
    document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active'));
    const cashCard = document.querySelector('.method-card[data-method="cash"]');
    if (cashCard) cashCard.classList.add('active');
    document.getElementById('qrSection').style.display = 'none';
    document.getElementById('cashSection').style.display = 'block';
    document.getElementById('digitalSection').style.display = 'none';
    document.getElementById('negativeError').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('receivedAmount').focus();
    }, 100);
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
    isModalOpen = false;
}

// OK: FIXED: confirmTransaction with proper validation
async function confirmTransaction() {
    if (currentPaymentMethod !== 'cash') {
        const txnId = document.getElementById('transactionId').value.trim();
        if (!txnId) {
            alert('❌ Please enter Transaction ID');
            document.getElementById('transactionId').focus();
            return;
        }
    } else {
        let received = parseFloat(document.getElementById('receivedAmount').value) || 0;
        // Final negative check
        if (received < 0) {
            alert('❌ Invalid amount! Negative values are not allowed.');
            document.getElementById('receivedAmount').value = 0;
            return;
        }
        if (received < currentTotalAmount) {
            alert(`❌ Amount received is less than total amount!\nNeed: ${currencySymbol} ${currentTotalAmount.toFixed(2)}\nReceived: ${currencySymbol} ${received.toFixed(2)}`);
            return;
        }
    }
    
    const completeBtn = document.getElementById('completeTransactionBtn');
    completeBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
    completeBtn.disabled = true;
    
    await processCheckout();
    
    completeBtn.innerHTML = '<i class="bi bi-check-circle"></i> COMPLETE TRANSACTION (F10)';
    closeCheckoutModal();
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
    if (e.key === "F2") { e.preventDefault(); document.getElementById('barcodeInput').focus(); }
    if (e.key === "F4") { e.preventDefault(); openCheckoutModal(); }
    if (e.key === "Escape") { 
        if (isModalOpen) {
            closeCheckoutModal();
        } else {
            if (cart.length > 0 && confirm('Clear entire cart?')) clearCart();
        }
    }
});

// OK: FIXED: Close modal when clicking overlay
document.getElementById('checkoutModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeCheckoutModal();
    }
});

// ===== ORIGINAL POS FUNCTIONS =====
async function loadProducts() {
    const search = document.getElementById('searchInput').value;
    const activeCat = document.querySelector('.category-chip.active')?.dataset.category || 'all';
    let url = '/api/products';
    let params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (activeCat !== 'all') params.push(`category=${encodeURIComponent(activeCat)}`);
    if (params.length) url += '?' + params.join('&');
    
    try {
        const res = await fetch(url);
        products = await res.json();
        renderProducts();
    } catch (error) { console.error('Error:', error); }
}

// renderProducts with ADD TO CART button
function renderProducts() {
    const container = document.getElementById('productsContainer');
    if (!products.length) { 
        container.innerHTML = '<div style="text-align: center; padding: 40px;">No products found</div>'; 
        return; 
    }
    
    container.innerHTML = products.map(p => {
        const price = Number(p.price) || 0;
        const quantity = Number(p.quantity) || 0;
        const productName = p.name ? escapeHtml(p.name) : 'Unnamed Product';
        
        let stockClass = '';
        let stockText = '';
        if (quantity === 0) {
            stockClass = 'stock-out';
            stockText = 'Out of Stock';
        } else if (quantity < 10) {
            stockClass = 'stock-low';
            stockText = 'Low Stock';
        } else {
            stockClass = 'stock-good';
            stockText = 'In Stock';
        }
        
        return `
            <div class="product-row">
                <div class="product-info">
                    <div class="product-name">${productName}</div>
                    <div class="product-meta">
                        <span>Stock: ${quantity}</span>
                        <span class="stock-badge ${stockClass}">${stockText}</span>
                    </div>
                </div>
                <div class="product-price">${currencySymbol} ${price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <button class="add-to-cart-btn" onclick="addToCart(${p.id})">&#x1F6D2; Add to Cart</button>
            </div>
        `;
    }).join('');
}

async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        categories = await res.json();
        const container = document.getElementById('categoriesContainer');
        categories.forEach(cat => {
            if (cat) {
                const btn = document.createElement('button');
                btn.className = 'category-chip';
                btn.dataset.category = cat;
                btn.textContent = cat;
                btn.onclick = () => filterByCategory(cat);
                container.appendChild(btn);
            }
        });
    } catch (error) { console.error('Error:', error); }
}

function filterByCategory(category) {
    document.querySelectorAll('.category-chip').forEach(btn => btn.classList.remove('active'));
    const target = category === 'all' 
        ? document.querySelector('.category-chip[data-category="all"]') 
        : document.querySelector(`.category-chip[data-category="${category}"]`);
    if (target) target.classList.add('active');
    loadProducts();
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const quantity = Number(product.quantity) || 0;
    if (quantity === 0) { 
        alert('Product out of stock!'); 
        return; 
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity + 1 > quantity) { 
            alert('Not enough stock!'); 
            return; 
        }
        existing.quantity++;
    } else {
        const price = Number(product.price) || 0;
        cart.push({ 
            id: product.id, 
            name: product.name || 'Unnamed', 
            price: price, 
            quantity: 1, 
            maxStock: quantity 
        });
    }
    updateCartUI();
    showToast('OK: ' + product.name + ' added to cart!', 'success');
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Cart is empty</p><small>Click on products to add</small></div>`;
    } else {
        container.innerHTML = cart.map(item => {
            const price = Number(item.price) || 0;
            const total = price * item.quantity;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${escapeHtml(item.name)}</div>
                        <div class="cart-item-price">${currencySymbol} ${price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="cart-item-total">${currencySymbol} ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }).join('');
    }
    calculateTotal();
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        const newQty = item.quantity + change;
        if (newQty <= 0) removeFromCart(productId);
        else if (newQty <= item.maxStock) { item.quantity = newQty; updateCartUI(); }
        else alert('Not enough stock!');
    }
}

function removeFromCart(productId) { 
    cart = cart.filter(i => i.id !== productId); 
    updateCartUI(); 
}

function clearCart() { 
    if (confirm('Clear entire cart?')) {
        cart = []; 
        updateCartUI(); 
    }
}

function calculateTotal() {
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    if (discountValue < 0) discountValue = 0;
    const discountType = document.querySelector('input[name="discountType"]:checked').value;
    let discountAmount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
    let afterDiscount = Math.max(0, subtotal - discountAmount);
    
    let taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    if (taxRate < 0) taxRate = 0;
    let taxAmount = afterDiscount * (taxRate / 100);
    let total = afterDiscount + taxAmount;
    
    document.getElementById('subtotal').innerHTML = `${currencySymbol} ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('discountAmount').innerHTML = `-${currencySymbol} ${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('taxAmount').innerHTML = `+${currencySymbol} ${taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('total').innerHTML = `${currencySymbol} ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

async function scanBarcode() {
    const code = document.getElementById('barcodeInput').value;
    if (!code) return;
    try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.length > 0) addToCart(data[0].id);
        else alert('Product not found!');
    } catch (error) { alert('Error scanning barcode'); }
    document.getElementById('barcodeInput').value = '';
    document.getElementById('barcodeInput').focus();
}

async function loadCustomers() {
    try {
        const res = await fetch('/api/customers');
        const customers = await res.json();
        const select = document.getElementById('customerSelect');
        customers.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.name} ${c.is_default ? '(Walk-in)' : ''}`;
            select.appendChild(option);
        });
    } catch (error) { console.error('Error:', error); }
}

async function processCheckout() {
    let discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    if (discountValue < 0) discountValue = 0;
    const discountType = document.querySelector('input[name="discountType"]:checked').value;
    const customerId = document.getElementById('customerSelect').value;
    let taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    if (taxRate < 0) taxRate = 0;
    
    let paymentReference = null;
    if (currentPaymentMethod !== 'cash') {
        paymentReference = document.getElementById('transactionId').value.trim();
    }
    
    const data = { 
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })), 
        discount: discountValue, 
        discount_type: discountType, 
        customer_id: customerId || null,
        tax_rate: taxRate,
        payment_method: currentPaymentMethod,
        payment_reference: paymentReference
    };
    
    try {
        const res = await fetch('/api/checkout', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });
        const result = await res.json();
        if (result.success) {
            let msg = `OK: Sale completed!\nTotal: ${currencySymbol} ${result.transaction.total.toLocaleString()}\nPayment Method: ${currentPaymentMethod.toUpperCase()}`;
            if (paymentReference) msg += `\nReference: ${paymentReference}`;
            alert(msg);
            
            cart = []; 
            updateCartUI(); 
            document.getElementById('discountValue').value = '0'; 
            document.getElementById('taxRate').value = defaultTaxRate;
            document.getElementById('transactionId').value = '';
            loadProducts();
            if (result.receipt_url) {
                const received = parseFloat(document.getElementById('receivedAmount').value) || result.transaction.total;
                const changeDue = Math.max(0, received - result.transaction.total);
                const receiptUrl = result.receipt_url + `&cash=${received.toFixed(2)}&change=${changeDue.toFixed(2)}`;
                window.open(receiptUrl, '_blank');
            }
        } else {
            alert(result.error || 'Checkout failed');
        }
    } catch (error) { 
        alert('Error processing checkout'); 
    }
}

function escapeHtml(str) { 
    if (!str) return ''; 
    return str.replace(/[&<>]/g, function(m) { 
        if (m === '&') return '&amp;'; 
        if (m === '<') return '&lt;'; 
        if (m === '>') return '&gt;'; 
        return m; 
    }); 
}

document.getElementById('discountValue').addEventListener('input', function() {
    if (this.value < 0) this.value = 0;
    calculateTotal();
});
document.getElementById('taxRate').addEventListener('input', function() {
    if (this.value < 0) this.value = 0;
    calculateTotal();
});
document.querySelectorAll('input[name="discountType"]').forEach(radio => { 
    radio.addEventListener('change', () => calculateTotal()); 
});

// OK: BACK BUTTON HANDLING - Close modal first, then go back
document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    if (isModalOpen) {
        closeCheckoutModal();
    } else {
        window.history.back();
    }
});

// Browser back button handling
window.addEventListener('popstate', function() {
    if (isModalOpen) {
        closeCheckoutModal();
        history.pushState(null, null, location.href);
    }
});
history.pushState(null, null, location.href);

document.addEventListener('DOMContentLoaded', () => { 
    loadCategories(); 
    loadProducts(); 
    loadCustomers();
    // Set tax rate from settings
    const taxInput = document.getElementById('taxRate');
    if (taxInput && defaultTaxRate) {
        taxInput.value = defaultTaxRate;
    }
    setInterval(loadProducts, 30000); 
});
