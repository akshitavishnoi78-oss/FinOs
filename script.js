/* ========================================================================
   FinOS — state & persistence
   All data (income, expenses, budgets, bills, goals) is entered by the
   user and saved to this browser only. There is no seeded/sample data.
   Each signed-in user gets their own storage key (see auth.js), so more
   than one person on the same browser keeps separate numbers.
   ======================================================================== */
const CURRENT_USER = typeof currentUser === 'function' ? currentUser() : null;
const STORE_KEY = CURRENT_USER ? userStateKey(CURRENT_USER) : 'finos_state_v2';

function uid(){ return Math.random().toString(36).slice(2,10); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function monthKey(dateStr){ return dateStr.slice(0,7); } // YYYY-MM
function fmtINR(n){
  n = Math.round(Number(n)||0);
  return '₹' + n.toLocaleString('en-IN');
}
function fmtDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function ordinal(n){
  const s=["th","st","nd","rd"], v=n%100;
  return n + (s[(v-20)%10]||s[v]||s[0]);
}

function defaultState(){
  return {
    income: [],
    expenses: [],
    budgets: {},
    bills: [],
    goals: [],
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) return Object.assign(defaultState(), JSON.parse(raw));
  }catch(e){ console.warn('Could not read saved data', e); }
  const fresh = defaultState();
  saveState(fresh);
  return fresh;
}
function saveState(s){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
  catch(e){ console.warn('Could not persist data', e); }
}

let state = loadState();
function persist(){ saveState(state); }

/* ========================================================================
   Sidebar nav — mark the current page active
   ======================================================================== */
(function highlightNav(){
  const page = document.body.dataset.page;
  if(!page) return;
  document.querySelectorAll('.navlist a[data-page]').forEach(a=>{
    a.classList.toggle('active', a.dataset.page === page);
  });
})();

/* ========================================================================
   Signed-in user chip + sign out (sidebar footer)
   ======================================================================== */
(function renderUserChip(){
  const label = document.getElementById('current-user-label');
  const avatar = document.getElementById('current-user-avatar');
  if(CURRENT_USER){
    if(label) label.textContent = CURRENT_USER;
    if(avatar) avatar.textContent = CURRENT_USER.charAt(0).toUpperCase();
  }
  document.getElementById('logout-btn')?.addEventListener('click', ()=>{
    if(typeof logout === 'function') logout();
  });
})();

/* ========================================================================
   Derived helpers
   ======================================================================== */
const CAT_COLORS = {
  'Food':'#157A5C','Shopping':'#B8722D','Transport':'#3B6FA0','Fuel':'#6C5CB5',
  'Rent':'#B5473F','EMI':'#8A5A2E','Utilities':'#2E8FA3','Entertainment':'#A0499A',
  'Medical':'#C0392B','Education':'#1F8A70','Travel':'#C77B2B'
};
function catColor(c){ return CAT_COLORS[c] || '#647184'; }

function currentMonthKey(){ return todayISO().slice(0,7); }

function monthlyTotal(list, mKey){
  return list.filter(x=>monthKey(x.date)===mKey).reduce((s,x)=>s+Number(x.amount),0);
}
function yearlyTotal(list, year){
  return list.filter(x=>x.date.slice(0,4)===String(year)).reduce((s,x)=>s+Number(x.amount),0);
}
function allTime(list){ return list.reduce((s,x)=>s+Number(x.amount),0); }

function prevMonthKey(mKey){
  const [y,m] = mKey.split('-').map(Number);
  const d = new Date(y, m-2, 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function daysUntil(day){
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), day);
  if(target < new Date(now.getFullYear(), now.getMonth(), now.getDate())){
    target = new Date(now.getFullYear(), now.getMonth()+1, day);
  }
  const diff = Math.ceil((target - new Date(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000);
  return diff;
}
function trashIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
}
function editIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
}

/* ========================================================================
   RENDER: Dashboard
   ======================================================================== */
