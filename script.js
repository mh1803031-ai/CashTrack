// --- 1. CONFIG & STATE ---
const CONFIG = {
    storageKey: 'casstrack_data_v1',
    goalKey: 'casstrack_goal_v1',
    themeKey: 'casstrack_theme_v1'
};

const CATEGORIES = {
    expense: [
        { id: 'food', name: 'Makanan', icon: '🍔' },
        { id: 'drink', name: 'Minuman', icon: '🥤' },
        { id: 'transport', name: 'Transport', icon: '🚌' },
        { id: 'stationery', name: 'Alat Tulis', icon: '✏️' },
        { id: 'game', name: 'Game/Hobi', icon: '🎮' },
        { id: 'other', name: 'Lainnya', icon: '📌' }
    ],
    income: [
        { id: 'allowance', name: 'Uang Jajan', icon: '💸' },
        { id: 'gift', name: 'Hadiah', icon: '🎁' },
        { id: 'salary', name: 'Gaji/Kerja', icon: '💼' },
        { id: 'other', name: 'Lainnya', icon: '📌' }
    ]
};

let state = {
    transactions: [],
    goal: 100000,
    theme: 'light',
    filter: 'all',
    currentType: 'expense'
};

// --- 2. DOM ELEMENTS ---
const el = (id) => document.getElementById(id);
const els = {
    views: ['home', 'add', 'history', 'settings'],
    balance: el('displayBalance'),
    goalBar: el('goalBar'),
    goalTarget: el('goalTarget'),
    goalCurrent: el('goalCurrent'),
    form: el('transForm'),
    inputAmount: el('inputAmount'),
    inputCat: el('inputCategory'),
    inputDate: el('inputDate'),
    inputDesc: el('inputDesc'),
    listContainer: el('listContainer'),
    emptyState: el('emptyState'),
    chart: el('expenseChart'),
    chartLegend: el('chartLegend'),
    monthExp: el('monthExpense'),
    themeToggle: el('themeToggle'),
    toast: el('toast'),
    toastMsg: el('toastMsg'),
    goalInput: el('setGoalInput'),
    typeSwitches: document.querySelectorAll('.switch-opt')
};

// --- 3. CORE LOGIC ---

function init() {
    loadData();
    applyTheme(state.theme);
    els.inputDate.valueAsDate = new Date();
    els.goalInput.value = state.goal;
    renderCategories();
    updateUI();
}

function loadData() {
    try {
        const rawTrans = localStorage.getItem(CONFIG.storageKey);
        const rawGoal = localStorage.getItem(CONFIG.goalKey);
        const rawTheme = localStorage.getItem(CONFIG.themeKey);

        if (rawTrans) state.transactions = JSON.parse(rawTrans);
        if (rawGoal) state.goal = parseInt(rawGoal);
        if (rawTheme) state.theme = rawTheme;
    } catch (e) {
        console.error("Gagal memuat data", e);
    }
}

function saveData() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.transactions));
    localStorage.setItem(CONFIG.goalKey, state.goal.toString());
    localStorage.setItem(CONFIG.themeKey, state.theme);
    updateUI();
}

function updateUI() {
    renderBalance();
    renderList();
    drawChart();
}

function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0 
    }).format(num);
}

// --- 4. RENDERERS ---

function renderBalance() {
    const total = state.transactions.reduce((acc, t) => 
        t.type === 'income' ? acc + t.amount : acc - t.amount, 0
    );

    els.balance.textContent = formatRupiah(total);
    els.goalCurrent.textContent = formatRupiah(total);
    els.goalTarget.textContent = `Target: ${formatRupiah(state.goal)}`;

    const pct = Math.min((total / state.goal) * 100, 100);
    els.goalBar.style.width = `${pct}%`;
    
    // Month Expense
    const now = new Date();
    const monthExp = state.transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth())
        .reduce((a,b) => a + b.amount, 0);
    els.monthExp.textContent = formatRupiah(monthExp);
}

function renderCategories() {
    els.inputCat.innerHTML = '';
    const list = CATEGORIES[state.currentType];
    list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.icon} ${c.name}`;
        els.inputCat.appendChild(opt);
    });
}

function setTransType(type) {
    state.currentType = type;
    els.typeSwitches.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    renderCategories();
}

function renderList() {
    els.listContainer.innerHTML = '';
    
    // Filter
    let filtered = state.transactions;
    if (state.filter !== 'all') {
        filtered = filtered.filter(t => t.type === state.filter);
    }

    if (filtered.length === 0) {
        els.emptyState.classList.remove('hidden');
        return;
    } else {
        els.emptyState.classList.add('hidden');
    }

    // Group by Date
    const groups = {};
    filtered.forEach(t => {
        if (!groups[t.date]) groups[t.date] = [];
        groups[t.date].push(t);
    });

    // Sort Dates Descending
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'trans-group';

        // Header Date
        const dateObj = new Date(date);
        const today = new Date();
        let dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
        if (dateObj.toDateString() === today.toDateString()) dateStr = "Hari Ini";

        groupDiv.innerHTML = `<div class="group-header">${dateStr}</div>`;

        // Items
        groups[date].forEach(t => {
            const catList = t.type === 'expense' ? CATEGORIES.expense : CATEGORIES.income;
            const catObj = catList.find(c => c.id === t.category) || { name: 'Umum', icon: '❓' };
            const isInc = t.type === 'income';
            const colorClass = isInc ? 'bg-inc' : 'bg-exp';
            const borderClass = isInc ? 'income' : 'expense';
            const sign = isInc ? '+' : '-';
            const amountColor = isInc ? 'text-success' : 'text-danger';

            const item = document.createElement('div');
            item.className = `trans-item ${borderClass}`;
            item.innerHTML = `
                <div class="trans-icon ${colorClass}">${catObj.icon}</div>
                <div class="trans-details">
                    <div class="trans-title">${t.desc}</div>
                    <div class="trans-meta">${catObj.name}</div>
                </div>
                <div class="flex-center">
                    <div class="trans-amount ${amountColor}">${sign}${formatRupiah(t.amount)}</div>
                    <button class="btn-delete" aria-label="Hapus">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;

            // Delete Logic (Fixed Interaction)
            const delBtn = item.querySelector('.btn-delete');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Hapus transaksi ini?')) {
                    state.transactions = state.transactions.filter(x => x.id !== t.id);
                    saveData();
                    showToast('Transaksi dihapus');
                }
            });

            groupDiv.appendChild(item);
        });

        els.listContainer.appendChild(groupDiv);
    });
}

