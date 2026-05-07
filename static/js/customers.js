/* ===== CUSTOMER MANAGEMENT FUNCTIONS ===== */

async function loadCustomers() {
    try {
        const search = document.getElementById('searchInput').value;
        const response = await fetch('/api/customers');
        let customers = await response.json();

        if (search) {
            customers = customers.filter(c =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                (c.phone && c.phone.includes(search)) ||
                (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
            );
        }

        const tbody = document.getElementById('customersTableBody');

        if (customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">
                <i class="bi bi-people"></i>
                <p>No customers found</p>
            </td></tr>`;
        } else {
            tbody.innerHTML = customers.map(c => {
                const initials = c.name.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
                return `
                <tr>
                    <td>
                        <div class="customer-cell">
                            <div class="c-avatar">${escapeHtml(initials)}</div>
                            <div>
                                <div class="c-name">${escapeHtml(c.name)}${c.is_default ? ' <span class="badge badge-walkin">Walk-in</span>' : ''}</div>
                                <div class="c-id">#${c.id}</div>
                            </div>
                        </div>
                    </td>
                    <td>${c.phone ? escapeHtml(c.phone) : '<span style="color:#b0b5c9;">—</span>'}</td>
                    <td style="font-size:0.8rem;">${c.email ? escapeHtml(c.email) : '<span style="color:#b0b5c9;">—</span>'}</td>
                    <td style="font-weight:600;">PKR ${(c.total_spent || 0).toLocaleString()}</td>
                    <td><span class="badge badge-pts">${Math.floor((c.total_spent || 0) / 100)} pts</span></td>
                    <td style="color:#8a8fa8;font-size:0.75rem;">${c.created_at || '—'}</td>
                    <td>
                        <div class="action-btns">
                            <button class="abtn ab-wa" onclick="sendWhatsApp('${escapeHtml(c.phone || '')}','${escapeHtml(c.name)}')" title="WhatsApp">
                                <i class="bi bi-whatsapp"></i>
                            </button>
                            ${!c.is_default ? `
                                <button class="abtn ab-edit" onclick="editCustomer(${c.id})" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="abtn ab-del" onclick="deleteCustomer(${c.id})" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                            <button class="abtn ab-view" onclick="viewCustomerOrders(${c.id})" title="View Orders">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        updateStats(customers);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('customersTableBody').innerHTML = `<tr><td colspan="7" class="empty-state">
            <i class="bi bi-exclamation-triangle"></i>
            <p>Error loading customers</p>
        </td></tr>`;
    }
}

function updateStats(customers) {
    const total      = customers.length;
    const totalSpent = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
    const avgSpent   = total > 0 ? totalSpent / total : 0;
    const totalPts   = customers.reduce((s, c) => s + Math.floor((c.total_spent || 0) / 100), 0);

    document.getElementById('totalCustomers').innerText = total;
    document.getElementById('totalSpent').innerText     = 'PKR ' + totalSpent.toLocaleString();
    document.getElementById('avgSpent').innerText       = 'PKR ' + Math.round(avgSpent).toLocaleString();
    document.getElementById('totalPoints').innerText    = totalPts.toLocaleString();
}

function openAddModal() {
    document.getElementById('modalTitle').innerHTML   = '<i class="bi bi-person-plus"></i> Add New Customer';
    document.getElementById('customerId').value       = '';
    document.getElementById('customerName').value     = '';
    document.getElementById('customerPhone').value    = '';
    document.getElementById('customerEmail').value    = '';
    document.getElementById('customerAddress').value  = '';
    document.getElementById('customerModal').classList.add('active');
}

async function editCustomer(id) {
    try {
        const res       = await fetch('/api/customers');
        const customers = await res.json();
        const c         = customers.find(x => x.id === id);
        if (c) {
            document.getElementById('modalTitle').innerHTML   = '<i class="bi bi-pencil-square"></i> Edit Customer';
            document.getElementById('customerId').value       = c.id;
            document.getElementById('customerName').value     = c.name;
            document.getElementById('customerPhone').value    = c.phone || '';
            document.getElementById('customerEmail').value    = c.email || '';
            document.getElementById('customerAddress').value  = c.address || '';
            document.getElementById('customerModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading customer details:', error);
        alert('Error loading customer details');
    }
}

async function saveCustomer() {
    const id      = document.getElementById('customerId').value;
    const name    = document.getElementById('customerName').value.trim();
    const phone   = document.getElementById('customerPhone').value;
    const email   = document.getElementById('customerEmail').value;
    const address = document.getElementById('customerAddress').value;

    if (!name) { 
        alert('Please enter customer name'); 
        return; 
    }

    const data = { name, phone, email, address };

    try {
        const url    = id ? `/api/customers/${id}` : '/api/customers';
        const method = id ? 'PUT' : 'POST';
        const res    = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert(id ? 'Customer updated!' : 'Customer added!');
            closeModal();
            loadCustomers();
        } else {
            alert(result.error || 'Error saving customer');
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer');
    }
}

async function deleteCustomer(id) {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    try {
        const res    = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) { 
            alert('Customer deleted!'); 
            loadCustomers(); 
        } else {
            alert(result.error || 'Cannot delete this customer');
        }
    } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer');
    }
}

function viewCustomerOrders(id) {
    window.location.href = `/sales?customer=${id}`;
}

function sendWhatsApp(phone, name) {
    if (!phone) { 
        alert('Phone number not available!'); 
        return; 
    }
    const msg = `Hello ${name}, thank you for shopping with us! - POS System`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function closeModal() {
    document.getElementById('customerModal').classList.remove('active');
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

// Initialize customer management
function initCustomerManagement() {
    loadCustomers();
    setInterval(loadCustomers, 30000);
    
    // Setup modal click outside to close
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('customerModal');
        if (e.target === modal) closeModal();
    });
}

// Export functions to global scope
window.loadCustomers = loadCustomers;
window.openAddModal = openAddModal;
window.editCustomer = editCustomer;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.viewCustomerOrders = viewCustomerOrders;
window.sendWhatsApp = sendWhatsApp;
window.closeModal = closeModal;
window.initCustomerManagement = initCustomerManagement;
document.addEventListener('DOMContentLoaded', initCustomerManagement);
