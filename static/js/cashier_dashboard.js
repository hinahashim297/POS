// ========== CASHIER DASHBOARD JAVASCRIPT ==========

// Load currency symbol from meta or global variable
const currencySymbol = document.querySelector('meta[name="currency-symbol"]')?.getAttribute('content') || 'PKR';

// ===== TARGET SETTINGS =====
let dailyTarget = 20000;
let currentSales = 0;

// ===== LIVE CLOCK =====
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const clockElement = document.getElementById('liveTime');
    if (clockElement) clockElement.textContent = timeStr;
}
updateClock();
setInterval(updateClock, 1000);

// ===== UPDATE TARGET PROGRESS =====
function updateTargetProgress(salesAmount) {
    currentSales = salesAmount;
    const percentage = Math.min((currentSales / dailyTarget) * 100, 100);
    const progressBar = document.getElementById('targetProgressBar');
    const progressPercent = document.getElementById('progressPercentage');
    const currentSalesElem = document.getElementById('currentSales');
    const targetMessage = document.getElementById('targetMessage');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        if (percentage >= 100) {
            progressBar.classList.add('completed');
            progressBar.style.background = 'linear-gradient(90deg, #059669, #047857)';
            if (targetMessage) targetMessage.innerHTML = '🎉 Congratulations! You\'ve achieved today\'s target! 🎉';
        } else {
            progressBar.classList.remove('completed');
            if (targetMessage) {
                const remaining = dailyTarget - currentSales;
                targetMessage.innerHTML = `✨ You need ${currencySymbol} ${remaining.toLocaleString()} more to reach today's goal!`;
            }
        }
    }
    if (progressPercent) progressPercent.textContent = `${Math.round(percentage)}%`;
    if (currentSalesElem) currentSalesElem.textContent = `${currencySymbol} ${currentSales.toLocaleString()}`;
}

