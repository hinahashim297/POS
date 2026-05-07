// ===== GLOBAL VARIABLES =====
let allSales = [];
let filteredSales = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentReceiptSale = null;

// ===== LOAD SALES FROM API =====
async function loadSales() {
    try {
        const response = await fetch('/api/transactions');
        allSales = await response.json();
        
        console.log('Loaded sales:', allSales);
        
        // Process sales data
        if (Array.isArray(allSales)) {
            filteredSales = [...allSales];
            updateStats();
            renderTable();
        } else {
            throw new Error('Invalid data format');
        }
    } catch (error) {
        console.error('Error loading sales:', error);
        document.getElementById('salesTableBody').innerHTML = `
            <tr><td colspan="8" class="text-center text-danger py-4">Failed to load sales data</td</tr>
        `;
    }
}

// ===== UPDATE STATS CARDS =====
function updateStats() {
    const totalAmount = filteredSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
    const transactionCount = filteredSales.length;
    const totalItemsSold = filteredSales.reduce((sum, sale) => {
        const items = sale.items || [];
        return sum + items.reduce((itemSum, item) => itemSum + (parseInt(item.quantity) || 0), 0);
    }, 0);
    const avgOrder = transactionCount > 0 ? totalAmount / transactionCount : 0;

    document.getElementById('totalSales').innerHTML = `PKR ${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('totalTransactions').innerText = transactionCount;
    document.getElementById('totalItems').innerText = totalItemsSold;
    document.getElementById('avgOrder').innerHTML = `PKR ${avgOrder.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

// ===== RENDER TABLE =====
function renderTable() {
    const tbody = document.getElementById('salesTableBody');
    
    if (!filteredSales.length) {
        tbody.innerHTML = `
            <tr><td colspan="8" class="empty-state">
                <i class="bi bi-inbox"></i>
                <p>No sales found</p>
            </td>
            </tr>
        `;
        document.getElementById('showingInfo').innerText = 'Showing 0 to 0 of 0 entries';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // Sort by date descending (newest first)
    filteredSales.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSales = filteredSales.slice(startIndex, endIndex);
    
    // Update showing info
    const showingFrom = startIndex + 1;
    const showingTo = Math.min(endIndex, filteredSales.length);
    document.getElementById('showingInfo').innerText = `Showing ${showingFrom} to ${showingTo} of ${filteredSales.length} entries`;
    
    // Render pagination
    renderPagination();
    
    // Render rows
    let html = '';
    paginatedSales.forEach((sale, index) => {
        const invoiceNo = `#INV-${String(sale.id).padStart(4, '0')}`;
        const dateObj = new Date(sale.created_at || sale.date);
        const dateStr = dateObj.toLocaleDateString('en-GB');
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const customerName = sale.customer || 'Walk-in Customer';
        
        // Get items
        const items = sale.items || [];
        const totalItems = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        
        // Items HTML
        let itemsHtml = '';
        if (items.length) {
            itemsHtml = items.slice(0, 3).map(item => `
                <div class="item-line">
                    <span class="item-name">${escapeHtml(item.product_name || item.name || 'Item')}</span>
                    <span class="item-qty">x${item.quantity || 1}</span>
                    <span class="item-price">PKR ${((item.price_at_time || item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                </div>
            `).join('');
            
            if (items.length > 3) {
                itemsHtml += `<div class="total-items-badge">+${items.length - 3} more items</div>`;
            }
        } else {
            itemsHtml = '<div class="item-line"><span class="text-muted">No items</span></div>';
        }
        
        // Status badge
        const status = sale.status || 'completed';
        let statusClass = 'badge-completed';
        let statusText = 'Completed';
        if (status === 'returned') {
            statusClass = 'badge-returned';
            statusText = 'Returned';
        } else if (status === 'credit') {
            statusClass = 'badge-credit';
            statusText = 'Credit';
        }
        
        // Payment method
        const paymentMethod = sale.payment_method || 'cash';
        const paymentIcon = paymentMethod === 'cash' ? '💰' : (paymentMethod === 'card' ? '💳' : '📱');
        
        html += `
            <tr>
                <td><span class="invoice-number">${invoiceNo}</span></td>
                <td>
                    <div class="fw-semibold">${dateStr}</div>
                    <div class="text-muted small">${timeStr}</div>
                </td>
                <td class="fw-medium">${escapeHtml(customerName)}</td>
                <td class="items-list">${itemsHtml}</td>
                <td class="amount text-success fw-bold">PKR ${(parseFloat(sale.total) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td><span class="small">${paymentIcon} ${paymentMethod.toUpperCase()}</span></td>
                <td><span class="badge-status ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-action view" onclick="viewReceipt(${sale.id})" title="View Receipt">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-action print" onclick="printReceipt(${sale.id})" title="Print Receipt">
                        <i class="bi bi-printer"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ===== RENDER PAGINATION =====
function renderPagination() {
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginationDiv = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="page-btn disabled">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="page-btn disabled">...</span>`;
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    
    paginationDiv.innerHTML = html;
}

// ===== GO TO PAGE =====
function goToPage(page) {
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

// ===== APPLY FILTERS =====
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredSales = [...allSales];
    
    // Search filter
    if (searchTerm) {
        filteredSales = filteredSales.filter(sale => {
            const invoiceNo = `#INV-${String(sale.id).padStart(4, '0')}`;
            const customerName = (sale.customer || 'Walk-in Customer').toLowerCase();
            const items = sale.items || [];
            const itemsStr = items.map(i => (i.product_name || i.name || '').toLowerCase()).join(' ');
            return invoiceNo.toLowerCase().includes(searchTerm) || 
                   customerName.includes(searchTerm) || 
                   itemsStr.includes(searchTerm);
        });
    }
    
    // Date filter
    if (startDate) {
        filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.created_at || sale.date).toISOString().split('T')[0];
            return saleDate >= startDate;
        });
    }
    
    if (endDate) {
        filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.created_at || sale.date).toISOString().split('T')[0];
            return saleDate <= endDate;
        });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
        filteredSales = filteredSales.filter(sale => (sale.status || 'completed') === statusFilter);
    }
    
    currentPage = 1;
    updateStats();
    renderTable();
}