function filterHistory(type, chip) {
    state.filter = type;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderList();
}

function drawChart() {
    const ctx = els.chart.getContext('2d');
    const width = els.chart.width;
    const height = els.chart.height;
    ctx.clearRect(0, 0, width, height);

    const expenses = state.transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) {
        // Draw empty grey circle
        ctx.beginPath();
        ctx.arc(100, 100, 80, 0, 2 * Math.PI);
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border');
        ctx.lineWidth = 20;
        ctx.stroke();
        els.chartLegend.innerHTML = "Belum ada pengeluaran";
        return;
    }

    // Aggregate Data
    const dataMap = {};
    let total = 0;
    CATEGORIES.expense.forEach(c => dataMap[c.id] = 0);
    
    expenses.forEach(t => {
        if (dataMap[t.category] !== undefined) {
            dataMap[t.category] += t.amount;
            total += t.amount;
        }
    });

    const colors = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];
    let startAngle = 0;
    els.chartLegend.innerHTML = '';

    CATEGORIES.expense.forEach((cat, index) => {
        const val = dataMap[cat.id];
        if (val > 0) {
            const sliceAngle = (2 * Math.PI * val) / total;
            const color = colors[index % colors.length];

            // Draw Slice
            ctx.beginPath();
            ctx.moveTo(100, 100);
            ctx.arc(100, 100, 80, startAngle, startAngle + sliceAngle);
            ctx.fillStyle = color;
            ctx.fill();

            startAngle += sliceAngle;

            // Add to legend
            const pct = Math.round((val/total)*100);
            els.chartLegend.innerHTML += `<div style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${cat.name} (${pct}%)</div>`;
        }
    });

    // Cutout Center (Donut)
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, 2 * Math.PI);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-card'); // Match card bg
    ctx.fill();
}

// --- 5. NAVIGATION & INTERACTION ---

function switchTab(viewId, navEl) {
    // Hide all views
    els.views.forEach(v => el('view-' + v).classList.add('hidden'));
    // Show target view
    el('view-' + viewId).classList.remove('hidden');
    
    // Update Nav State
    if (navEl) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        navEl.classList.add('active');
    } else if (viewId === 'add') {
        // Floating button handling
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    }

    // Special triggers
    if (viewId === 'home') updateUI();
    if (viewId === 'add') {
        els.inputAmount.focus();
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(state.theme);
    saveData();
    showToast(state.theme === 'dark' ? 'Mode Gelap Aktif' : 'Mode Terang Aktif');
}

function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    els.themeToggle.checked = themeName === 'dark';
    // Redraw chart because background color might change for the donut cutout
    if(state.transactions.length > 0) drawChart();
}

function showToast(msg) {
    els.toastMsg.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 3000);
}

// --- 6. EVENT LISTENERS ---

els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(els.inputAmount.value);
    if (!amount || amount <= 0) return showToast('Masukkan nominal yang valid');

    const newTrans = {
        id: Date.now(),
        type: state.currentType,
        amount: amount,
        category: els.inputCat.value,
        date: els.inputDate.value,
        desc: els.inputDesc.value || (state.currentType === 'income' ? 'Pemasukan' : 'Pengeluaran')
    };

    state.transactions.unshift(newTrans); // Add to top
    saveData();
    
    // Reset Form partly
    els.inputAmount.value = '';
    els.inputDesc.value = '';
    showToast('Transaksi Berhasil ✨');
    
    // Switch to history or stay? Let's stay to add multiple
});

els.themeToggle.addEventListener('change', toggleTheme);

function updateGoal() {
    const val = parseInt(els.goalInput.value);
    if (val > 0) {
        state.goal = val;
        saveData();
        showToast('Target diperbarui!');
    } else {
        showToast('Target tidak valid');
    }
}

function resetAllData() {
    if(confirm('PERINGATAN: Semua data akan dihapus permanen. Lanjutkan?')) {
        localStorage.clear();
        state.transactions = [];
        state.goal = 0;
        location.reload();
    }
}

function exportCSV() {
    if (state.transactions.length === 0) return showToast("Tidak ada data untuk diekspor");
    
    const header = ["Tanggal", "Tipe", "Kategori", "Jumlah", "Catatan"];
    const rows = state.transactions.map(t => [
        t.date, t.type, t.category, t.amount, `"${t.desc}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + header.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_keuangan_casstrack.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 7. RUN ---
init();
