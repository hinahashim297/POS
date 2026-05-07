    var profitChart    = null;
    var expensePieChart = null;
    var currentData    = null;

    /* ── Helpers ── */
    function setDefaultDates() {
        var today    = new Date();
        var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        var s = document.getElementById('reportStart');
        var e = document.getElementById('reportEnd');
        if (s && !s.value) s.value = firstDay.toISOString().split('T')[0];
        if (e && !e.value) e.value = today.toISOString().split('T')[0];
    }

    function showLoading(v) {
        var el = document.getElementById('loadingSpinner');
        if (el) el.style.display = v ? 'block' : 'none';
    }

    function showError(msg) {
        var d = document.getElementById('errorMessage');
        var t = document.getElementById('errorText');
        if (d && t) {
            t.innerText = msg;
            d.style.display = 'block';
            setTimeout(function(){ d.style.display = 'none'; }, 5000);
        }
    }

    function hideError() {
        var d = document.getElementById('errorMessage');
        if (d) d.style.display = 'none';
    }

    function showResults(v) {
        var rc = document.getElementById('reportContent');
        var eb = document.getElementById('exportButtons');
        var bc = document.getElementById('btnCompare');
        if (rc) rc.style.display = v ? 'block' : 'none';
        if (eb) eb.style.display = v ? 'flex'  : 'none';
        if (bc) bc.style.display = v ? 'inline-flex' : 'none';
    }

    function fmt(n) {
        return currencySymbol + ' ' + n.toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    function formatComparison(prev, curr, id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (prev === null || prev === undefined) { el.innerHTML = ''; return; }
        var diff = curr - prev;
        var pct  = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : 0;
        var up   = diff >= 0;
        el.innerHTML = '<span class="stat-badge ' + (up ? 'badge-up' : 'badge-down') + '">'
            + (up ? '&#8679;' : '&#8681;') + ' ' + Math.abs(pct) + '% vs last period</span>';
    }

    /* ── Comparison ── */
    window.loadComparison = async function() {
        if (!currentData) return;
        var s = document.getElementById('reportStart').value;
        var e = document.getElementById('reportEnd').value;
        if (!s || !e) return;

        var start = new Date(s), end = new Date(e);
        var days  = Math.ceil((end - start) / 86400000);
        var pEnd  = new Date(start); pEnd.setDate(pEnd.getDate() - 1);
        var pStart = new Date(pEnd); pStart.setDate(pStart.getDate() - days);

        try {
            var res = await fetch('/api/profit-loss?start=' + pStart.toISOString().split('T')[0]
                                + '&end=' + pEnd.toISOString().split('T')[0]);
            if (!res.ok) throw new Error('No data');
            var prev = await res.json();
            if (prev.error) throw new Error(prev.error);

            formatComparison(prev.total_sales    || 0, currentData.total_sales    || 0, 'compareSales');
            formatComparison(prev.total_expenses || 0, currentData.total_expenses || 0, 'compareExpenses');
            formatComparison(prev.net_profit     || 0, currentData.net_profit     || 0, 'compareProfit');

            var pM = prev.total_sales > 0 ? (prev.net_profit / prev.total_sales) * 100 : 0;
            var cM = currentData.total_sales > 0 ? (currentData.net_profit / currentData.total_sales) * 100 : 0;
            formatComparison(pM, cM, 'compareMargin');
        } catch(err) {
            ['compareSales','compareExpenses','compareProfit','compareMargin']
                .forEach(function(id){ formatComparison(null, null, id); });
        }
    };

    /* ── Load Report ── */
    window.loadReport = async function() {
        var start = document.getElementById('reportStart').value;
        var end   = document.getElementById('reportEnd').value;

        if (!start || !end)                  { showError('Please select both start and end dates'); return; }
        if (new Date(start) > new Date(end)) { showError('Start date cannot be after end date'); return; }

        showLoading(true);
        showResults(false);
        hideError();

        try {
            var res = await fetch('/api/profit-loss?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end));
            if (!res.ok) throw new Error('Network error: ' + res.status);
            var data = await res.json();
            if (data.error) throw new Error(data.error);

            currentData = data;

            ['compareSales','compareExpenses','compareProfit','compareMargin']
                .forEach(function(id){ document.getElementById(id).innerHTML = ''; });

            var sales    = data.total_sales    || 0;
            var expenses = data.total_expenses || 0;
            var profit   = data.net_profit     || 0;
            var margin   = sales > 0 ? ((profit / sales) * 100).toFixed(1) : 0;

            document.getElementById('totalSales').innerHTML    = fmt(sales);
            document.getElementById('totalExpenses').innerHTML = fmt(expenses);
            document.getElementById('profitMargin').innerHTML  = margin + '%';

            var np = document.getElementById('netProfit');
            np.innerHTML = fmt(profit);
            np.className = 'stat-value ' + (profit >= 0 ? 'purple' : 'red');

            updateChart(data.labels || [], data.sales || [], data.expenses || []);
            updateExpenseBreakdown(data.expense_categories || []);
            showResults(true);

            var note = document.getElementById('chartNote');
            if (note) note.innerHTML = 'Showing ' + (data.labels ? data.labels.length : 0)
                + ' days &mdash; ' + start + ' to ' + end;

        } catch(err) {
            showError('Failed to load report: ' + err.message);
        } finally {
            showLoading(false);
        }
    };

    /* ── Bar Chart ── */
    function updateChart(labels, salesData, expData) {
        var canvas = document.getElementById('profitChart');
        var ctx    = canvas.getContext('2d');

        if (profitChart) { profitChart.destroy(); profitChart = null; }

        if (!labels || labels.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '13px Inter';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText('No data for selected period', canvas.width / 2, canvas.height / 2);
            return;
        }

        profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: salesData,
                        backgroundColor: 'rgba(16,185,129,0.75)',
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Expenses',
                        data: expData,
                        backgroundColor: 'rgba(239,68,68,0.7)',
                        borderColor: '#ef4444',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#111827',
                        bodyColor: '#6b7280',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { family: 'Inter', size: 12, weight: '700' },
                        bodyFont:  { family: 'Inter', size: 12 },
                        callbacks: {
                            label: function(ctx) {
                                return ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw || 0);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6', drawBorder: false },
                        ticks: {
                            color: '#9ca3af',
                            font: { family: 'Inter', size: 11 },
                            callback: function(v){ return currencySymbol + ' ' + v.toLocaleString(); },
                            padding: 8
                        },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#9ca3af',
                            font: { family: 'Inter', size: 11 },
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 8
                        },
                        border: { display: false }
                    }
                }
            }
        });
    }

    /* ── Donut Chart ── */
    function updateExpenseBreakdown(cats) {
        var ctx  = document.getElementById('expenseChart').getContext('2d');
        var list = document.getElementById('expenseList');

        if (expensePieChart) { expensePieChart.destroy(); expensePieChart = null; }

        if (!cats || cats.length === 0) {
            list.innerHTML = '<li style="color:#9ca3af;justify-content:center;">No expense data</li>';
            return;
        }

        var sorted = cats.slice().sort(function(a,b){ return b.amount - a.amount; }).slice(0, 5);
        var colors = ['#6c47ff','#10b981','#f59e0b','#ef4444','#8b5cf6'];

        expensePieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sorted.map(function(c){ return c.name || 'Other'; }),
                datasets: [{
                    data: sorted.map(function(c){ return c.amount; }),
                    backgroundColor: colors.slice(0, sorted.length).map(function(c){ return c + 'cc'; }),
                    borderColor: colors.slice(0, sorted.length),
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#111827',
                        bodyColor: '#6b7280',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: function(ctx){ return ' ' + fmt(ctx.raw || 0); }
                        }
                    }
                }
            }
        });

        var total = sorted.reduce(function(s,c){ return s + c.amount; }, 0);
        list.innerHTML = sorted.map(function(cat, i){
            var pct = total > 0 ? ((cat.amount / total) * 100).toFixed(1) : 0;
            return '<li>'
                + '<div class="exp-left">'
                +   '<span class="exp-dot" style="background:' + colors[i] + ';"></span>'
                +   '<span class="exp-name">' + (cat.name || 'Other') + '</span>'
                + '</div>'
                + '<div>'
                +   '<span class="exp-amount">' + fmt(cat.amount) + '</span>'
                +   '<span class="exp-pct">(' + pct + '%)</span>'
                + '</div>'
                + '</li>';
        }).join('');
    }

    /* ── Export PDF ── */
    window.exportPDF = function() {
        var el = document.getElementById('reportContent');
        if (!el) return;
        html2canvas(el, { scale: 2, backgroundColor: '#f8f9fb', useCORS: true }).then(function(canvas){
            var img = canvas.toDataURL('image/png');
            var pdf = new jspdf.jsPDF('p','mm','a4');
            var pw  = pdf.internal.pageSize.getWidth();
            var ph  = pdf.internal.pageSize.getHeight();
            var iw  = pw - 20;
            var ih  = (canvas.height * iw) / canvas.width;
            var left = ih, pos = 10;
            pdf.addImage(img, 'PNG', 10, pos, iw, ih);
            left -= ph - 20;
            while (left > 0) {
                pos = left - ih + 10;
                pdf.addPage();
                pdf.addImage(img, 'PNG', 10, pos, iw, ih);
                left -= ph - 20;
            }
            pdf.save('profit-loss-report.pdf');
        });
    };

    /* ── Export Excel ── */
    window.exportExcel = function() {
        if (!currentData) return;
        var s = document.getElementById('reportStart').value;
        var e = document.getElementById('reportEnd').value;
        var margin = currentData.total_sales > 0
            ? ((currentData.net_profit / currentData.total_sales) * 100).toFixed(1) : 0;

        var csv = 'Profit & Loss Report\n\n'
            + 'Period:,' + s + ' to ' + e + '\n\n'
            + 'Metric,Amount\n'
            + 'Total Revenue,'  + (currentData.total_sales    || 0).toFixed(2) + '\n'
            + 'Total Expenses,' + (currentData.total_expenses || 0).toFixed(2) + '\n'
            + 'Net Profit/Loss,'+ (currentData.net_profit     || 0).toFixed(2) + '\n'
            + 'Profit Margin,'  + margin + '%\n\n'
            + 'Daily Breakdown\nDate,Revenue,Expenses,Net\n';

        (currentData.labels || []).forEach(function(lbl, i){
            var r = (currentData.sales[i]    || 0);
            var x = (currentData.expenses[i] || 0);
            csv += lbl + ',' + r.toFixed(2) + ',' + x.toFixed(2) + ',' + (r - x).toFixed(2) + '\n';
        });

        if (currentData.expense_categories && currentData.expense_categories.length) {
            csv += '\nExpense Categories\nCategory,Amount\n';
            currentData.expense_categories.forEach(function(c){
                csv += (c.name || 'Other') + ',' + (c.amount || 0).toFixed(2) + '\n';
            });
        }

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'profit-loss-report.csv';
        a.click();
    };

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', function(){
        setDefaultDates();
        loadReport();
    });
