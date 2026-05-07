let suppliers = [];
let allProducts = [];
let rowCount = 1;

// ===== TAB SWITCHING =====
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.custom-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

async function loadSuppliers() {
    try {
        const search = document.getElementById('searchInput').value;
        const statusFilter = document.getElementById('statusFilter').value;
        let url = '/api/suppliers';
        let params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
        if (params.length) url += '?' + params.join('&');

        const res = await fetch(url);
        suppliers = await res.json();

        const productsRes = await fetch('/api/products');
        allProducts = await productsRes.json();

        updateStats();
        renderSuppliersTable();

        const sel = document.getElementById('purchaseSupplier');
        if (sel) sel.innerHTML = '<option value="">-- Choose Supplier --</option>' + suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    } catch (e) { console.error(e); }
}

function updateStats() {
    const total = suppliers.length;
    const totalPending = suppliers.reduce((s, x) => s + (parseFloat(x.pending_balance) || 0), 0);
    const activeCount = suppliers.filter(s => s.is_active !== false).length;
    document.getElementById('totalSuppliers').innerText = total;
    document.getElementById('totalPending').innerHTML = `PKR ${totalPending.toLocaleString()}`;
    document.getElementById('activeSuppliers').innerText = activeCount;
    document.getElementById('totalProducts').innerText = allProducts.length;
}

function renderSuppliersTable() {
    const tbody = document.getElementById('suppliersList');
    if (!suppliers.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:50px;color:var(--muted);"><i class="bi bi-inbox" style="font-size:32px;display:block;margin-bottom:10px;"></i>No suppliers found</td></tr>';
        return;
    }
    tbody.innerHTML = suppliers.map((s, i) => `
        <tr>
            <td style="color:var(--muted);font-weight:600;">${i+1}</td>
            <td>
                <div style="display:flex;align-items:center;">
                    <span class="supplier-avatar">${escapeHtml(s.name).charAt(0).toUpperCase()}</span>
                    <div>
                        <div style="font-weight:700;">${escapeHtml(s.name)}</div>
                        <div style="font-size:12px;color:var(--muted);">${escapeHtml(s.address || '-')}</div>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(s.contact_person || '-')}</td>
            <td><a href="tel:${escapeHtml(s.phone||'')}" style="color:var(--primary);text-decoration:none;">${escapeHtml(s.phone || '-')}</a></td>
            <td class="${(s.pending_balance||0) > 0 ? 'balance-danger' : 'balance-safe'}">
                PKR ${(s.pending_balance||0).toLocaleString()}
            </td>
            <td><span class="${s.is_active !== false ? 'badge-active' : 'badge-inactive'}">${s.is_active !== false ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="action-btn pay" onclick="openPaymentModal(${s.id})" title="Make Payment"><i class="bi bi-cash-coin"></i></button>
                <button class="action-btn edit" onclick="editSupplier(${s.id})" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button class="action-btn delete" onclick="deleteSupplier(${s.id})" title="Delete"><i class="bi bi-trash3"></i></button>
            </td>
        </tr>`).join('');
}

