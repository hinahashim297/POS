    let salesChart = null;
    let currentDays = 30;
    const currencySymbol = 'PKR ';
    let currentChartData = null; // store for click event

    function changePeriod() {
        currentDays = parseInt(document.getElementById('periodSelect').value);
        refreshData();
    }

    function refreshData() {
        fetch(`/api/sales-analytics-data?days=${currentDays}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                currentChartData = data;
                updateUI(data);
            })
            .catch(err => {
                console.error("API Error:", err);
                document.getElementById('totalSales').innerHTML = currencySymbol + '0';
                document.getElementById('avgDaily').innerHTML = currencySymbol + '0';
                document.getElementById('topProductsList').innerHTML = '<div class="text-danger text-center py-3">❌ Failed to load data. Check console.</div>';
                const canvas = document.getElementById('salesChart');
                if (canvas) canvas.style.display = 'none';
            });
    }

    function updateUI(data) {
        // Update cards
        document.getElementById('totalSales').innerHTML = currencySymbol + data.total_sales.toLocaleString();
        let avg = (data.total_sales / currentDays).toFixed(2);
        document.getElementById('avgDaily').innerHTML = currencySymbol + avg;

        // Destroy old chart if exists
        if (salesChart) salesChart.destroy();

        const ctx = document.getElementById('salesChart').getContext('2d');
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: `Daily Sales (${currencySymbol.trim()})`,
                    data: data.sales,
                    borderColor: '#6c47ff',
                    backgroundColor: 'rgba(79, 70, 229, 0.05)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#6c47ff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const date = data.labels[index];
                        const value = data.sales[index];
                        document.getElementById('chartClickInfo').innerHTML = `📅 ${date} → ${currencySymbol}${value.toLocaleString()}`;
                        alert(`Date: ${date}\nSales: ${currencySymbol}${value.toLocaleString()}`);
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${currencySymbol}${context.raw.toLocaleString()}`
                        }
                    },
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } }
                },
                scales: {
                    y: {
                        ticks: { callback: (val) => currencySymbol + val },
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8 },
                        grid: { display: false }
                    }
                }
            }
        });

        // Update Top 5 Products List
        const topList = document.getElementById('topProductsList');
        if (data.top_products && data.top_products.length) {
            topList.innerHTML = data.top_products.map((p, idx) => `
                <div class="list-group-item d-flex justify-content-between align-items-center border-0 px-0 py-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary bg-opacity-10 rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                            <span class="fw-bold text-primary">${idx+1}</span>
                        </div>
                        <div>
                            <strong class="fs-6">${p.name}</strong>
                            <div class="text-muted small">Total sales</div>
                        </div>
                    </div>
                    <span class="badge bg-dark rounded-pill px-3 py-2">${p.sold} units</span>
                </div>
            `).join('');
        } else {
            topList.innerHTML = '<div class="text-muted text-center py-5">🔍 No sales data available</div>';
        }
    }

    // Initial load
    refreshData();
