/* ===== INVENTORY MANAGEMENT FUNCTIONS ===== */

let allProducts = [];
let allSuppliers = [];
let deleteId = null;
let deleteModal;
let allCategories = [];

async function loadSuppliers() {
    try {
        const res = await fetch('/api/suppliers');
        allSuppliers = await res.json();
        const sel = document.getElementById('productSupplier');
        if (sel) {
            sel.innerHTML = '<option value="">— Select Supplier —</option>';
            allSuppliers.forEach(s => {
                const o = document.createElement('option');
                o.value = s.id;
                o.textContent = `${s.name}${s.is_active ? '' : ' (Inactive)'}`;
                sel.appendChild(o);
            });
        }
    } catch (e) { console.error('Error loading suppliers:', e); }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        allCategories = await res.json();
        ['categoryFilter', 'productCategory'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const isFilter = id === 'categoryFilter';
            sel.innerHTML = isFilter ? '<option value="">All Categories</option>' : '<option value="">— Select Category —</option>';
            allCategories.forEach(cat => {
                const o = document.createElement('option');
                o.value = cat;
                o.textContent = cat;
                sel.appendChild(o);
            });
        });
    } catch (e) { console.error('Error loading categories:', e); }
}

async function loadProducts() {
    try {
        const search = document.getElementById('searchInput')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const stockStatus = document.getElementById('stockFilter')?.value || '';
        const expiryFilter = document.getElementById('expiryFilter')?.value || '';
        
        let url = '/api/products?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (stockStatus) url += `stock_status=${encodeURIComponent(stockStatus)}&`;
        if (expiryFilter) url += `expiry_filter=${encodeURIComponent(expiryFilter)}&`;
        
        const res = await fetch(url);
        allProducts = await res.json();
        updateStats();
        renderTable();
    } catch (e) {
        console.error('Error loading products:', e);
        const tb = document.getElementById('productsTable');
        if (tb) tb.innerHTML = '<tr><td colspan="11" class="text-center text-danger py-5">Failed to load products</td></tr>';
    }
}

function updateStats() {
    const total = allProducts.length;
    const inStock = allProducts.filter(p => p.quantity > 0).length;
    const low = allProducts.filter(p => p.quantity < 10 && p.quantity > 0).length;
    const out = allProducts.filter(p => p.quantity === 0).length;
    
    [
        ['totalProductsCount', total],
        ['inStockCount', inStock],
        ['lowStockCount', low],
        ['outStockCount', out]
    ].forEach(([id, v]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = v;
    });
}

function getStockBadge(qty) {
    if (qty <= 0) return '<span class="badge badge-danger">Out of Stock</span>';
    if (qty < 5) return '<span class="badge badge-danger">Critical</span>';
    if (qty < 10) return '<span class="badge badge-warning">Low Stock</span>';
    return '<span class="badge badge-success">In Stock</span>';
}

function getExpiryBadge(d) {
    if (!d || ['null', '', 'None'].includes(String(d))) {
        return '<span style="color:var(--muted)">—</span>';
    }
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(d);
        exp.setHours(0, 0, 0, 0);
        
        if (isNaN(exp.getTime())) {
            return `<span style="color:var(--muted)">${d}</span>`;
        }
        
        if (exp < today) {
            return '<span class="badge badge-danger">Expired</span>';
        }
        
        const days = Math.ceil((exp - today) / 86400000);
        if (days <= 30) {
            return `<span class="badge badge-warning">${days}d left</span>`;
        }
        
        return `<span class="badge badge-success">${d}</span>`;
    } catch (e) {
        return `<span style="color:var(--muted)">${d || '—'}</span>`;
    }
}

function getSupplierName(id) {
    if (!id) return '<span style="color:var(--muted)">—</span>';
    const s = allSuppliers.find(x => x.id == id);
    return s ? `<span style="color:var(--muted);font-size:13px;">${escapeHtml(s.name)}</span>` : '<span style="color:var(--muted)">—</span>';
}

