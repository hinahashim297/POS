// ========== ADMIN DASHBOARD JAVASCRIPT ==========

let salesChart = null;
let refreshInterval = null;

// ===== DATE/TIME FUNCTIONS =====
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').innerText = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    document.getElementById('currentTime').innerText = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ===== MODAL FUNCTIONS =====
function openModal(title, content) {
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('detailModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == document.getElementById('detailModal')) closeModal();
}

// ===== UI HELPER FUNCTIONS =====
function showDateDetails() {
    const today = new Date();
    openModal('📅 Date Information', 
        `<h3>Today's Date Details</h3>
        <p><strong>Date:</strong> ${today.toLocaleDateString()}</p>
        <p><strong>Day:</strong> ${today.toLocaleDateString('en-US', { weekday: 'long' })}</p>
        <p><strong>Time Zone:</strong> ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>`
    );
}

function showTimeDetails() {
    const now = new Date();
    openModal('🕐 Time Information', 
        `<h3>Current Time</h3>
        <p><strong>Time:</strong> ${now.toLocaleTimeString()}</p>
        <p><strong>Status:</strong> 🟢 System Active</p>`
    );
}

function showNotifications() {
    openModal('🔔 Notifications', 
        '<div class="alert-item">✅ System running smoothly</div>' +
        '<div class="alert-item">📦 Low stock alert - Please check inventory</div>' +
        '<div class="alert-item">📊 Daily report ready for review</div>'
    );
}

// ===== ANIMATION =====
function animateCounter(element, targetValue) {
    if (!element) return;
    const duration = 800;
    const startTime = performance.now();
    const startValue = 0;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(targetValue * progress);
        element.innerText = current.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.innerText = targetValue.toLocaleString();
        }
    }
    requestAnimationFrame(updateCounter);
}

// ===== API DATA LOADING (MOCK DATA FOR NOW - REPLACE WITH REAL API CALLS) =====
async function loadDashboardData() {
    // This is mock data - replace with your actual API calls
    // When your backend is ready, uncomment the fetch code below
    
    /*
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        // Process data...
    } catch(e) {
        console.error(e);
    }
    */
    
    // MOCK DATA FOR DEMONSTRATION - REMOVE WHEN BACKEND IS READY
    const mockData = {
        todayRevenue: 12500,
        todayCount: 8,
        totalProducts: 156,
        totalUsers: 5,
        lowStock: 3,
        revenueChange: 12.5,
        topProducts: [
            { name: 'Chicken Burger', sold: 24, price: 350 },
            { name: 'French Fries', sold: 18, price: 180 },
            { name: 'Cold Drink', sold: 15, price: 80 },
            { name: 'Zinger Burger', sold: 12, price: 450 },
            { name: 'Ice Cream', sold: 9, price: 120 }
        ],
        recentTransactions: [
            { id: 'INV-001', date: new Date(), items: 3, total: 850, cashier: 'Ahmed' },
            { id: 'INV-002', date: new Date(), items: 2, total: 430, cashier: 'Sara' },
            { id: 'INV-003', date: new Date(), items: 5, total: 1250, cashier: 'Ahmed' },
            { id: 'INV-004', date: new Date(), items: 1, total: 350, cashier: 'Ali' }
        ]
    };
    
    const revenue = mockData.todayRevenue;
    const count = mockData.todayCount;
    const profit = revenue * 0.25;
    
    document.getElementById('todayRevenue').innerHTML = `PKR ${revenue.toLocaleString()}`;
    document.getElementById('todaySalesCount').innerHTML = `${count} sale${count !== 1 ? 's' : ''} today`;
    document.getElementById('productCount').innerText = mockData.totalProducts;
    document.getElementById('userCount').innerText = mockData.totalUsers;
    document.getElementById('criticalStock').innerText = mockData.lowStock;
    document.getElementById('netProfit').innerHTML = `PKR ${profit.toLocaleString()}`;
    document.getElementById('profitMargin').innerHTML = `Margin: 25%`;
    
    animateCounter(document.getElementById('revenueCounter'), revenue);
    
    const changeElem = document.getElementById('revenuePercent');
    if (mockData.revenueChange >= 0) {
        changeElem.innerHTML = `+${mockData.revenueChange}%`;
        changeElem.style.color = '#4ade80';
    } else {
        changeElem.innerHTML = `${mockData.revenueChange}%`;
        changeElem.style.color = '#f87171';
    }
    
    // Best Selling Products
    let totalUnits = 0, totalRev = 0;
    const bestHtml = mockData.topProducts.map((p, index) => {
        totalUnits += p.sold;
        totalRev += (p.sold * p.price);
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '📦'));
        return `<div class="product-item">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:18px;">${medal}</span>
                <div>
                    <strong style="font-size:13.5px;color:#1a1d2e;">${p.name}</strong>
                </div>
            </div>
            <div style="text-align:right;">
                <span class="product-sold">${p.sold} sold</span>
                <div style="font-size:11px;margin-top:4px;color:#64748b;">PKR ${(p.sold * p.price).toLocaleString()}</div>
            </div>
        </div>`;
    }).join('');
    
    document.getElementById('bestSellingProducts').innerHTML = bestHtml;
    document.getElementById('totalUnitsSold').innerText = totalUnits;
    document.getElementById('totalRevenue').innerHTML = `PKR ${totalRev.toLocaleString()}`;
    
    // Recent Transactions
    document.getElementById('transactionList').innerHTML = mockData.recentTransactions.map(t => `
        <tr>
            <td><strong>${t.id}</strong></td>
            <td>${new Date(t.date).toLocaleString()}</td>
            <td>${t.items} items</td>
            <td><strong>PKR ${t.total.toLocaleString()}</strong></td>
            <td>${t.cashier}</td>
        </tr>
    `).join('');
}