function renderDashboard(){
  if(!document.getElementById('dash-stats')) return;

  const mKey = currentMonthKey();
  const pKey = prevMonthKey(mKey);
  const monthLabel = new Date().toLocaleDateString('en-IN',{month:'long', year:'numeric'});
  const monthLabelEl = document.getElementById('dash-month-label');
  if(monthLabelEl) monthLabelEl.textContent = monthLabel;

  const inc = monthlyTotal(state.income, mKey);
  const exp = monthlyTotal(state.expenses, mKey);
  const sav = inc - exp;
  const balance = allTime(state.income) - allTime(state.expenses);
  const prevInc = monthlyTotal(state.income, pKey);
  const incChange = prevInc>0 ? ((inc-prevInc)/prevInc*100) : 0;

  const stats = [
    { label:'Monthly Income', value:inc, icon:'up', tone:'emerald', sub: prevInc>0 ? ((incChange>=0?'+':'') + incChange.toFixed(1) + '% vs last month') : 'No entries last month', subTone: incChange>=0?'pos':'neg' },
    { label:'Monthly Expenses', value:exp, icon:'down', tone:'rose', sub: fmtINR(exp) + ' spent this month', subTone:'' },
    { label:'Monthly Savings', value:sav, icon:'piggy', tone: sav>=0?'emerald':'rose', sub: (inc===0 && exp===0) ? 'No data yet' : (sav>=0 ? 'On track' : 'Spending exceeds income'), subTone: sav>=0?'pos':'neg' },
    { label:'Current Balance', value:balance, icon:'wallet', tone:'ink', sub:'All-time net position', subTone:'' },
  ];
  const icons = {
    up:'<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
    down:'<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
    piggy:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
    wallet:'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M16 12h.01"/>'
  };
  document.getElementById('dash-stats').innerHTML = stats.map(s=>`
    <div class="card stat-card">
      <div class="stat-label">
        <span class="stat-icon ${s.tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[s.icon]}</svg></span>
        ${s.label}
      </div>
      <div class="stat-value">${fmtINR(s.value)}</div>
      <div class="stat-sub ${s.subTone}">${s.sub}</div>
    </div>
  `).join('');

  // Bills
  const sortedBills = [...state.bills].sort((a,b)=>daysUntil(a.day)-daysUntil(b.day));
  const billsEl = document.getElementById('dash-bills');
  if(billsEl){
    billsEl.innerHTML = sortedBills.length ? sortedBills.map(b=>{
      const d = daysUntil(b.day);
      let pillClass='ink', pillText=`in ${d}d`;
      if(d<=3){ pillClass='rose'; pillText = d<=0 ? 'due today' : `in ${d}d`; }
      else if(d<=7){ pillClass='amber'; pillText = `in ${d}d`; }
      return `<div class="bill-row">
        <div>
          <div class="bill-name">${b.name}</div>
          <div class="bill-due">Due ${ordinal(b.day)} of the month</div>
        </div>
        <div class="bill-right">
          <span class="bill-amount">${fmtINR(b.amount)}</span>
          <span class="pill ${pillClass}">${pillText}</span>
          <button class="row-actions" style="all:unset; cursor:pointer; display:flex; color:var(--faint);" data-del-bill="${b.id}" title="Remove">${trashIcon()}</button>
        </div>
      </div>`;
    }).join('') : `<div style="color:var(--faint); font-size:13px; padding:10px 0;">No bills added yet — use the form below.</div>`;
  }

  // Budget progress mini
  const cats = Object.keys(state.budgets);
  const budgetEl = document.getElementById('dash-budget');
  if(budgetEl){
    budgetEl.innerHTML = cats.length ? cats.map(c=>{
      const spent = state.expenses.filter(e=>e.category===c && monthKey(e.date)===mKey).reduce((s,e)=>s+Number(e.amount),0);
      const limit = state.budgets[c];
      const pct = Math.min(100, limit>0 ? (spent/limit*100) : 0);
      const over = spent > limit;
      return `<div class="bar-row">
        <div class="bar-head"><span class="bar-cat">${c}</span><span class="bar-figs">${fmtINR(spent)} / ${fmtINR(limit)}</span></div>
        <div class="bar-track"><div class="bar-fill ${over?'rose':(pct>85?'amber':'')}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('') : `<div style="color:var(--faint); font-size:13px; padding:10px 0;">No budgets set yet — head to Budget Planner.</div>`;
  }
}

document.getElementById('bill-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const day = parseInt(document.getElementById('bill-day').value, 10);
  if(!name || !amount || amount<=0 || !day || day<1 || day>31) return;
  state.bills.push({ id:uid(), name, amount, day });
  persist();
  e.target.reset();
  renderAll();
});
document.getElementById('dash-bills')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-del-bill]');
  if(!btn) return;
  state.bills = state.bills.filter(b=>b.id!==btn.dataset.delBill);
  persist(); renderAll();
});

/* ========================================================================
   RENDER: Income
   ======================================================================== */
function renderIncome(){
  if(!document.getElementById('income-stats')) return;

  const mKey = currentMonthKey();
  const pKey = prevMonthKey(mKey);
  const monthly = monthlyTotal(state.income, mKey);
  const prevMonthly = monthlyTotal(state.income, pKey);
  const yearly = yearlyTotal(state.income, new Date().getFullYear());
  const gap = monthly - prevMonthly;
  const gapPct = prevMonthly>0 ? (gap/prevMonthly*100) : 0;

  document.getElementById('income-stats').innerHTML = `
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-icon emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></span>Monthly Income</div>
      <div class="stat-value">${fmtINR(monthly)}</div>
      <div class="stat-sub">This calendar month</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-icon ink"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg></span>Yearly Income</div>
      <div class="stat-value">${fmtINR(yearly)}</div>
      <div class="stat-sub">Year to date, ${new Date().getFullYear()}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label"><span class="stat-icon ${gap>=0?'emerald':'rose'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/></svg></span>Income Growth Gap</div>
      <div class="stat-value">${gap>=0?'+':''}${fmtINR(gap)}</div>
      <div class="stat-sub ${gap>=0?'pos':'neg'}">${prevMonthly>0 ? ((gap>=0?'+':'')+gapPct.toFixed(1)+'% vs last month') : 'No entries last month'}</div>
    </div>
  `;

  const sorted = [...state.income].sort((a,b)=> b.date.localeCompare(a.date));
  document.getElementById('income-table').innerHTML = sorted.length ? sorted.map(i=>`
    <tr>
      <td>${fmtDate(i.date)}</td>
      <td><span class="cat-chip">${i.source}</span></td>
      <td class="num pos">+${fmtINR(i.amount)}</td>
      <td class="row-actions"><button class="del" data-del-income="${i.id}" title="Delete">${trashIcon()}</button></td>
    </tr>
  `).join('') : `<tr class="empty-row"><td colspan="4">No income logged yet — add your first entry above.</td></tr>`;

  const bySource = {};
  state.income.forEach(i=>{ bySource[i.source] = (bySource[i.source]||0) + Number(i.amount); });
  const sources = Object.keys(bySource).sort((a,b)=>bySource[b]-bySource[a]);
  document.getElementById('income-by-source').innerHTML = sources.length ? `<div class="kv-list">` + sources.map(s=>`
    <div class="kv-row"><span>${s}</span><span class="kv-amt">${fmtINR(bySource[s])}</span></div>
  `).join('') + `</div>` : `<div style="color:var(--faint); font-size:13px;">No income sources yet.</div>`;
}

document.getElementById('income-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const source = document.getElementById('income-source').value;
  const amount = parseFloat(document.getElementById('income-amount').value);
  const date = document.getElementById('income-date').value || todayISO();
  if(!amount || amount<=0) return;
  state.income.push({ id:uid(), source, amount, date });
  persist();
  e.target.reset();
  document.getElementById('income-date').value = todayISO();
  renderAll();
});
document.getElementById('income-table')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-del-income]');
  if(!btn) return;
  state.income = state.income.filter(i=>i.id!==btn.dataset.delIncome);
  persist(); renderAll();
});

/* ========================================================================
   RENDER: Expenses
   ======================================================================== */
let expenseFilters = { search:'', month:'all', category:'all' };
let editingExpenseId = null;

function renderExpenseFilters(){
  const monthSel = document.getElementById('expense-month-filter');
  if(!monthSel) return;
  const months = Array.from(new Set(state.expenses.map(e=>monthKey(e.date)))).sort().reverse();
  monthSel.innerHTML = `<option value="all">All months</option>` + months.map(m=>{
    const label = new Date(m+'-01').toLocaleDateString('en-IN',{month:'long', year:'numeric'});
    return `<option value="${m}">${label}</option>`;
  }).join('');
  monthSel.value = expenseFilters.month;

  const catFilterEl = document.getElementById('expense-cat-filter');
  const usedCats = Array.from(new Set(state.expenses.map(e=>e.category)));
  catFilterEl.innerHTML = ['all', ...usedCats].map(c=>`
    <button data-cat="${c}" class="${expenseFilters.category===c?'active':''}">${c==='all'?'All categories':c}</button>
  `).join('');
}

function renderExpenseTable(){
  const tbody = document.getElementById('expense-table');
  if(!tbody) return;
  let list = [...state.expenses];
  if(expenseFilters.month!=='all') list = list.filter(e=>monthKey(e.date)===expenseFilters.month);
  if(expenseFilters.category!=='all') list = list.filter(e=>e.category===expenseFilters.category);
  if(expenseFilters.search.trim()){
    const q = expenseFilters.search.trim().toLowerCase();
    list = list.filter(e=> (e.note||'').toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }
  list.sort((a,b)=> b.date.localeCompare(a.date));

  tbody.innerHTML = list.length ? list.map(e=>`
    <tr>
      <td>${fmtDate(e.date)}</td>
      <td><span class="cat-chip" style="background:${catColor(e.category)}1A; color:${catColor(e.category)};">${e.category}</span></td>
      <td style="color:var(--muted);">${e.note ? e.note : '—'}</td>
      <td class="num neg">−${fmtINR(e.amount)}</td>
      <td class="row-actions">
        <button data-edit-expense="${e.id}" title="Edit">${editIcon()}</button>
        <button class="del" data-del-expense="${e.id}" title="Delete">${trashIcon()}</button>
      </td>
    </tr>
  `).join('') : `<tr class="empty-row"><td colspan="5">${state.expenses.length ? 'No expenses match your filters.' : 'No expenses logged yet — add your first one above.'}</td></tr>`;
}

function renderExpenses(){
  if(!document.getElementById('expense-form')) return;
  renderExpenseFilters();
  renderExpenseTable();
}

document.getElementById('expense-search')?.addEventListener('input', (e)=>{
  expenseFilters.search = e.target.value; renderExpenseTable();
});
document.getElementById('expense-month-filter')?.addEventListener('change', (e)=>{
  expenseFilters.month = e.target.value; renderExpenseTable();
});
document.getElementById('expense-cat-filter')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-cat]');
  if(!btn) return;
  expenseFilters.category = btn.dataset.cat;
  renderExpenseFilters(); renderExpenseTable();
});

document.getElementById('expense-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const category = document.getElementById('expense-category').value;
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const date = document.getElementById('expense-date').value || todayISO();
  const note = document.getElementById('expense-note').value.trim();
  if(!amount || amount<=0) return;

  if(editingExpenseId){
    const item = state.expenses.find(x=>x.id===editingExpenseId);
    if(item){ item.category=category; item.amount=amount; item.date=date; item.note=note; }
    editingExpenseId = null;
    document.getElementById('expense-submit').textContent = 'Add Expense';
  } else {
    state.expenses.push({ id:uid(), category, amount, date, note });
  }
  persist();
  e.target.reset();
  document.getElementById('expense-date').value = todayISO();
  renderAll();
});

document.getElementById('expense-table')?.addEventListener('click', (e)=>{
  const delBtn = e.target.closest('[data-del-expense]');
  const editBtn = e.target.closest('[data-edit-expense]');
  if(delBtn){
    state.expenses = state.expenses.filter(x=>x.id!==delBtn.dataset.delExpense);
    persist(); renderAll();
    return;
  }
  if(editBtn){
    const item = state.expenses.find(x=>x.id===editBtn.dataset.editExpense);
    if(!item) return;
    document.getElementById('expense-category').value = item.category;
    document.getElementById('expense-amount').value = item.amount;
    document.getElementById('expense-date').value = item.date;
    document.getElementById('expense-note').value = item.note || '';
    editingExpenseId = item.id;
    document.getElementById('expense-submit').textContent = 'Save Changes';
    document.getElementById('expense-category').closest('form').scrollIntoView({behavior:'smooth', block:'center'});
  }
});

/* ========================================================================
   RENDER: Budget
   ======================================================================== */
function renderBudget(){
  if(!document.getElementById('budget-bars')) return;
  const mKey = currentMonthKey();
  const labelEl = document.getElementById('budget-month-label');
  if(labelEl) labelEl.textContent = new Date().toLocaleDateString('en-IN',{month:'long', year:'numeric'});
  const cats = Object.keys(state.budgets);
  document.getElementById('budget-bars').innerHTML = cats.length ? cats.map(c=>{
    const spent = state.expenses.filter(e=>e.category===c && monthKey(e.date)===mKey).reduce((s,e)=>s+Number(e.amount),0);
    const limit = state.budgets[c];
    const pct = Math.min(100, limit>0 ? (spent/limit*100) : 0);
    const over = spent>limit;
    const remaining = limit - spent;
    return `<div class="bar-row">
      <div class="bar-head">
        <span class="bar-cat">${c}</span>
        <span class="bar-figs">${fmtINR(spent)} / ${fmtINR(limit)} · ${over? 'over by '+fmtINR(spent-limit) : fmtINR(remaining)+' left'}</span>
      </div>
      <div class="bar-track"><div class="bar-fill ${over?'rose':(pct>85?'amber':'')}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('') : `<div style="color:var(--faint); font-size:13px; padding:6px 0;">No budgets set yet. Add one on the right.</div>`;
}
document.getElementById('budget-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const cat = document.getElementById('budget-category').value;
  const limit = parseFloat(document.getElementById('budget-limit').value);
  if(!limit || limit<=0) return;
  state.budgets[cat] = limit;
  persist();
  e.target.reset();
  renderAll();
});

/* ========================================================================
   RENDER: Savings Goals
   ======================================================================== */
function avgMonthlySavingsRate(){
  const mKey = currentMonthKey();
  const pKey = prevMonthKey(mKey);
  const thisMonth = monthlyTotal(state.income, mKey) - monthlyTotal(state.expenses, mKey);
  const lastMonth = monthlyTotal(state.income, pKey) - monthlyTotal(state.expenses, pKey);
  const vals = [thisMonth, lastMonth].filter(v=>v>0);
  if(!vals.length) return 0;
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}

function ringSVG(pct){
  const r = 54, c = 2*Math.PI*r;
  const offset = c - (Math.min(pct,100)/100)*c;
  return `<svg width="132" height="132" viewBox="0 0 132 132">
    <circle cx="66" cy="66" r="${r}" stroke="#EDEFF3" stroke-width="12" fill="none"/>
    <circle cx="66" cy="66" r="${r}" stroke="#157A5C" stroke-width="12" fill="none"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
  </svg>`;
}

function renderSavings(){
  if(!document.getElementById('goal-list')) return;
  const rate = avgMonthlySavingsRate();
  document.getElementById('goal-list').innerHTML = state.goals.length ? state.goals.map(g=>{
    const pct = Math.min(100, g.target>0 ? (g.saved/g.target*100) : 0);
    const remaining = Math.max(0, g.target - g.saved);
    const months = rate>0 ? Math.ceil(remaining/rate) : null;
    return `<div class="card goal-card">
      <div class="ring-wrap">
        ${ringSVG(pct)}
        <div class="ring-pct"><div class="num">${pct.toFixed(0)}%</div><div class="lbl">funded</div></div>
      </div>
      <div class="goal-meta">
        <h3>${g.name}</h3>
        <div class="target">Target amount: ${fmtINR(g.target)}</div>
        <div class="goal-stats">
          <div class="goal-stat"><div class="lbl">Already Saved</div><div class="val">${fmtINR(g.saved)}</div></div>
          <div class="goal-stat"><div class="lbl">Still Needed</div><div class="val">${fmtINR(remaining)}</div></div>
          <div class="goal-stat"><div class="lbl">Months to Goal</div><div class="val">${months===null ? '—' : '~'+months}</div></div>
        </div>
        <div style="display:flex; gap:8px; margin-top:14px;">
          <button class="btn sm ghost" data-add-saved="${g.id}">+ ₹1,000 saved</button>
          <button class="btn sm danger-ghost" data-del-goal="${g.id}">Remove goal</button>
        </div>
      </div>
    </div>`;
  }).join('') : `<div class="card" style="color:var(--faint); font-size:13px;">No savings goals yet — add one below.</div>`;
}
document.getElementById('goal-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
  if(!name || !target || target<=0) return;
  state.goals.push({ id:uid(), name, target, saved });
  persist();
  e.target.reset();
  renderAll();
});
document.getElementById('goal-list')?.addEventListener('click', (e)=>{
  const addBtn = e.target.closest('[data-add-saved]');
  const delBtn = e.target.closest('[data-del-goal]');
  if(addBtn){
    const g = state.goals.find(x=>x.id===addBtn.dataset.addSaved);
    if(g) g.saved = Math.min(g.target, g.saved + 1000);
    persist(); renderAll();
  }
  if(delBtn){
    state.goals = state.goals.filter(x=>x.id!==delBtn.dataset.delGoal);
    persist(); renderAll();
  }
});

/* ========================================================================
   EMI Calculator (inputs are always user-supplied, via sliders)
   ======================================================================== */
function computeEMI(P, annualRatePct, years){
  const r = (annualRatePct/12)/100;
  const n = years*12;
  if(r===0) return { emi: P/n, totalPayment: P, totalInterest: 0 };
  const emi = P * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
  const totalPayment = emi*n;
  const totalInterest = totalPayment - P;
  return { emi, totalPayment, totalInterest };
}
function renderEMI(){
  const amountInput = document.getElementById('emi-amount');
  if(!amountInput) return;
  const P = parseFloat(amountInput.value);
  const rate = parseFloat(document.getElementById('emi-rate').value);
  const years = parseFloat(document.getElementById('emi-years').value);
  document.getElementById('emi-amount-v').textContent = fmtINR(P);
  document.getElementById('emi-rate-v').textContent = rate.toFixed(1) + '%';
  document.getElementById('emi-years-v').textContent = years + (years==1?' yr':' yrs');

  const { emi, totalPayment, totalInterest } = computeEMI(P, rate, years);
  document.getElementById('emi-monthly').textContent = fmtINR(emi);
  document.getElementById('emi-interest').textContent = fmtINR(totalInterest);
  document.getElementById('emi-total').textContent = fmtINR(totalPayment);
  document.getElementById('emi-principal-lbl').textContent = fmtINR(P);
  document.getElementById('emi-interest-lbl').textContent = fmtINR(totalInterest);

  const pPct = totalPayment>0 ? (P/totalPayment*100) : 100;
  document.getElementById('emi-composition').innerHTML =
    `<div style="width:${pPct}%; background:#157A5C;"></div><div style="width:${100-pPct}%; background:#B8722D;"></div>`;
}
['emi-amount','emi-rate','emi-years'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input', renderEMI);
});

/* ========================================================================
   SIP Calculator (inputs are always user-supplied, via sliders)
   ======================================================================== */
function computeSIP(monthly, years, annualReturnPct){
  const i = (annualReturnPct/12)/100;
  const n = years*12;
  const invested = monthly*n;
  let future;
  if(i===0) future = invested;
  else future = monthly * ((Math.pow(1+i,n)-1)/i) * (1+i);
  const gained = future - invested;
  return { invested, future, gained };
}
function renderSIP(){
  const amountInput = document.getElementById('sip-amount');
  if(!amountInput) return;
  const monthly = parseFloat(amountInput.value);
  const years = parseFloat(document.getElementById('sip-years').value);
  const ret = parseFloat(document.getElementById('sip-return').value);
  document.getElementById('sip-amount-v').textContent = fmtINR(monthly);
  document.getElementById('sip-years-v').textContent = years + (years==1?' yr':' yrs');
  document.getElementById('sip-return-v').textContent = ret.toFixed(1) + '%';

  const { invested, future, gained } = computeSIP(monthly, years, ret);
  document.getElementById('sip-future').textContent = fmtINR(future);
  document.getElementById('sip-invested').textContent = fmtINR(invested);
  document.getElementById('sip-gained').textContent = fmtINR(gained);
  document.getElementById('sip-invested-lbl').textContent = fmtINR(invested);
  document.getElementById('sip-gained-lbl').textContent = fmtINR(gained);

  const investedPct = future>0 ? (invested/future*100) : 100;
  document.getElementById('sip-composition').innerHTML =
    `<div style="width:${investedPct}%; background:#3B6FA0;"></div><div style="width:${100-investedPct}%; background:#157A5C;"></div>`;
}
['sip-amount','sip-years','sip-return'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input', renderSIP);
});

/* ========================================================================
   Boot — only the sections present on the current page actually render
   ======================================================================== */
function renderAll(){
  renderDashboard();
  renderIncome();
  renderExpenses();
  renderBudget();
  renderSavings();
  renderEMI();
  renderSIP();
}

if(document.getElementById('income-date')) document.getElementById('income-date').value = todayISO();
if(document.getElementById('expense-date')) document.getElementById('expense-date').value = todayISO();
renderAll();