function renderTable() {
    const tb = document.getElementById('productsTable');
    if (!tb) return;
    
    if (!allProducts.length) {
        tb.innerHTML = `<tr><td colspan="11" class="text-center py-5" style="color:var(--muted);">
            <i class="bi bi-inbox" style="font-size:36px;display:block;margin-bottom:10px;opacity:0.4;"></i>
            No products found
        </td></tr>`;
        return;
    }
    
    tb.innerHTML = allProducts.map(p => {
        const pp = `PKR ${(parseFloat(p.purchase_price) || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
        const sp = `PKR ${(parseFloat(p.price) || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
        const letter = (p.name || '?')[0].toUpperCase();
        
        return `<tr>
            <td class="prod-id">#${p.id}</td>
            <td><div class="prod-name-cell"><span class="prod-avatar">${escapeHtml(letter)}</span><span style="font-weight:700;">${escapeHtml(p.name)}</span></div></td>
            <td><span class="sku-code">${escapeHtml(p.sku) || '—'}</span></td>
            <td style="color:var(--muted);font-size:12px;">${escapeHtml(p.barcode) || '—'}</td>
            <td><span class="badge badge-category">${escapeHtml(p.category) || 'Uncategorized'}</span></td>
            <td>${getSupplierName(p.supplier_id)}</td>
            <td class="price-buy">${pp}</td>
            <td class="price-sell">${sp}</td>
            <td><div class="stock-wrap"><span class="stock-num">${p.quantity}</span>${getStockBadge(p.quantity)}</div></td>
            <td>${getExpiryBadge(p.expiry_date)}</td>
            <td>
                <button class="act-btn act-edit" onclick="editProduct(${p.id})" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button class="act-btn act-delete" onclick="showDeleteModal(${p.id})" title="Delete"><i class="bi bi-trash3"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function resetFilters() {
    ['searchInput', 'categoryFilter', 'stockFilter', 'expiryFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    loadProducts();
}

function resetModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-plus-circle-fill"></i> Add New Product';
    
    ['productId', 'productName', 'productSku', 'productBarcode', 'productPrice', 'productExpiryDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    ['productPurchasePrice', 'productQuantity'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '0';
    });
    
    const cat = document.getElementById('productCategory');
    if (cat) cat.value = '';
    
    const sup = document.getElementById('productSupplier');
    if (sup) sup.value = '';
    
    const csd = document.getElementById('currentStockDisplay');
    if (csd) csd.style.display = 'none';
    
    const pp = document.getElementById('profitPreview');
    if (pp) pp.style.display = 'none';
}

function calculateProfitPreview() {
    const pp = parseFloat(document.getElementById('productPurchasePrice')?.value) || 0;
    const sp = parseFloat(document.getElementById('productPrice')?.value) || 0;
    const prev = document.getElementById('profitPreview');
    const val = document.getElementById('profitMarginValue');
    
    if (prev && val) {
        if (pp > 0 && sp > 0) {
            val.innerText = (((sp - pp) / pp) * 100).toFixed(1) + '%';
            prev.style.display = 'flex';
        } else {
            prev.style.display = 'none';
        }
    }
}

function editProduct(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-pencil-fill"></i> Edit Product';
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name || '';
    document.getElementById('productSku').value = p.sku || '';
    document.getElementById('productBarcode').value = p.barcode || '';
    document.getElementById('productPurchasePrice').value = p.purchase_price || 0;
    document.getElementById('productPrice').value = p.price || 0;
    document.getElementById('productQuantity').value = p.quantity || 0;
    document.getElementById('productExpiryDate').value = p.expiry_date || '';
    
    const cat = document.getElementById('productCategory');
    if (cat) cat.value = p.category || '';
    
    const sup = document.getElementById('productSupplier');
    if (sup) sup.value = p.supplier_id || '';
    
    const csd = document.getElementById('currentStockDisplay');
    if (csd) {
        csd.textContent = `📦 Current stock: ${p.quantity} units`;
        csd.style.display = 'block';
    }
    
    calculateProfitPreview();
    
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function saveProduct() {
    const id = document.getElementById('productId')?.value || '';
    const name = document.getElementById('productName')?.value.trim() || '';
    const price = document.getElementById('productPrice')?.value || '0';
    
    if (!name) {
        alert('Please enter product name');
        return;
    }
    
    if (parseFloat(price) <= 0) {
        alert('Selling price must be greater than 0');
        return;
    }
    
    const data = {
        name: name,
        sku: document.getElementById('productSku')?.value.trim() || '',
        barcode: document.getElementById('productBarcode')?.value.trim() || '',
        purchase_price: parseFloat(document.getElementById('productPurchasePrice')?.value) || 0,
        price: parseFloat(price),
        quantity: parseInt(document.getElementById('productQuantity')?.value) || 0,
        expiry_date: document.getElementById('productExpiryDate')?.value || null,
        category: document.getElementById('productCategory')?.value || '',
        supplier_id: document.getElementById('productSupplier')?.value || null
    };
    
    try {
        const url = id ? `/api/products/${id}` : '/api/products';
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            if (modal) modal.hide();
            
            await loadProducts();
            await loadSuppliers();
            
            alert(id ? '✅ Product updated!' : '✅ Product added!');
            resetModal();
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to save product');
        }
    } catch (e) {
        console.error('Error saving product:', e);
        alert('Network error. Please try again.');
    }
}

function showDeleteModal(id) {
    deleteId = id;
    if (deleteModal) deleteModal.show();
}

async function confirmDelete() {
    if (!deleteId) return;
    
    try {
        const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' });
        
        if (res.ok) {
            if (deleteModal) deleteModal.hide();
            await loadProducts();
            alert('✅ Product deleted!');
        } else {
            const err = await res.json();
            alert(err.error || 'Cannot delete product with sales history');
        }
    } catch (e) {
        console.error('Error deleting product:', e);
        alert('Network error');
    }
    
    deleteId = null;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        const escapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapes[m];
    });
}

// Initialize inventory management
function initInventoryManagement() {
    // Setup delete modal
    const modalEl = document.getElementById('deleteModal');
    if (modalEl) deleteModal = new bootstrap.Modal(modalEl);
    
    // Setup event listeners
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmDelete);
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', () => loadProducts());
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.addEventListener('change', () => loadProducts());
    
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) stockFilter.addEventListener('change', () => loadProducts());
    
    const expiryFilter = document.getElementById('expiryFilter');
    if (expiryFilter) expiryFilter.addEventListener('change', () => loadProducts());
    
    const purchasePrice = document.getElementById('productPurchasePrice');
    if (purchasePrice) purchasePrice.addEventListener('input', calculateProfitPreview);
    
    const sellingPrice = document.getElementById('productPrice');
    if (sellingPrice) sellingPrice.addEventListener('input', calculateProfitPreview);
    
    // Load initial data
    loadCategories();
    loadSuppliers();
    loadProducts();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadProducts();
        loadSuppliers();
    }, 30000);
}

// Export functions to global scope
window.loadSuppliers = loadSuppliers;
window.loadCategories = loadCategories;
window.loadProducts = loadProducts;
window.resetFilters = resetFilters;
window.resetModal = resetModal;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.showDeleteModal = showDeleteModal;
window.calculateProfitPreview = calculateProfitPreview;
window.initInventoryManagement = initInventoryManagement;
document.addEventListener('DOMContentLoaded', initInventoryManagement);
