/* ===== SIDEBAR TOGGLE ===== */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

/* ===== NOTIFICATIONS ===== */
async function loadNotifications() {
    const list  = document.getElementById('notifList');
    const badge = document.getElementById('notifCountBadge');
    const dot   = document.getElementById('notifDot');
    if (!list) return;

    try {
        const [prodRes, txRes, custRes] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/transactions'),
            fetch('/api/customers')
        ]);

        const products = prodRes.ok ? await prodRes.json() : [];
        const txData   = txRes.ok   ? await txRes.json()   : [];
        const custData = custRes.ok ? await custRes.json() : [];

        const allProducts = Array.isArray(products) ? products : [];
        const txList      = Array.isArray(txData)   ? txData   : (txData.transactions || []);
        const custList    = Array.isArray(custData) ? custData : [];

        /* Stats grid */
        const today = new Date().toDateString();
        const todaySales = txList.filter(function(tx) {
            return tx.transaction_date && new Date(tx.transaction_date).toDateString() === today;
        });
        const todayRevenue = todaySales.reduce(function(s, tx) { return s + (tx.total_amount || 0); }, 0);
        const lowStockCount = allProducts.filter(function(p) { return p.quantity <= 5; }).length;

        var revEl = document.getElementById('ns-revenue');
        var proEl = document.getElementById('ns-products');
        var lowEl = document.getElementById('ns-lowstock');
        if (revEl) revEl.textContent = todayRevenue >= 1000
            ? 'PKR ' + (todayRevenue / 1000).toFixed(1) + 'K'
            : 'PKR ' + Math.round(todayRevenue);
        if (proEl) proEl.textContent = allProducts.length;
        if (lowEl) lowEl.textContent = lowStockCount;

        /* Build alert items */
        var notifs = [];

        /* Today's summary */
        if (todaySales.length > 0) {
            notifs.push({
                icon: 'ni-sale', fa: 'fas fa-chart-line',
                title: 'Today: ' + todaySales.length + ' sale' + (todaySales.length > 1 ? 's' : ''),
                desc:  'Total revenue: PKR ' + todayRevenue.toLocaleString(),
                time: 'Today', href: '/sales'
            });
        }

        /* Out of stock */
        allProducts.filter(function(p) { return p.quantity === 0; }).slice(0, 3).forEach(function(p) {
            notifs.push({
                icon: 'ni-alert', fa: 'fas fa-ban',
                title: 'Out of Stock: ' + p.name,
                desc: 'SKU: ' + (p.sku || 'N/A') + ' — Reorder needed',
                time: 'Urgent', href: '/inventory'
            });
        });

        /* Low stock (qty 1–5) */
        allProducts.filter(function(p) { return p.quantity > 0 && p.quantity <= 5; }).slice(0, 3).forEach(function(p) {
            notifs.push({
                icon: 'ni-warn', fa: 'fas fa-exclamation-triangle',
                title: 'Low Stock: ' + p.name,
                desc: 'Only ' + p.quantity + ' unit' + (p.quantity > 1 ? 's' : '') + ' left in store',
                time: 'Stock', href: '/inventory'
            });
        });

        /* Recent transactions (last 3) */
        txList.slice(0, 3).forEach(function(tx) {
            var amt = (tx.total_amount || 0);
            notifs.push({
                icon: 'ni-sale', fa: 'fas fa-receipt',
                title: 'Sale #' + tx.id + ' — PKR ' + amt.toLocaleString(),
                desc: 'Payment: ' + (tx.payment_method || 'cash') + (tx.cashier_name ? ' · by ' + tx.cashier_name : ''),
                time: 'Sale', href: '/sales'
            });
        });

        /* Customers count info */
        if (custList.length > 0) {
            notifs.push({
                icon: 'ni-cust', fa: 'fas fa-users',
                title: custList.length + ' Registered Customers',
                desc: 'Click to manage customer directory',
                time: 'CRM', href: '/customers'
            });
        }

        /* Badge & dot */
        var alertCount = allProducts.filter(function(p) { return p.quantity <= 5; }).length;
        if (badge) badge.textContent = alertCount;
        if (dot)   dot.style.display = alertCount > 0 ? 'block' : 'none';

        if (notifs.length === 0) {
            list.innerHTML = '<div class="notif-empty"><i class="fas fa-check-circle"></i>Everything looks good!</div>';
            return;
        }

        list.innerHTML = notifs.map(function(n) {
            return '<a class="notif-item" href="' + n.href + '">' +
                '<div class="notif-icon-box ' + n.icon + '"><i class="' + n.fa + '"></i></div>' +
                '<div class="notif-text">' +
                    '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
                    '<div class="notif-desc">'  + escapeHtml(n.desc)  + '</div>' +
                '</div>' +
                '<div class="notif-time">' + n.time + '</div>' +
            '</a>';
        }).join('');

    } catch(e) {
        if (list) list.innerHTML = '<div class="notif-empty"><i class="fas fa-wifi"></i>Could not load data</div>';
    }
}

/* ===== ESCAPE HTML ===== */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

/* ===== LIVE CLOCK ===== */
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('navClock');
    const dateEl = document.getElementById('navDate');
    if (!timeEl) return;

    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');
    timeEl.textContent = hh + ':' + mm + ':' + ss;

    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ' ' + now.getFullYear();
}

/* ===== DARK MODE TOGGLE ===== */
function applyDarkIcon(isDark) {
    const icon = document.getElementById('darkToggleIcon');
    if (!icon) return;
    if (isDark) {
        icon.className = 'fas fa-sun';
        icon.style.color = '#fbbf24';
    } else {
        icon.className = 'fas fa-moon';
        icon.style.color = '';
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('pos_theme', isDark ? 'dark' : 'light');
    applyDarkIcon(isDark);
    
    // Notify other tabs/windows about theme change
    try {
        localStorage.setItem('pos_theme_change', Date.now().toString());
    } catch(e) {}
}

function syncThemeFromSettings() {
    // This function will be called from the template with server-side settings
    if (typeof window.serverTheme !== 'undefined') {
        if (window.serverTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        applyDarkIcon(window.serverTheme === 'dark');
    } else {
        const stored = localStorage.getItem('pos_theme');
        if (stored === 'dark') {
            document.body.classList.add('dark-mode');
            applyDarkIcon(true);
        }
    }
}

/* ===== CLICK OUTSIDE SIDEBAR ===== */
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

/* ===== INITIALIZATION ===== */
document.addEventListener('DOMContentLoaded', function() {
    // Setup notification dropdown
    var notifBtn = document.getElementById('notifDropdown');
    if (notifBtn) {
        notifBtn.addEventListener('show.bs.dropdown', loadNotifications);
        loadNotifications();
    }
    
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Setup theme change listener
    window.addEventListener('storage', function(e) {
        if (e.key === 'pos_theme') {
            const isDark = e.newValue === 'dark';
            document.body.classList.toggle('dark-mode', isDark);
            applyDarkIcon(isDark);
        }
    });
    
    // Sync theme
    syncThemeFromSettings();
});

// Export functions to global scope
window.toggleSidebar = toggleSidebar;
window.toggleDarkMode = toggleDarkMode;
window.loadNotifications = loadNotifications;
window.updateClock = updateClock;