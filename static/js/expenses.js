let expenses = [];

async function loadExpenses() {
    const res = await fetch('/api/expenses');
    expenses = await res.json();

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const monthTotal = expenses
        .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
        .reduce((s, e) => s + e.amount, 0);

    document.getElementById('totalExpenses').innerText = total.toFixed(2);
    document.getElementById('monthExpenses').innerHTML = `PKR ${monthTotal.toFixed(2)}`;

    if (expenses.length === 0) {
        document.getElementById('expensesList').innerHTML = `
            <tr><td colspan="6" class="empty-state">
                <i class="bi bi-inbox"></i>
                <p>No expenses recorded yet.</p>
            </td></tr>`;
        return;
    }

    document.getElementById('expensesList').innerHTML = expenses.map(e => `
        <tr>
            <td>${e.date}</td>
            <td><span class="category-badge">${e.category}</span></td>
            <td class="amount-cell">PKR ${e.amount.toFixed(2)}</td>
            <td>${e.description || '-'}</td>
            <td>${e.created_by}</td>
            <td>
                <button class="btn-delete-row" onclick="deleteExpense(${e.id})">
                    <i class="bi bi-trash3"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function resetExpenseForm() {
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseCategory').value = 'Electricity';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDescription').value = '';
}

async function saveExpense() {
    const data = {
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        description: document.getElementById('expenseDescription').value
    };

    if (!data.amount) { alert('Amount required'); return; }

    const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('expenseModal')).hide();
        loadExpenses();
        alert('Expense added successfully!');
    } else {
        alert('Error saving expense.');
    }
}

async function deleteExpense(id) {
    if (confirm('Delete this expense?')) {
        await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        loadExpenses();
    }
}

loadExpenses();