// ===== RESET FILTERS =====
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('statusFilter').value = 'all';
    
    filteredSales = [...allSales];
    currentPage = 1;
    updateStats();
    renderTable();
}

// ===== VIEW RECEIPT =====
async function viewReceipt(saleId) {
    try {
        const sale = allSales.find(s => s.id === saleId);
        if (!sale) return;
        
        currentReceiptSale = sale;
        const invoiceNo = `#INV-${String(sale.id).padStart(4, '0')}`;
        document.getElementById('receiptInvoiceNo').innerText = invoiceNo;
        
        const dateObj = new Date(sale.created_at || sale.date);
        const dateTimeStr = dateObj.toLocaleString();
        const items = sale.items || [];
        
        let itemsHtml = '';
        let subtotal = 0;
        
        items.forEach(item => {
            const price = parseFloat(item.price_at_time || item.price || 0);
            const qty = parseInt(item.quantity) || 1;
            const total = price * qty;
            subtotal += total;
            
            itemsHtml += `
                <div class="receipt-item">
                    <span>${escapeHtml(item.product_name || item.name || 'Item')} x ${qty}</span>
                    <span>PKR ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            `;
        });
        
        const tax = parseFloat(sale.tax) || 0;
        const discount = parseFloat(sale.discount) || 0;
        const total = parseFloat(sale.total) || subtotal + tax - discount;
        
        document.getElementById('receiptContent').innerHTML = `
            <div class="text-center mb-3">
                <h5>POS SYSTEM</h5>
                <p class="small text-muted">${dateTimeStr}</p>
            </div>
            <div class="hr" style="border-top: 1px dashed #eef2f6; margin: 10px 0;"></div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="hr" style="border-top: 1px dashed #eef2f6; margin: 10px 0;"></div>
            <div class="receipt-item">
                <span>Subtotal:</span>
                <span>PKR ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            ${discount > 0 ? `<div class="receipt-item">
                <span>Discount:</span>
                <span>-PKR ${discount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>` : ''}
            ${tax > 0 ? `<div class="receipt-item">
                <span>Tax:</span>
                <span>+PKR ${tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>` : ''}
            <div class="receipt-total">
                <span>TOTAL:</span>
                <span>PKR ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="text-center mt-3 small text-muted">
                Thank you for shopping!
            </div>
        `;
        
        document.getElementById('receiptModal').style.display = 'flex';
    } catch (error) {
        console.error('Error viewing receipt:', error);
        alert('Failed to load receipt details');
    }
}

// ===== PRINT RECEIPT =====
function printReceipt(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const invoiceNo = `#INV-${String(sale.id).padStart(4, '0')}`;
    const dateObj = new Date(sale.created_at || sale.date);
    const dateTimeStr = dateObj.toLocaleString();
    const customerName = sale.customer || 'Walk-in Customer';
    const items = sale.items || [];
    
    let itemsHtml = '';
    let subtotal = 0;
    
    items.forEach(item => {
        const price = parseFloat(item.price_at_time || item.price || 0);
        const qty = parseInt(item.quantity) || 1;
        const total = price * qty;
        subtotal += total;
        
        itemsHtml += `
            <tr>
                <td style="font-size: 12px;">${escapeHtml(item.product_name || item.name || 'Item')} x ${qty}</td>
                <td style="font-size: 12px; text-align: right;">PKR ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    const tax = parseFloat(sale.tax) || 0;
    const discount = parseFloat(sale.discount) || 0;
    const total = parseFloat(sale.total) || subtotal + tax - discount;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${invoiceNo}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 10px;
                }
                .text-center { text-align: center; }
                .hr { border-top: 1px dashed #000; margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 4px 0; }
                .total-row { font-weight: bold; margin-top: 8px; display: flex; justify-content: space-between; }
                .small { font-size: 10px; }
            </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 500);">
            <div class="text-center">
                <h3>POS SYSTEM</h3>
                <p>Point of Sale</p>
                <p><strong>${invoiceNo}</strong></p>
                <p class="small">${dateTimeStr}</p>
                <p class="small">Customer: ${escapeHtml(customerName)}</p>
            </div>
            <div class="hr"></div>
            <table>
                ${itemsHtml}
            </table>
            <div class="hr"></div>
            <div class="total-row">
                <span>TOTAL:</span>
                <span>PKR ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="text-center" style="margin-top: 20px; font-size: 10px;">
                Thank you for shopping!
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ===== PRINT RECEIPT FROM MODAL =====
function printReceiptFromModal() {
    if (currentReceiptSale) {
        printReceipt(currentReceiptSale.id);
    }
}

// ===== CLOSE RECEIPT MODAL =====
function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
    currentReceiptSale = null;
}

// ===== EXPORT TO CSV =====
function exportToCSV() {
    if (!filteredSales.length) {
        alert('No data to export!');
        return;
    }
    
    let csv = 'Invoice #,Date,Time,Customer,Items,Total (PKR),Payment Method,Status\n';
    
    filteredSales.forEach(sale => {
        const invoiceNo = `#INV-${String(sale.id).padStart(4, '0')}`;
        const dateObj = new Date(sale.created_at || sale.date);
        const dateStr = dateObj.toLocaleDateString('en-GB');
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const customerName = sale.customer || 'Walk-in Customer';
        const itemsStr = (sale.items || []).map(i => `${i.product_name || i.name}(x${i.quantity || 1})`).join('; ');
        const total = parseFloat(sale.total) || 0;
        const paymentMethod = sale.payment_method || 'cash';
        const status = sale.status || 'completed';
        
        csv += `"${invoiceNo}","${dateStr}","${timeStr}","${escapeHtml(customerName)}","${itemsStr}",${total},"${paymentMethod}","${status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Report_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== HELPER: Escape HTML =====
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===== AUTO REFRESH =====
setInterval(() => loadSales(), 30000);

// ===== EVENT LISTENERS =====
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') applyFilters();
});

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    loadSales();
});