// ===== LOAD LOW STOCK FOR WIDGET =====
async function loadLowStockWidget() {
    try {
        const response = await fetch('/api/products/low-stock');
        let products = await response.json();
        if (!Array.isArray(products)) products = [];

        const container = document.getElementById('lowStockWidget');
        if (products.length === 0) {
            container.innerHTML = '<div class="lowstock-item" style="justify-content: center;"><span class="lowstock-name" style="color: #059669;">✅ All stocks healthy!</span></div>';
        } else {
            let html = '';
            products.slice(0, 5).forEach(p => {
                html += `
                    <div class="lowstock-item">
                        <span class="lowstock-name">${escapeHtml(p.name)}</span>
                        <span class="lowstock-qty">Only ${p.quantity} left!</span>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading low stock:', error);
        document.getElementById('lowStockWidget').innerHTML = '<div class="lowstock-item"><span class="lowstock-name">Unable to load</span></div>';
    }
}

// ===== LOAD DASHBOARD DATA =====
async function loadDashboardData() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data.success) {
            const todaySalesAmount = data.stats.today_sales || 0;

            document.getElementById('todaySales').textContent = `${currencySymbol} ${todaySalesAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            updateTargetProgress(todaySalesAmount);
            document.getElementById('totalProducts').textContent = data.stats.total_products || 0;
            document.getElementById('transactionCount').textContent = `${data.recent_transactions?.length || 0} today`;

            renderRecentTransactions(data.recent_transactions || []);
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
        document.getElementById('recentActivity').innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><p>Failed to load data</p></div>';
    }
}

// ===== RENDER RECENT TRANSACTIONS =====
function renderRecentTransactions(transactions) {
    const container = document.getElementById('recentActivity');
    if (!transactions.length) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-receipt"></i><p>No transactions today</p></div>';
        return;
    }
    let html = '';
    transactions.slice(0, 8).forEach(t => {
        html += `
            <div class="activity-item">
                <div class="activity-badge"><i class="bi bi-receipt"></i></div>
                <div class="activity-content">
                    <div class="activity-title">Transaction #${t.id}</div>
                    <div class="activity-meta"><i class="bi bi-clock"></i> ${t.date || 'Just now'} · ${t.items || 0} items</div>
                </div>
                <div class="activity-amount">${currencySymbol} ${(t.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ===== PRINT LAST RECEIPT =====
function printLastReceipt() {
    const lastId = localStorage.getItem('lastTransactionId');
    if (lastId) {
        window.open(`/receipt/${lastId}`, '_blank');
    } else {
        alert('No recent transaction found to reprint.');
    }
}

// ===== END SHIFT MODAL FUNCTIONS =====
let currentSystemSales = 0;
let currentTransactionCount = 0;

async function openEndShiftModal() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data.success) {
            currentSystemSales = data.stats.today_sales || 0;
            currentTransactionCount = data.stats.today_count || 0;
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }

    document.getElementById('systemSalesAmount').innerHTML = `${currencySymbol} ${currentSystemSales.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('totalTransCount').innerText = currentTransactionCount;
    document.getElementById('cashAmountInput').value = '';
    document.getElementById('differenceRow').style.display = 'none';
    document.getElementById('endShiftModal').style.display = 'flex';
}

function closeEndShiftModal() {
    document.getElementById('endShiftModal').style.display = 'none';
}

async function submitShiftTally() {
    const cashAmount = parseFloat(document.getElementById('cashAmountInput').value);
    if (isNaN(cashAmount) || cashAmount < 0) {
        alert('Please enter a valid cash amount');
        return;
    }

    const difference    = cashAmount - currentSystemSales;
    const diffPercent   = currentSystemSales > 0 ? (difference / currentSystemSales) * 100 : 0;
    const totalTrans    = parseInt(document.getElementById('totalTransCount').textContent) || 0;

    // Determine status
    let statusText = '✅ Shift tally matches! Well done!';
    let statusColor = '#00c48c';
    if (Math.abs(difference) > 100) {
        statusText  = '⚠️ Large variance detected! Please verify with manager.';
        statusColor = '#ff4d6a';
    } else if (Math.abs(difference) > 10) {
        statusText  = '⚠️ Small variance detected. Please review transactions.';
        statusColor = '#f59e0b';
    }

    // 1. Save to database
    try {
        await fetch('/api/save_shift_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_sales:       currentSystemSales,
                total_transactions: totalTrans,
                cash_in_drawer:     cashAmount
            })
        });
    } catch (e) {
        console.error('Could not save shift report:', e);
    }

    // 2. Close tally modal and show result modal
    closeEndShiftModal();

    const resultModal = document.getElementById('shiftResultModal');
    if (resultModal) {
        document.getElementById('sr_systemSales').textContent   = `${currencySymbol} ${currentSystemSales.toLocaleString('en', {minimumFractionDigits:2})}`;
        document.getElementById('sr_cashDrawer').textContent    = `${currencySymbol} ${cashAmount.toLocaleString('en', {minimumFractionDigits:2})}`;
        document.getElementById('sr_difference').textContent    = `${difference >= 0 ? '+' : ''}${currencySymbol} ${Math.abs(difference).toFixed(2)}`;
        document.getElementById('sr_difference').style.color   = difference >= 0 ? '#00c48c' : '#ff4d6a';
        document.getElementById('sr_variance').textContent     = `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(2)}%`;
        document.getElementById('sr_transactions').textContent  = totalTrans;
        document.getElementById('sr_datetime').textContent     = new Date().toLocaleString();
        document.getElementById('sr_status').textContent       = statusText;
        document.getElementById('sr_status').style.color      = statusColor;
        resultModal.style.display = 'flex';
    } else {
        // Fallback if modal doesn't exist
        if (confirm('Shift report saved! Click OK to logout.')) {
            window.location.href = '/logout';
        }
    }
}

function closeShiftResultAndLogout() {
    window.location.href = '/logout';
}

// ===== LOAD MANAGER ANNOUNCEMENT =====
async function loadAnnouncement() {
    try {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let announcement = "";
        if (dayName === 'Monday') announcement = "Start the week strong! Focus on customer service.";
        else if (dayName === 'Tuesday') announcement = "Tuesday Special: Buy 2 Get 1 Free on selected items!";
        else if (dayName === 'Wednesday') announcement = "Mid-week sale! Extra 5% off on all purchases.";
        else if (dayName === 'Thursday') announcement = "Weekend approaching! Check inventory levels.";
        else if (dayName === 'Friday') announcement = "Friday Flash Sale! 10% off storewide!";
        else if (dayName === 'Saturday') announcement = "Weekend rush! Be fast and friendly!";
        else if (dayName === 'Sunday') announcement = "Sunday Family Day! Special discounts available.";

        document.getElementById('managerAnnouncement').innerHTML = `"${announcement}"`;
        document.getElementById('announcementDate').innerHTML = `<i class="bi bi-calendar"></i> ${dayName}, ${dateStr}`;
    } catch (error) {
        console.log('Announcement error:', error);
    }
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
        e.preventDefault();
        const posUrl = document.querySelector('#newSaleBtn')?.getAttribute('href');
        if (posUrl) window.location.href = posUrl;
    }
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        printLastReceipt();
    }
    if (e.key === 'E' && e.shiftKey) {
        e.preventDefault();
        openEndShiftModal();
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        closeEndShiftModal();
    }
});

// ===== HELPER =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadLowStockWidget();
    loadAnnouncement();
    setInterval(loadDashboardData, 30000);
    setInterval(loadLowStockWidget, 60000);
});