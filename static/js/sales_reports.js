document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
});

function loadReport() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (!start || !end) {
        alert('Please select both start and end dates');
        return;
    }

    const reportDiv = document.getElementById('reportContent');
    reportDiv.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-3">Loading...</p></div>';

    fetch(`/api/sales-report?start=${start}&end=${end}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            if (!data.length) {
                reportDiv.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-chart-simple fa-3x mb-3 text-muted opacity-25"></i>
                        <p class="text-muted">No sales found for selected period.</p>
                    </div>
                `;
                return;
            }

            let totalAmount = 0;
            let totalItems = 0;
            data.forEach(row => {
                totalAmount += row.total;
                totalItems += row.items;
            });

            const html = `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="bg-light">
                            <tr>
                                <th class="ps-3">Date</th>
                                <th>Total Sales (PKR)</th>
                                <th>Items Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    <td class="ps-3 fw-semibold">${row.date}</td>
                                    <td><span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">PKR ${row.total.toLocaleString()}</span></td>
                                    <td>${row.items} units</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="bg-light fw-bold">
                            <tr>
                                <td class="ps-3">Total</td>
                                <td>PKR ${totalAmount.toLocaleString()}</td>
                                <td>${totalItems} units</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="mt-4 text-muted small text-center">
                    <i class="fas fa-download me-1"></i> Tip: Use browser print (Ctrl+P) to save as PDF.
                </div>
            `;
            reportDiv.innerHTML = html;
        })
        .catch(err => {
            console.error(err);
            reportDiv.innerHTML = `<div class="alert alert-danger">❌ Failed to load report. Please try again.</div>`;
        });
}