async function loadLowStock() {
    // Mock data - replace with API call
    const lowStockProducts = [
        { name: 'Tomato Ketchup', quantity: 5 },
        { name: 'Mayonnaise', quantity: 3 },
        { name: 'Paper Bags', quantity: 8 }
    ];
    
    if (lowStockProducts.length) {
        document.getElementById('lowStockAlerts').innerHTML = lowStockProducts.map(p =>
            `<div class="alert-item"><strong>${p.name}</strong> — Only ${p.quantity} left in stock</div>`
        ).join('');
    } else {
        document.getElementById('lowStockAlerts').innerHTML = '<div style="color:#2e7d32;font-weight:700;padding:10px;">✅ All stocks healthy!</div>';
    }
}

async function loadRecentActivity() {
    // Mock data - replace with API call
    const activities = [
        { id: 'INV-005', total: 1250, cashier: 'Ahmed' },
        { id: 'INV-006', total: 430, cashier: 'Sara' },
        { id: 'INV-007', total: 850, cashier: 'Ali' }
    ];
    
    if (activities.length) {
        document.getElementById('recentActivity').innerHTML = activities.map(a =>
            `<div class="activity-item">
                <i class="bi bi-cart-check"></i>
                <div>
                    <strong>Sale #${a.id}</strong><br>
                    <small style="color:#64748b;">PKR ${a.total.toLocaleString()} by ${a.cashier}</small>
                </div>
            </div>`
        ).join('');
    } else {
        document.getElementById('recentActivity').innerHTML = '<div class="empty-state">No recent activity</div>';
    }
}

// ===== DETAIL VIEW FUNCTIONS =====
async function showTodaySalesDetails() {
    openModal('💰 Today\'s Revenue Details', 
        `<h3>📊 Today's Sales Summary</h3>
        <table class="detail-table">
            <tr><th>Total Revenue:</th><td>PKR 12,500</td></tr>
            <tr><th>Total Sales:</th><td>8 transactions</td></tr>
            <tr><th>Average Sale:</th><td>PKR 1,562</td></tr>
            <tr><th>Peak Hour:</th><td>1:00 PM - 2:00 PM</td></tr>
        </table>`
    );
}

async function showProfitLossDetails() {
    openModal('💰 Profit & Loss Summary', 
        `<h3>📊 Today's Profit & Loss</h3>
        <table class="detail-table">
            <tr><th colspan="2">Today's Summary</th></tr>
            <tr><th>Total Revenue:</th><td>PKR 12,500</td></tr>
            <tr><th>Cost of Goods (75%):</th><td>PKR 9,375</td></tr>
            <tr><th style="color:#2e7d32;">Net Profit (25%):</th><td style="color:#2e7d32;font-weight:800;">PKR 3,125</td></tr>
            <tr><th>Profit Margin:</th><td>25%</td></tr>
        </table>
        <div style="margin-top:16px;padding:14px;background:#f0fdf4;border-radius:10px;border-left:3px solid #2e7d32;">
            <small><i class="bi bi-info-circle"></i> Profit calculated based on 25% margin standard.</small>
        </div>`
    );
}

