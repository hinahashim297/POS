// ✅ Load currency symbol from settings
let currencySymbol = 'PKR';
let salesChart = null;
let currentUserId = null;
let currentUserRole = '';

// Live clock
function updateClock() {
    const now = new Date();
    const timeElement = document.getElementById('liveTime');
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    }
}

// Load dashboard data (stats)
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
        if (data.success) {
            const revenue = data.stats.today_sales || 0;
            const profit = revenue * 0.25;  // 25% profit margin
            
            document.getElementById('todayRevenue').innerHTML = `${currencySymbol} ${revenue.toLocaleString()}`;
            document.getElementById('todayCount').innerHTML = `${data.stats.today_count || 0} transactions`;
            document.getElementById('productCount').innerText = data.stats.total_products || 0;
            document.getElementById('lowStock').innerText = data.stats.low_stock || 0;
            document.getElementById('totalUsers').innerText = data.stats.total_users || 2;
            document.getElementById('netProfit').innerHTML = `${currencySymbol} ${profit.toLocaleString()}`;
            document.getElementById('profitMargin').innerHTML = `Margin: 25%`;
            
            updateRecentTransactions(data.recent_transactions || []);
            await checkLowStock();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Update recent transactions
function updateRecentTransactions(transactions) {
    const container = document.getElementById('recentActivity');
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet</p></div>';
        return;
    }
    
    let html = '';
    transactions.slice(0, 10).forEach(t => {
        html += `
            <div class="activity-item" onclick="viewTransaction(${t.id})">
                <div class="activity-badge"><i class="fas fa-receipt"></i></div>
                <div class="activity-content">
                    <div class="activity-title">Transaction #${t.id}</div>
                    <div class="activity-meta"><i class="far fa-clock"></i> ${t.date || 'Just now'}</div>
                </div>
                <div class="activity-amount">${currencySymbol} ${(t.total || 0).toLocaleString()}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Check low stock
async function checkLowStock() {
    try {
        const response = await fetch('/api/products/low-stock');
        const products = await response.json();
        const card = document.getElementById('lowStockCard');
        const list = document.getElementById('lowStockList');
        
        if (products && products.length > 0) {
            card.style.display = 'block';
            let html = '';
            products.forEach(p => {
                html += `
                    <div class="alert-item">
                        <div><strong>${escapeHtml(p.name)}</strong> - Only ${p.quantity} left</div>
                        <a href="/inventory" style="color: #e74c3c;">Restock →</a>
                    </div>
                `;
            });
            list.innerHTML = html;
        } else {
            card.style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// View transaction details
async function viewTransaction(id) {
    try {
        const response = await fetch(`/api/transactions/${id}/items`);
        const items = await response.json();
        let msg = `Transaction #${id}\n\nItems:\n`;
        items.forEach(i => {
            msg += `${i.name} x${i.quantity} = ${currencySymbol} ${i.total}\n`;
        });
        alert(msg);
    } catch (error) {
        alert('Could not load transaction details');
    }
}

// Show low stock alert
function showLowStockAlert() {
    const card = document.getElementById('lowStockCard');
    if (card.style.display === 'none') {
        alert('No low stock items found!');
    } else {
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==================== USER MANAGEMENT FUNCTIONS ====================
async function loadUsers() {
    const container = document.getElementById('userListContainer');
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        
        if (!Array.isArray(users)) {
            container.innerHTML = '<div class="empty-state"><p>Failed to load users</p></div>';
            return;
        }
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
            return;
        }
        
        let html = '<table class="user-table"><thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        users.forEach(user => {
            const isActive = user.is_active === true || user.is_active === 1;
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? 'Active' : 'Inactive';
            
            const showRevoke = (user.id !== currentUserId);
            const showActivate = (!isActive && user.id !== currentUserId);
            
            html += `
                <tr>
                    <td>${escapeHtml(user.username)}</td>
                    <td><span class="badge-manager" style="background: #f0f0f0; color:#333;">${user.role}</span></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        ${showRevoke ? `<button class="action-btn-sm revoke" onclick="revokeUser(${user.id})">Revoke</button>` : ''}
                        ${showActivate ? `<button class="action-btn-sm activate" onclick="activateUser(${user.id})">Activate</button>` : ''}
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<div class="empty-state"><p>Error loading users</p></div>';
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

async function revokeUser(userId) {
    if (!confirm('Are you sure you want to revoke access for this user? They will no longer be able to login.')) return;
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`/api/users/${userId}/revoke`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            loadUsers();
        } else {
            alert('Error: ' + (data.error || 'Could not revoke user'));
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function activateUser(userId) {
    if (!confirm('Activate this user? They will be able to login again.')) return;
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`/api/users/${userId}/activate`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            loadUsers();
        } else {
            alert('Error: ' + (data.error || 'Could not activate user'));
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Initialize dashboard with user data
function initDashboard(userId, userRole, currencySym) {
    currentUserId = userId;
    currentUserRole = userRole;
    currencySymbol = currencySym;
    
    updateClock();
    setInterval(updateClock, 1000);
    loadDashboard();
    loadUsers();
    setInterval(() => {
        loadDashboard();
        loadUsers();
    }, 30000);
}

// Export functions to global scope for onclick handlers
window.viewTransaction = viewTransaction;
window.revokeUser = revokeUser;
window.activateUser = activateUser;
window.showLowStockAlert = showLowStockAlert;