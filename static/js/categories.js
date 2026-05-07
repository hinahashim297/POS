// ===== STATE =====
let allCategories = [];
let productCounts = {};
let deleteName    = null;
let deleteModal   = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    loadAll();
    document.getElementById('categoryName').addEventListener('keydown', e => {
        if (e.key === 'Enter') addCategory();
    });
});

// ===== LOAD ALL =====
async function loadAll() {
    await Promise.all([loadCategories(), loadProductCounts()]);
    updateStats();
    renderCategories();
}

async function refreshAll() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    await loadAll();
    btn.classList.remove('spinning');
    showToast('Refreshed successfully!', 'success');
}

// ===== FETCH CATEGORIES =====
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        allCategories = (data || []).filter(Boolean);
    } catch (e) {
        allCategories = [];
        console.error('Categories fetch error:', e);
    }
}

// ===== FETCH PRODUCT COUNTS =====
async function loadProductCounts() {
    try {
        const res      = await fetch('/api/products');
        const products = await res.json();
        productCounts  = {};
        (products || []).forEach(p => {
            const cat = p.category || 'Uncategorized';
            productCounts[cat] = (productCounts[cat] || 0) + 1;
        });
    } catch (e) {
        productCounts = {};
        console.error('Products fetch error:', e);
    }
}

// ===== UPDATE STATS =====
function updateStats() {
    const total        = allCategories.length;
    const withProducts = allCategories.filter(c => (productCounts[c] || 0) > 0).length;
    document.getElementById('totalCount').textContent        = total;
    document.getElementById('withProductsCount').textContent = withProducts;
    document.getElementById('emptyCount').textContent        = total - withProducts;
}

// ===== RENDER TABLE =====
function renderCategories() {
    const tbody  = document.getElementById('categoriesTable');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const filtered = search
        ? allCategories.filter(c => c.toLowerCase().includes(search))
        : [...allCategories];

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">
            <i class="bi bi-tags"></i>
            <p>${search ? 'No categories match your search.' : 'No categories yet. Add one above!'}</p>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((cat, idx) => {
        const count     = productCounts[cat] || 0;
        const cls       = count > 0 ? 'has-products' : '';
        const label     = count > 0 ? `${count} product${count !== 1 ? 's' : ''}` : '0 products';
        const canDelete = count === 0;
        return `
        <tr>
            <td style="color:#5f7a76;font-size:13px;">${idx + 1}</td>
            <td>
                <div class="category-name">
                    <div class="category-icon"><i class="bi bi-folder-fill"></i></div>
                    ${escapeHtml(cat)}
                </div>
            </td>
            <td><span class="product-count ${cls}">${label}</span></td>
            <td style="text-align:right;padding-right:20px;">
                <button class="btn-delete"
                        onclick="showDeleteModal('${escapeHtml(cat)}')"
                        ${!canDelete ? 'disabled title="Has products — cannot delete"' : ''}>
                    <i class="bi bi-trash3"></i> Delete
                </button>
            </td>
        </tr>`;
    }).join('');
}

function filterCategories() { renderCategories(); }

// ===== ADD CATEGORY =====
async function addCategory() {
    const input = document.getElementById('categoryName');
    const name  = input.value.trim();
    const btn   = document.getElementById('addBtn');

    if (!name) { input.focus(); showToast('Please enter a category name.', 'error'); return; }

    if (allCategories.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
        showToast('This category already exists!', 'error'); input.focus(); return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';

    try {
        const res  = await fetch('/api/categories/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();

        if (data.success) {
            input.value = '';
            showToast(`✅ "${name}" added successfully!`, 'success');
            await loadAll();
        } else {
            showToast('❌ ' + (data.error || 'Failed to add'), 'error');
        }
    } catch (e) {
        showToast('❌ Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Add Category';
    }
}

// ===== DELETE =====
function showDeleteModal(name) {
    deleteName = name;
    document.getElementById('deleteModalName').textContent = '"' + name + '"';
    deleteModal.show();

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = async () => {
        await deleteCategory(name);
        deleteModal.hide();
    };
}

async function deleteCategory(name) {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';

    try {
        const res  = await fetch('/api/categories/delete', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();

        if (data.success) {
            showToast(`✅ "${name}" deleted!`, 'success');
            await loadAll();
        } else {
            showToast('❌ ' + (data.error || 'Cannot delete'), 'error');
        }
    } catch (e) {
        showToast('❌ Network error. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i>Delete';
    }
}

// ===== TOAST =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'x-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== ESCAPE HTML =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