function openAddSupplierModal() { resetSupplierForm(); document.getElementById('modalTitle').innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>Add New Supplier'; document.getElementById('supplierModal').style.display = 'flex'; }
function closeModal() { document.getElementById('supplierModal').style.display = 'none'; }
function closePaymentModal() { document.getElementById('paymentModal').style.display = 'none'; }

function resetSupplierForm() {
    ['supplierId','supplierName','contactPerson','supplierPhone','supplierEmail','supplierAddress','supplierNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pendingBalance').value = '0';
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('supplierStatus').value = 'active';
}

async function saveSupplier() {
    const id = document.getElementById('supplierId').value;
    const name = document.getElementById('supplierName').value.trim();
    if (!name) { showToast('Supplier name required!', 'error'); return; }
    const data = {
        name, contact_person: document.getElementById('contactPerson').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        address: document.getElementById('supplierAddress').value,
        pending_balance: parseFloat(document.getElementById('pendingBalance').value) || 0,
        payment_method: document.getElementById('paymentMethod').value,
        is_active: document.getElementById('supplierStatus').value === 'active',
        notes: document.getElementById('supplierNotes').value
    };
    try {
        const res = await fetch(id ? `/api/suppliers/${id}` : '/api/suppliers', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) { closeModal(); await loadSuppliers(); showToast(id ? 'Supplier updated!' : 'Supplier added!', 'success'); }
        else { const e = await res.json(); showToast(e.error || 'Failed', 'error'); }
    } catch (e) { showToast('Network error', 'error'); }
}

async function deleteSupplier(id) {
    const s = suppliers.find(x => x.id === id);
    if (!confirm(`Delete "${s?.name}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (res.ok) { await loadSuppliers(); showToast('Supplier deleted', 'success'); }
        else { const e = await res.json(); showToast(e.error || 'Delete failed', 'error'); }
    } catch (e) { showToast('Network error', 'error'); }
}

function editSupplier(id) {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Edit Supplier';
    document.getElementById('supplierId').value = s.id;
    document.getElementById('supplierName').value = s.name || '';
    document.getElementById('contactPerson').value = s.contact_person || '';
    document.getElementById('supplierPhone').value = s.phone || '';
    document.getElementById('supplierEmail').value = s.email || '';
    document.getElementById('supplierAddress').value = s.address || '';
    document.getElementById('pendingBalance').value = s.pending_balance || 0;
    document.getElementById('paymentMethod').value = s.payment_method || 'cash';
    document.getElementById('supplierStatus').value = s.is_active !== false ? 'active' : 'inactive';
    document.getElementById('supplierNotes').value = s.notes || '';
    document.getElementById('supplierModal').style.display = 'flex';
}

function openPaymentModal(supplierId) {
    const s = suppliers.find(x => x.id === supplierId);
    if (!s) return;
    document.getElementById('paymentSupplierId').value = supplierId;
    document.getElementById('payBannerName').innerHTML = s.name;
    document.getElementById('payBannerBalance').innerHTML = `Pending: PKR ${(s.pending_balance||0).toLocaleString()}`;
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentDescription').value = `Payment to ${s.name}`;
    document.getElementById('paymentModal').style.display = 'flex';
}

async function savePayment() {
    const supplierId = parseInt(document.getElementById('paymentSupplierId').value);
    const s = suppliers.find(x => x.id === supplierId);
    const paying = parseFloat(document.getElementById('paymentAmount').value) || 0;
    if (paying <= 0) { showToast('Enter valid amount', 'error'); return; }
    const remaining = Math.max(0, (parseFloat(s.pending_balance) || 0) - paying);
    try {
        const res = await fetch(`/api/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: s.name, pending_balance: remaining, payment_method: s.payment_method, is_active: true })
        });
        if (res.ok) { closePaymentModal(); await loadSuppliers(); showToast(`PKR ${paying.toLocaleString()} payment recorded!`, 'success'); }
        else showToast('Failed to save', 'error');
    } catch (e) { showToast('Network error', 'error'); }
}

