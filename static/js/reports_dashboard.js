let salesChart, profitPieChart;

function setPeriod() {
    const period = document.getElementById('periodSelect').value;
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    switch(period) {
        case 'today':
            start = new Date(today.setHours(0,0,0,0));
            end = new Date();
            break;
        case 'yesterday':
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setHours(23,59,59,999);
            break;
        case 'week':
            const day = today.getDay();
            start = new Date(today);
            start.setDate(today.getDate() - day);
            start.setHours(0,0,0,0);
            end = new Date();
            break;
        case 'month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date();
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date();
            break;
    }
    
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
    document.getElementById('endDate').value = end.toISOString().split('T')[0];
    loadAllReports();
}

async function loadAllReports() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    await loadSalesData(startDate, endDate);
    await loadExpensesData(startDate, endDate);
    await loadStockData();
    await loadCustomerData(startDate, endDate);
    await loadTopProducts(startDate, endDate);
    updateCharts();
}

async function loadSalesData(startDate, endDate) {
    try {
        const response = await fetch('/api/transactions');
        let transactions = await response.json();
        if (!Array.isArray(transactions)) transactions = [];
        
        if (startDate && endDate) {
            transactions = transactions.filter(t => {
                const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                return tDate >= startDate && tDate <= endDate;
            });
        }
        
        const totalSales = transactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        const totalTransactions = transactions.length;
        const avgOrder = totalTransactions > 0 ? totalSales / totalTransactions : 0;
        
        const today = new Date().toISOString().split('T')[0];
        const todaySales = transactions.filter(t => {
            const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
            return tDate === today;
        }).reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        
        const todayTransactions = transactions.filter(t => {
            const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
            return tDate === today;
        }).length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlySales = transactions.filter(t => {
            const d = new Date(t.created_at || t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthSalesTotal = transactions.filter(t => {
            const d = new Date(t.created_at || t.date);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        }).reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        
        let growth = 0;
        if (lastMonthSalesTotal > 0) {
            growth = ((monthlySales - lastMonthSalesTotal) / lastMonthSalesTotal) * 100;
        }
        
        document.getElementById('totalSales').innerHTML = `PKR ${totalSales.toLocaleString()}`;
        document.getElementById('totalTransactions').innerText = totalTransactions;
        document.getElementById('todaySales').innerHTML = `PKR ${todaySales.toLocaleString()}`;
        document.getElementById('todayTransactions').innerText = todayTransactions;
        document.getElementById('avgOrder').innerHTML = `PKR ${Math.round(avgOrder).toLocaleString()}`;
        document.getElementById('monthlySales').innerHTML = `PKR ${monthlySales.toLocaleString()}`;
        document.getElementById('lastMonthSales').innerHTML = `PKR ${lastMonthSalesTotal.toLocaleString()}`;
        document.getElementById('monthlyGrowth').innerHTML = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
        document.getElementById('cashIn').innerHTML = `PKR ${totalSales.toLocaleString()}`;
        
        const weeklyData = getWeeklyData(transactions);
        window.salesChartData = weeklyData;
        
        return { totalSales, totalTransactions };
    } catch (error) {
        console.error('Error loading sales:', error);
        return { totalSales: 0, totalTransactions: 0 };
    }
}

function getWeeklyData(transactions) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklySales = [0, 0, 0, 0, 0, 0, 0];
    
    transactions.forEach(t => {
        const date = new Date(t.created_at || t.date);
        const day = date.getDay();
        weeklySales[day] += (parseFloat(t.total) || 0);
    });
    
    return { labels: days, data: weeklySales };
}

async function loadExpensesData(startDate, endDate) {
    try {
        const response = await fetch('/api/expenses');
        let expenses = await response.json();
        if (!Array.isArray(expenses)) expenses = [];
        
        if (startDate && endDate) {
            expenses = expenses.filter(e => {
                const eDate = new Date(e.date || e.expense_date).toISOString().split('T')[0];
                return eDate >= startDate && eDate <= endDate;
            });
        }
        
        const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
        
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        
        let topCategory = 'None';
        let topAmount = 0;
        for (const [cat, amt] of Object.entries(categoryTotals)) {
            if (amt > topAmount) {
                topAmount = amt;
                topCategory = cat;
            }
        }
        
        document.getElementById('totalExpenses').innerHTML = `PKR ${totalExpenses.toLocaleString()}`;
        document.getElementById('expenseTotal').innerHTML = `PKR ${totalExpenses.toLocaleString()}`;
        document.getElementById('topExpenseCat').innerText = topCategory;
        document.getElementById('avgExpense').innerHTML = `PKR ${Math.round(avgExpense).toLocaleString()}`;
        document.getElementById('cashOut').innerHTML = `PKR ${totalExpenses.toLocaleString()}`;
        
        const totalSales = parseFloat(document.getElementById('totalSales').innerHTML.replace('PKR ', '').replace(/,/g, '')) || 0;
        const netProfit = totalSales - totalExpenses;
        document.getElementById('netProfit').innerHTML = `PKR ${netProfit.toLocaleString()}`;
        document.getElementById('netCashFlow').innerHTML = `PKR ${netProfit.toLocaleString()}`;
        
        return totalExpenses;
    } catch (error) {
        console.error('Error loading expenses:', error);
        return 0;
    }
}

async function loadStockData() {
    try {
        const response = await fetch('/api/products');
        let products = await response.json();
        if (!Array.isArray(products)) products = [];
        
        const totalProducts = products.length;
        const lowStock = products.filter(p => p.quantity < 5 && p.quantity > 0).length;
        const outStock = products.filter(p => p.quantity === 0).length;
        const stockValue = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0);
        
        document.getElementById('totalProducts').innerText = totalProducts;
        document.getElementById('lowStock').innerHTML = lowStock;
        document.getElementById('outStock').innerHTML = outStock;
        document.getElementById('stockValue').innerHTML = `PKR ${Math.round(stockValue).toLocaleString()}`;
    } catch (error) {
        console.error('Error loading stock:', error);
    }
}

async function loadCustomerData(startDate, endDate) {
    try {
        const response = await fetch('/api/customers');
        let customers = await response.json();
        if (!Array.isArray(customers)) customers = [];
        
        const totalCustomers = customers.length;
        
        let topCustomer = { name: '-', spent: 0 };
        customers.forEach(c => {
            if ((c.total_spent || 0) > topCustomer.spent) {
                topCustomer = { name: c.name, spent: c.total_spent };
            }
        });
        
        let newCustomers = 0;
        if (startDate && endDate) {
            newCustomers = customers.filter(c => {
                const cDate = new Date(c.created_at).toISOString().split('T')[0];
                return cDate >= startDate && cDate <= endDate;
            }).length;
        }
        
        document.getElementById('totalCustomers').innerText = totalCustomers;
        document.getElementById('newCustomers').innerText = newCustomers;
        document.getElementById('topCustomer').innerText = topCustomer.name;
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function loadTopProducts(startDate, endDate) {
    try {
        const response = await fetch('/api/transactions');
        let transactions = await response.json();
        if (!Array.isArray(transactions)) transactions = [];
        
        if (startDate && endDate) {
            transactions = transactions.filter(t => {
                const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                return tDate >= startDate && tDate <= endDate;
            });
        }
        
        const productSales = {};
        transactions.forEach(t => {
            if (t.items && t.items.length) {
                t.items.forEach(item => {
                    const name = item.product_name || item.name || 'Unknown';
                    productSales[name] = productSales[name] || { units: 0, revenue: 0 };
                    productSales[name].units += item.quantity || 1;
                    productSales[name].revenue += (item.price_at_time || item.price || 0) * (item.quantity || 1);
                });
            }
        });
        
        const sorted = Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.units - a.units)
            .slice(0, 5);
        
        const tbody = document.getElementById('topProductsTable');
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td</tr>';
        } else {
            tbody.innerHTML = sorted.map((p, i) => `
                <tr>
                    <td class="${i === 0 ? 'rank-1' : ''}">${i + 1}</td>
                    <td>${p.name}</td>
                    <td>${p.units}</td>
                    <td>PKR ${p.revenue.toLocaleString()}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

function updateCharts() {
    const salesData = window.salesChartData || { labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], data: [0,0,0,0,0,0,0] };
    
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: salesData.labels,
            datasets: [{
                label: 'Sales (PKR)',
                data: salesData.data,
                borderColor: '#6c47ff',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6c47ff',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { callback: (v) => 'PKR ' + v.toLocaleString() } },
                x: { grid: { display: false } }
            }
        }
    });
    
    const pieCtx = document.getElementById('profitPieChart').getContext('2d');
    if (profitPieChart) profitPieChart.destroy();
    profitPieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Electronics', 'Groceries', 'Clothing', 'Stationery', 'Others'],
            datasets: [{
                data: [35, 28, 20, 12, 5],
                backgroundColor: ['#6c47ff', '#10b981', '#f59e0b', '#ef4444', '#6b7280'],
                borderWidth: 2,
                borderColor: 'white',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, font: { size: 10 } } }
            }
        }
    });
}

function viewFullReport(reportType) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const urls = {
        sales: '/sales',
        monthly: '/sales-reports',
        stock: '/inventory',
        expenses: '/expenses',
        customers: '/customers',
        cashflow: '/profit-loss'
    };
    
    if (urls[reportType]) {
        window.open(urls[reportType] + `?start=${startDate}&end=${endDate}`, '_blank');
    }
}

async function exportReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const exportBtn = document.querySelector('.btn-export');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Exporting...';
    exportBtn.disabled = true;
    
    try {
        const salesResponse = await fetch('/api/transactions');
        let transactions = await salesResponse.json();
        if (!Array.isArray(transactions)) transactions = [];
        
        if (startDate && endDate) {
            transactions = transactions.filter(t => {
                const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                return tDate >= startDate && tDate <= endDate;
            });
        }
        
        const productsResponse = await fetch('/api/products');
        let products = await productsResponse.json();
        if (!Array.isArray(products)) products = [];
        
        const totalSales = transactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
        const totalTransactions = transactions.length;
        const avgOrder = totalTransactions > 0 ? totalSales / totalTransactions : 0;
        
        let csvRows = [];
        csvRows.push('"POS System Report"');
        csvRows.push(`"Report Generated","${new Date().toLocaleString()}"`);
        csvRows.push(`"Date Range","${startDate} to ${endDate}"`);
        csvRows.push('');
        csvRows.push('"SUMMARY METRICS",""');
        csvRows.push(`"Total Sales (PKR)","${totalSales.toFixed(2)}"`);
        csvRows.push(`"Total Transactions","${totalTransactions}"`);
        csvRows.push(`"Average Order Value (PKR)","${avgOrder.toFixed(2)}"`);
        
        try {
            const expensesResponse = await fetch('/api/expenses');
            let expenses = await expensesResponse.json();
            if (Array.isArray(expenses)) {
                let totalExpenses = 0;
                if (startDate && endDate) {
                    expenses = expenses.filter(e => {
                        const eDate = new Date(e.date || e.expense_date).toISOString().split('T')[0];
                        return eDate >= startDate && eDate <= endDate;
                    });
                }
                totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                csvRows.push(`"Total Expenses (PKR)","${totalExpenses.toFixed(2)}"`);
                csvRows.push(`"Net Profit (PKR)","${(totalSales - totalExpenses).toFixed(2)}"`);
            }
        } catch(e) {
            console.log('Expenses not available');
        }
        
        csvRows.push('');
        csvRows.push('"TRANSACTIONS DETAILS"');
        csvRows.push('"ID","Date","Time","Total (PKR)","Cashier","Customer"');
        
        transactions.forEach(t => {
            const dateObj = new Date(t.created_at || t.date);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString();
            const cashier = t.cashier || 'Unknown';
            const customer = t.customer || 'Walk-in';
            csvRows.push(`"${t.id}","${dateStr}","${timeStr}","${(parseFloat(t.total) || 0).toFixed(2)}","${cashier}","${customer}"`);
        });
        
        csvRows.push('');
        csvRows.push('"INVENTORY STATUS"');
        csvRows.push('"Product Name","SKU","Quantity","Price (PKR)","Stock Status"');
        
        products.forEach(p => {
            const status = p.quantity <= 0 ? 'Out of Stock' : (p.quantity < 5 ? 'Low Stock' : 'In Stock');
            csvRows.push(`"${p.name.replace(/"/g, '""')}","${p.sku || '-'}","${p.quantity || 0}","${(p.price || 0).toFixed(2)}","${status}"`);
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.href = url;
        link.setAttribute('download', `Report_${startDate}_to_${endDate}_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('✅ Report exported successfully!');
        
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Error exporting report. Please try again.');
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    loadAllReports();
});
