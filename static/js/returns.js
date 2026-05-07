let returns = [];
let products = [];
const today = new Date().toISOString().slice(0, 10);

function openReturnModal() {
    document.getElementById('returnTransactionId').value = '';
    document.getElementById('returnProductId').value = '';
    document.getElementById('returnQuantity').value = '';
    document.getElementById('returnReason').value = '';
    document.getElementById('returnPreview').innerHTML = '<i class="bi bi-info-circle"></i> Estimated refund: PKR 0.00';
    document.getElementById('returnModal').classList.add('active');
}

function closeReturnModal() {
    document.getElementById('returnModal').classList.remove('active');
}

window.onclick = function(e) {
    if (e.target === document.getElementById('returnModal')) closeReturnModal();
}

async function loadReturns() {
    try {
        const res = await fetch('/api/returns');
        returns = await res.json();

        const totalRefund = returns.reduce((s, r) => s + r.refund_amount, 0);
        const todayCount = returns.filter(r => r.return_date.startsWith(today)).length;
        const totalItems = returns.reduce((s, r) => s + r.quantity, 0);

        document.getElementById('totalReturns').innerText = returns.length;
        document.getElementById('totalRefund').innerText = 'PKR ' + totalRefund.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2});
        document.getElementById('todayReturns').innerText = todayCount;
        document.getElementById('totalItems').innerText = totalItems;
        document.getElementById('returnCount').innerText = returns.length + ' record(s)';

        if (!returns.length) {
            document.getElementById('returnsList').innerHTML = `
                <tr><td colspan="8" class="empty-state">
                    <i class="bi bi-inbox"></i>
                    <p>No returns recorded yet</p>
                </td></tr>`;
            return;
        }

        document.getElementById('returnsList').innerHTML = returns.map(r => `
            <tr>
                <td><strong>#${r.id}</strong></td>
                <td style="color:#64748b;">${r.return_date}</td>
                <td><span class="badge-txn">Txn #${r.transaction_id}</span></td>
                <td><strong>${escapeHtml(r.product_name)}</strong></td>
                <td><strong>${r.quantity}</strong> units</td>
                <td><span class="badge-refund">PKR ${r.refund_amount.toFixed(2)}</span></td>
                <td style="color:#64748b;">${r.reason || '—'}</td>
                <td><span class="badge-by">${r.processed_by}</span></td>
            </tr>`).join('');
    } catch(e) {
        document.getElementById('returnsList').innerHTML = '<tr><td colspan="8" class="empty-state"><p>Error loading data</p></td></tr>';
    }
}

async function loadProducts() {
    const res = await fetch('/api/products');
    products = await res.json();
    document.getElementById('returnProductId').innerHTML =
        '<option value="">Select product</option>' +
        products.map(p => `<option value="${p.id}">${p.name} — PKR ${p.price}</option>`).join('');
}

document.getElementById('returnQuantity')?.addEventListener('input', function() {
    const productId = document.getElementById('returnProductId').value;
    const product = products.find(p => p.id == productId);
    const qty = parseInt(this.value) || 0;
    const refund = product ? product.price * qty : 0;
    document.getElementById('returnPreview').innerHTML =
        `<i class="bi bi-cash-coin"></i> Estimated refund: <strong>PKR ${refund.toFixed(2)}</strong>`;
});

document.getElementById('returnProductId')?.addEventListener('change', function() {
    const qty = parseInt(document.getElementById('returnQuantity').value) || 0;
    const product = products.find(p => p.id == this.value);
    const refund = product ? product.price * qty : 0;
    document.getElementById('returnPreview').innerHTML =
        `<i class="bi bi-cash-coin"></i> Estimated refund: <strong>PKR ${refund.toFixed(2)}</strong>`;
});

async function processReturn() {
    const data = {
        transaction_id: parseInt(document.getElementById('returnTransactionId').value),
        product_id: parseInt(document.getElementById('returnProductId').value),
        quantity: parseInt(document.getElementById('returnQuantity').value),
        reason: document.getElementById('returnReason').value
    };
    if (!data.transaction_id || !data.product_id || !data.quantity) {
        alert('Please fill all required fields');
        return;
    }
    const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
        closeReturnModal();
        alert('Return processed! Refund: PKR ' + result.refund_amount.toFixed(2));
        loadReturns();
        loadProducts();
    } else {
        alert('Error: ' + result.error);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

loadReturns();
loadProducts();