// ============ STOCK INWARD ============
function addNewItemRow() {
    const container = document.getElementById('itemsContainer');
    const n = container.querySelectorAll('.item-row').length + 1;
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <label class="field-label">Product *</label>
                <div class="product-search-wrapper">
                    <input type="text" class="field-input product-search-input" placeholder="Type product name to search..." autocomplete="off">
                    <input type="hidden" class="product-id" name="product_id[]">
                    <div class="product-dropdown"></div>
                </div>
            </div>
            <div class="col-md-2">
                <label class="field-label">Quantity</label>
                <input type="number" class="field-input quantity" name="quantity[]" value="1" step="0.01" min="0">
            </div>
            <div class="col-md-3">
                <label class="field-label">Purchase Price (PKR)</label>
                <input type="number" class="field-input purchase-price" name="purchase_price[]" value="0" step="0.01" min="0">
            </div>
            <div class="col-md-1 d-flex align-items-end pb-1">
                <button type="button" class="remove-item">Ã—</button>
            </div>
        </div>`;
    container.appendChild(newRow);
    attachItemEvents(newRow);
}

function attachItemEvents(row) {
    row.querySelector('.quantity')?.addEventListener('input', calculateGrandTotal);
    row.querySelector('.purchase-price')?.addEventListener('input', calculateGrandTotal);
    const removeBtn = row.querySelector('.remove-item');
    if (removeBtn) { removeBtn.style.display = 'flex'; removeBtn.onclick = () => { row.remove(); calculateGrandTotal(); }; }
    setupProductSearch(row.querySelector('.product-search-input'), row.querySelector('.product-id'), row.querySelector('.purchase-price'));
}

function setupProductSearch(input, hiddenId, priceInput) {
    const dropdown = input.closest('.product-search-wrapper').querySelector('.product-dropdown');

    function showDropdown(matches) {
        if (!matches.length) { dropdown.style.display = 'none'; return; }
        dropdown.innerHTML = matches.map(p => {
            const cls = p.quantity <= 5 ? 'low' : '';
            return `<div class="product-dropdown-item" data-id="${p.id}" data-price="${p.purchase_price || p.price || 0}" data-name="${p.name.replace(/"/g,'&quot;')}">
                <span style="font-weight:600;">${p.name}</span>
                <span style="display:flex;gap:8px;align-items:center;">
                    <span class="prod-price">PKR ${(p.purchase_price || p.price || 0).toFixed(2)}</span>
                    <span class="prod-stock ${cls}">Qty: ${p.quantity}</span>
                </span>
            </div>`;
        }).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('.product-dropdown-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                hiddenId.value = this.dataset.id;
                input.value = this.dataset.name;
                priceInput.value = parseFloat(this.dataset.price).toFixed(2);
                dropdown.style.display = 'none';
                calculateGrandTotal();
            });
        });
    }

    input.addEventListener('input', function() {
        hiddenId.value = '';
        const term = this.value.trim().toLowerCase();
        if (term.length < 1) { dropdown.style.display = 'none'; return; }
        const matched = allProducts.filter(p => p.name.toLowerCase().includes(term)).slice(0, 10);
        if (!matched.length) {
            dropdown.innerHTML = `<div class="product-dropdown-item" style="color:var(--primary);font-weight:700;" id="createNewProd">
                <i class="bi bi-plus-circle-fill me-2"></i> Create new: "<strong>${this.value}</strong>"
            </div>`;
            dropdown.style.display = 'block';
            dropdown.querySelector('#createNewProd').addEventListener('mousedown', async function(e) {
                e.preventDefault();
                const productName = input.value.trim();
                const price = parseFloat(priceInput.value) || 0;
                try {
                    const res = await fetch('/api/products', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: productName, price: price || 1, purchase_price: price, quantity: 0 })
                    });
                    const data = await res.json();
                    if (data.id) {
                        hiddenId.value = data.id;
                        allProducts.push({ id: data.id, name: productName, purchase_price: price, price: price || 1, quantity: 0 });
                        dropdown.style.display = 'none';
                        showToast(`Product "${productName}" created!`, 'success');
                    }
                } catch (err) { showToast('Could not create product', 'error'); }
            });
            return;
        }
        showDropdown(matched);
    });

    input.addEventListener('focus', function() {
        const term = this.value.trim().toLowerCase();
        if (term.length >= 1) showDropdown(allProducts.filter(p => p.name.toLowerCase().includes(term)).slice(0, 10));
    });

    input.addEventListener('blur', () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
}

function calculateGrandTotal() {
    let subtotal = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        subtotal += (parseFloat(row.querySelector('.quantity')?.value) || 0) * (parseFloat(row.querySelector('.purchase-price')?.value) || 0);
    });
    document.getElementById('subtotalAmount').innerHTML = `PKR ${subtotal.toFixed(2)}`;
    document.getElementById('grandTotalAmount').innerHTML = `PKR ${subtotal.toFixed(2)}`;
    const paid = parseFloat(document.getElementById('amountPaid')?.value) || 0;
    const rem = Math.max(0, subtotal - paid);
    document.getElementById('remainingBalance').value = `PKR ${rem.toFixed(2)}`;
}

function resetStockForm() {
    document.getElementById('stockInwardForm').reset();
    document.getElementById('itemsContainer').innerHTML = `<div class="item-row">
        <div class="row g-2">
            <div class="col-md-6"><label class="field-label">Product *</label>
            <div class="product-search-wrapper"><input type="text" class="field-input product-search-input" placeholder="Type product name to search..." autocomplete="off"><input type="hidden" class="product-id" name="product_id[]"><div class="product-dropdown"></div></div></div>
            <div class="col-md-2"><label class="field-label">Quantity</label><input type="number" class="field-input quantity" name="quantity[]" value="1" step="0.01" min="0"></div>
            <div class="col-md-3"><label class="field-label">Purchase Price (PKR)</label><input type="number" class="field-input purchase-price" name="purchase_price[]" value="0" step="0.01" min="0"></div>
            <div class="col-md-1 d-flex align-items-end pb-1"><button type="button" class="remove-item" style="display:none;">Ã—</button></div>
        </div></div>`;
    rowCount = 1;
    calculateGrandTotal();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
    attachItemEvents(document.querySelector('.item-row'));
}

document.getElementById('addItemBtn')?.addEventListener('click', addNewItemRow);
document.getElementById('amountPaid')?.addEventListener('input', calculateGrandTotal);
document.getElementById('receiptImage')?.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = ev => document.getElementById('imagePreview').innerHTML = `<img src="${ev.target.result}" class="preview-image" alt="Preview">`;
        reader.readAsDataURL(this.files[0]);
    }
});

document.getElementById('stockInwardForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const supplierId = document.getElementById('purchaseSupplier').value;
    if (!supplierId) { showToast('Please select a supplier', 'error'); return; }

    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const productId = row.querySelector('.product-id')?.value;
        const quantity = parseFloat(row.querySelector('.quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.purchase-price')?.value) || 0;
        if (productId && quantity > 0) items.push({ product_id: productId, quantity, purchase_price: price });
    });
    if (!items.length) { showToast('Add at least one product', 'error'); return; }

    const formData = new FormData();
    formData.append('supplier_id', supplierId);
    formData.append('invoice_no', document.getElementById('invoiceNo').value);
    formData.append('bill_date', document.getElementById('billDate').value);
    formData.append('salesman', document.getElementById('salesman').value);
    formData.append('amount_paid', document.getElementById('amountPaid').value);
    formData.append('payment_method', document.getElementById('payMethod').value);
    formData.append('notes', document.getElementById('purchaseNotes').value);
    formData.append('items', JSON.stringify(items));
    if (document.getElementById('receiptImage').files[0]) formData.append('receipt_image', document.getElementById('receiptImage').files[0]);

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/stock-inward', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
            showToast('Stock inward saved! Inventory updated.', 'success');
            resetStockForm();
            loadSuppliers();
        } else showToast('Error: ' + result.error, 'error');
    } catch (err) {
        showToast('Network error: ' + err.message, 'error');
    } finally {
        btn.innerHTML = '<i class="bi bi-save2-fill"></i> Save Stock Inward';
        btn.disabled = false;
    }
});

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    const colors = { success: '#00c48c', error: '#ff4d6d', warning: '#ffb703' };
    toast.style.background = colors[type] || colors.success;
    toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

document.addEventListener('DOMContentLoaded', () => {
    loadSuppliers();
    document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
    attachItemEvents(document.querySelector('.item-row'));
});
