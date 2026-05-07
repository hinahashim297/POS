let loyaltyData=[], customers=[];
async function loadLoyalty(){ const res=await fetch('/api/loyalty'); loyaltyData=await res.json(); document.getElementById('loyaltyList').innerHTML=loyaltyData.map(l=>`<tr><td>${escapeHtml(l.customer_name)}</td><td>${l.phone||'-'}</td><td><span class="badge bg-warning">${l.points}</span></td><td>PKR ${l.total_spent.toFixed(2)}</td><td><button class="btn btn-sm btn-outline-primary" onclick="editLoyalty(${l.customer_id})"><i class="fas fa-plus"></i> Add Points</button></td></tr>`).join(''); }
async function loadCustomers(){ const res=await fetch('/api/customers'); customers=await res.json(); document.getElementById('loyaltyCustomer').innerHTML=customers.map(c=>`<option value="${c.id}">${c.name} (${c.phone||'No phone'})</option>`).join(''); }
function resetLoyaltyForm(){ document.getElementById('loyaltyCustomerId').value=''; document.getElementById('loyaltyPoints').value=''; document.getElementById('loyaltyCustomer').value=''; }
function editLoyalty(id){ document.getElementById('loyaltyCustomerId').value=id; document.getElementById('loyaltyCustomer').value=id; document.getElementById('loyaltyPoints').value=''; new bootstrap.Modal(document.getElementById('loyaltyModal')).show(); }
async function addLoyaltyPoints(){ const data={ customer_id:parseInt(document.getElementById('loyaltyCustomer').value), points:parseInt(document.getElementById('loyaltyPoints').value) };
    if(!data.customer_id||!data.points){ alert('Please fill all fields'); return; }
    const res=await fetch('/api/loyalty',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(res.ok){ bootstrap.Modal.getInstance(document.getElementById('loyaltyModal')).hide(); loadLoyalty(); alert('Points added!'); } else alert('Error'); }
function escapeHtml(str){ if(!str) return ''; return str.replace(/[&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
loadLoyalty(); loadCustomers();