async function showAllUsers() {
    openModal('👥 Team Members', 
        `<h3>System Users</h3>
        <table class="detail-table">
            <thead><tr><th>Username</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
                <tr><td>admin</td><td>Administrator</td><td>✅ Active</td></tr>
                <tr><td>ahmed</td><td>Cashier</td><td>✅ Active</td></tr>
                <tr><td>sara</td><td>Cashier</td><td>✅ Active</td></tr>
                <tr><td>ali</td><td>Manager</td><td>✅ Active</td></tr>
            </tbody>
        </table>`
    );
}

async function showCashiersList() {
    openModal('👨‍💼 Cashiers', 
        `<h3>Active Cashiers</h3>
        <table class="detail-table">
            <thead><tr><th>Name</th><th>Status</th><th>Today's Sales</th></tr></thead>
            <tbody>
                <tr><td>Ahmed Khan</td><td>✅ Active</td><td>PKR 4,200</td></tr>
                <tr><td>Sara Ali</td><td>✅ Active</td><td>PKR 3,850</td></tr>
                <tr><td>Usman Riaz</td><td>⏸ Offline</td><td>PKR 0</td></tr>
            </tbody>
        </table>
        <br>
        <button class="action-btn action-btn--primary" onclick="window.location.href='/register'">
            <i class="bi bi-person-plus"></i> Add New Cashier
        </button>`
    );
}

async function showLowStockDetails() {
    openModal('⚠️ Low Stock Alert', 
        `<h3>Products Below Reorder Level</h3>
        <table class="detail-table">
            <thead><tr><th>Product</th><th>Current Stock</th><th>Min Required</th></tr></thead>
            <tbody>
                <tr><td>Tomato Ketchup</td><td style="color:#dc2626;font-weight:700;">5 units</td><td>20 units</td></tr>
                <tr><td>Mayonnaise</td><td style="color:#dc2626;font-weight:700;">3 units</td><td>15 units</td></tr>
                <tr><td>Paper Bags</td><td style="color:#dc2626;font-weight:700;">8 units</td><td>50 units</td></tr>
            </tbody>
        </table>
        <div style="margin-top:16px;padding:12px;background:#fff5f5;border-radius:8px;">
            <i class="bi bi-exclamation-triangle" style="color:#dc2626;"></i>
            <strong>Action Required:</strong> Please reorder these items soon.
        </div>`
    );
}

// ===== EXPORT FUNCTION =====
async function exportData() {
    // Mock export - replace with actual data
    const csvContent = "Transaction ID,Date,Total, Cashier\nINV-001," + new Date().toLocaleString() + ",850,Ahmed\nINV-002," + new Date().toLocaleString() + ",430,Sara";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().slice(0, 19)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== SEARCH FUNCTION =====
function searchProducts() {
    const term = document.getElementById('globalSearch').value;
    if (term.length > 2) {
        window.location.href = `/inventory?search=${encodeURIComponent(term)}`;
    }
}

// ===== CHART FUNCTIONS =====
async function loadSalesChart(days = 7) {
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-days="${days}"]`)?.classList.add('active');
    
    // Mock chart data - replace with API call
    const mockData = {
        7: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [3200, 4500, 3800, 6200, 8900, 10500, 12500] },
        30: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], data: [28500, 34200, 39800, 45200] },
        90: { labels: ['Jan', 'Feb', 'Mar'], data: [112500, 128900, 145200] }
    };
    
    const chartData = mockData[days] || mockData[7];
    
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Sales (PKR)',
                data: chartData.data,
                borderColor: '#6c47ff',
                backgroundColor: 'rgba(108, 71, 255, 0.08)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#e8a020',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    grid: { color: '#eef2f8' }, 
                    ticks: { 
                        color: '#64748b', 
                        callback: function(value) { return 'PKR ' + value.toLocaleString(); }
                    } 
                },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        }
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    loadDashboardData();
    loadLowStock();
    loadRecentActivity();
    loadSalesChart(7);
    
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        loadDashboardData();
        loadLowStock();
        loadRecentActivity();
    }, 60000);
});

window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});