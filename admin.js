// Salqin — Admin paneli logikasi
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- TOAST ----------
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (msg, type = '') => {
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  // ---------- AUTH ----------
  const loginScreen = $('#loginScreen');
  const app = $('#app');

  function showApp() {
    loginScreen.classList.add('hidden');
    app.classList.remove('hidden');
    renderAll();
  }
  function showLogin() {
    app.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  }

  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      DB.admin.login(f.login.value.trim(), f.password.value);
      showApp();
      toast('Xush kelibsiz, Admin!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#logoutBtn').addEventListener('click', () => {
    if (confirm('Paneldan chiqasizmi?')) {
      DB.admin.logout();
      showLogin();
    }
  });

  // ---------- NAVIGATION ----------
  const pageMeta = {
    dashboard: { title: 'Dashboard',     sub: 'Umumiy ko\'rsatkichlar va statistika' },
    products:  { title: 'Mahsulotlar',   sub: 'Mahsulotlarni qo\'shish, tahrirlash va boshqarish' },
    orders:    { title: 'Buyurtmalar',   sub: 'Barcha buyurtmalarni kuzating va holatini yangilang' },
    users:     { title: 'Foydalanuvchilar', sub: 'Ro\'yxatdan o\'tgan mijozlar' },
    finance:   { title: 'Moliya',        sub: 'Kunlik, haftalik va oylik tushum' },
  };
  function go(page) {
    $$('.menu-item').forEach(m => m.classList.toggle('active', m.dataset.page === page));
    $$('.page').forEach(p => p.classList.add('hidden'));
    $('#page-' + page).classList.remove('hidden');
    const meta = pageMeta[page];
    $('#pageTitle').textContent = meta.title;
    $('#pageSub').textContent = meta.sub;
    if (page === 'dashboard') renderDashboard();
    if (page === 'products')  renderProducts();
    if (page === 'orders')    renderOrders();
    if (page === 'users')     renderUsers();
    if (page === 'finance')   renderFinance();
  }
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page]');
    if (link) { e.preventDefault(); go(link.dataset.page); }
  });

  // ====================================================================
  //                          DASHBOARD
  // ====================================================================
  function renderDashboard() {
    $('#statToday').textContent      = DB.fmt.money(DB.stats.today());
    $('#statWeek').textContent       = DB.fmt.money(DB.stats.week());
    $('#statMonth').textContent      = DB.fmt.money(DB.stats.month());
    $('#statProducts').textContent   = DB.products.all().length;
    $('#statUsers').textContent      = DB.users.all().length;

    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = DB.stats.countIn(today.getTime(), Date.now());
    $('#statTodayCount').textContent = todayCount;

    // New orders badge
    const newCount = DB.orders.all().filter(o => o.status === 'yangi').length;
    const badge = $('#newOrdersBadge');
    badge.textContent = newCount;
    badge.classList.toggle('hidden', newCount === 0);

    drawBarChart('chartRevenue', DB.stats.last7Days().map(d => ({ label: d.label, value: d.revenue })));

    const top = DB.stats.topProducts(5);
    $('#topProducts').innerHTML = top.length
      ? top.map((p, i) => `
          <div class="top-row">
            <span class="rank">${i + 1}</span>
            <div><div class="name">${p.name}</div><div class="meta">${p.qty} dona sotilgan</div></div>
            <span class="rev">${DB.fmt.money(p.revenue)}</span>
          </div>`).join('')
      : `<div class="empty-row" style="padding:20px 0">Hali sotuv yo'q</div>`;

    const recent = DB.orders.all().slice(0, 5);
    $('#recentOrders').innerHTML = recent.length ? `
      <table class="table">
        <thead><tr><th>#</th><th>Mijoz</th><th>Summa</th><th>Sana</th><th>Holat</th></tr></thead>
        <tbody>${recent.map(o => `
          <tr>
            <td><b>#${o.id.slice(-5).toUpperCase()}</b></td>
            <td>${o.name}</td>
            <td>${DB.fmt.money(o.total)}</td>
            <td>${DB.fmt.date(o.createdAt)}</td>
            <td><span class="status ${o.status}">${o.status}</span></td>
          </tr>`).join('')}</tbody>
      </table>`
      : `<div class="empty-row">Hali buyurtmalar yo'q</div>`;
  }

  // ====================================================================
  //                          PRODUCTS
  // ====================================================================
  let productSearch = '';
  $('#productSearch').addEventListener('input', e => {
    productSearch = e.target.value.trim().toLowerCase();
    renderProducts();
  });

  function renderProducts() {
    const tbody = $('#productsTable');
    let list = DB.products.all();
    if (productSearch) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(productSearch) ||
        p.category.toLowerCase().includes(productSearch));
    }
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Mahsulotlar topilmadi</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(p => `
      <tr>
        <td><img class="cell-img" src="${p.img}" alt="" /></td>
        <td><b>${p.name}</b></td>
        <td>${p.category}</td>
        <td>${DB.fmt.money(p.price)}</td>
        <td>${p.discount ? p.discount + '%' : '—'}</td>
        <td><b style="color:var(--primary)">${DB.fmt.money(DB.products.finalPrice(p))}</b></td>
        <td>${p.stock <= 5 ? `<span style="color:var(--danger);font-weight:700">${p.stock}</span>` : p.stock}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Tahrirlash</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">O'chirish</button>
        </td>
      </tr>`).join('');
  }

  $('#productsTable').addEventListener('click', (e) => {
    const ed = e.target.dataset.edit;
    const dl = e.target.dataset.del;
    if (ed) openProductModal(DB.products.get(ed));
    if (dl) {
      const p = DB.products.get(dl);
      if (confirm(`"${p.name}" mahsulotini o'chirilsinmi?`)) {
        DB.products.remove(dl);
        renderProducts();
        toast('O\'chirildi', 'success');
      }
    }
  });

  // Product modal
  const productModal = $('#productModal');
  const productForm = $('#productForm');
  let pendingImg = '';

  $('#addProductBtn').addEventListener('click', () => openProductModal(null));
  $$('[data-close="product"]').forEach(b => b.addEventListener('click', () => productModal.classList.remove('open')));

  function openProductModal(p) {
    productForm.reset();
    pendingImg = '';
    $('#productImgPreview').removeAttribute('src');
    if (p) {
      $('#productModalTitle').textContent = 'Mahsulotni tahrirlash';
      productForm.id.value = p.id;
      productForm.name.value = p.name;
      productForm.category.value = p.category;
      productForm.price.value = p.price;
      productForm.discount.value = p.discount || 0;
      productForm.stock.value = p.stock || 0;
      pendingImg = p.img;
      $('#productImgPreview').src = p.img;
    } else {
      $('#productModalTitle').textContent = 'Yangi mahsulot';
      productForm.id.value = '';
    }
    productModal.classList.add('open');
  }

  $('#productImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Rasm 2MB dan kichik bo\'lsin', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      pendingImg = reader.result;
      $('#productImgPreview').src = pendingImg;
    };
    reader.readAsDataURL(file);
  });

  productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      name: f.name.value.trim(),
      category: f.category.value.trim(),
      price: parseInt(f.price.value, 10) || 0,
      discount: parseInt(f.discount.value, 10) || 0,
      stock: parseInt(f.stock.value, 10) || 0,
      img: pendingImg || DB.svgDrink('#0EA5E9', f.name.value.slice(0, 6) || 'Drink'),
    };
    if (f.id.value) {
      DB.products.update(f.id.value, data);
      toast('Yangilandi', 'success');
    } else {
      DB.products.add(data);
      toast('Yangi mahsulot qo\'shildi', 'success');
    }
    productModal.classList.remove('open');
    renderProducts();
  });

  // ====================================================================
  //                          ORDERS
  // ====================================================================
  let orderFilter = 'all';
  $('#orderFilters').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    $$('#orderFilters .chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    orderFilter = c.dataset.status;
    renderOrders();
  });

  function renderOrders() {
    const tbody = $('#ordersTable');
    let list = DB.orders.all();
    if (orderFilter !== 'all') list = list.filter(o => o.status === orderFilter);

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Buyurtmalar topilmadi</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(o => `
      <tr>
        <td><b>#${o.id.slice(-5).toUpperCase()}</b></td>
        <td>${o.name}</td>
        <td>${o.phone}</td>
        <td>${o.items.length} ta · ${o.items.reduce((s,i)=>s+i.qty,0)} dona</td>
        <td><b>${DB.fmt.money(o.total)}</b></td>
        <td>${DB.fmt.date(o.createdAt)}</td>
        <td><span class="status ${o.status}">${o.status}</span></td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" data-view="${o.id}">Ko'rish</button>
        </td>
      </tr>`).join('');
  }

  $('#ordersTable').addEventListener('click', (e) => {
    const id = e.target.dataset.view;
    if (id) openOrderModal(DB.orders.all().find(o => o.id === id));
  });

  const orderModal = $('#orderModal');
  $$('[data-close="order"]').forEach(b => b.addEventListener('click', () => orderModal.classList.remove('open')));

  const STATUSES = ['yangi', 'tayyorlanmoqda', 'yetkazilmoqda', 'bajarildi', 'bekor'];

  function openOrderModal(o) {
    if (!o) return;
    $('#orderDetails').innerHTML = `
      <div class="order-detail">
        <div class="head">
          <div><b>ID</b>#${o.id.slice(-5).toUpperCase()}</div>
          <div><b>Sana</b>${DB.fmt.date(o.createdAt)}</div>
          <div><b>Mijoz</b>${o.name}</div>
          <div><b>Telefon</b>${o.phone}</div>
          <div><b>Manzil</b>${o.address || '—'}</div>
          <div><b>To'lov</b>${o.payment}</div>
          ${o.note ? `<div style="grid-column:1/-1"><b>Izoh</b>${o.note}</div>` : ''}
        </div>
        <div class="items">
          ${o.items.map(i => `
            <div class="item">
              <span>${i.name} <span class="muted">× ${i.qty}</span></span>
              <b>${DB.fmt.money(i.qty * i.finalPrice)}</b>
            </div>`).join('')}
        </div>
        <div class="total">Jami: ${DB.fmt.money(o.total)}</div>
        <div style="margin-top:14px"><b>Holat:</b> <span class="status ${o.status}">${o.status}</span></div>
        <div class="status-actions">
          ${STATUSES.map(s => s === o.status
            ? ''
            : `<button class="btn ${s === 'bekor' ? 'btn-danger' : 'btn-ghost'} btn-sm" data-set-status="${s}" data-order="${o.id}">→ ${s}</button>`
          ).join('')}
        </div>
      </div>`;
    orderModal.classList.add('open');
  }

  $('#orderDetails').addEventListener('click', (e) => {
    const st = e.target.dataset.setStatus;
    const id = e.target.dataset.order;
    if (st && id) {
      DB.orders.update(id, { status: st });
      orderModal.classList.remove('open');
      renderOrders();
      renderDashboard();
      toast('Holat yangilandi: ' + st, 'success');
    }
  });

  // ====================================================================
  //                          USERS
  // ====================================================================
  function renderUsers() {
    const tbody = $('#usersTable');
    const list = DB.users.all();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Hali foydalanuvchilar yo'q</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(u => {
      const userOrders = DB.orders.byUser(u.id).filter(o => o.status !== 'bekor');
      const spent = userOrders.reduce((s, o) => s + o.total, 0);
      return `
        <tr>
          <td><b>${u.name}</b></td>
          <td>${u.phone}</td>
          <td>${u.address || '—'}</td>
          <td>${userOrders.length}</td>
          <td><b style="color:var(--primary)">${DB.fmt.money(spent)}</b></td>
          <td>${DB.fmt.dateOnly(u.createdAt)}</td>
          <td class="actions">
            <button class="btn btn-danger btn-sm" data-del-user="${u.id}">O'chirish</button>
          </td>
        </tr>`;
    }).join('');
  }

  $('#usersTable').addEventListener('click', (e) => {
    const id = e.target.dataset.delUser;
    if (id && confirm('Foydalanuvchi o\'chirilsinmi?')) {
      DB.users.remove(id);
      renderUsers();
      toast('O\'chirildi', 'success');
    }
  });

  // ====================================================================
  //                          FINANCE
  // ====================================================================
  function renderFinance() {
    $('#fToday').textContent = DB.fmt.money(DB.stats.today());
    $('#fWeek').textContent  = DB.fmt.money(DB.stats.week());
    $('#fMonth').textContent = DB.fmt.money(DB.stats.month());
    const all = DB.orders.all()
      .filter(o => o.status !== 'bekor')
      .reduce((s, o) => s + o.total, 0);
    $('#fTotal').textContent = DB.fmt.money(all);

    const week = DB.stats.last7Days();
    drawBarChart('fChartRevenue', week.map(d => ({ label: d.label, value: d.revenue })));
    drawBarChart('fChartCount',   week.map(d => ({ label: d.label, value: d.count })), { intFormat: true });
  }

  // ====================================================================
  //                  CANVAS BAR CHART (sof JS)
  // ====================================================================
  function drawBarChart(canvasId, data, opts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || canvas.parentElement.clientWidth;
    const H = canvas.height = 240;
    canvas.width = W * dpr; canvas.style.width = W + 'px';
    canvas.height = H * dpr; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 16, padT = 16, padB = 32;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const max = Math.max(1, ...data.map(d => d.value));
    const niceMax = niceCeil(max);

    // grid
    ctx.strokeStyle = 'rgba(148,163,184,.15)';
    ctx.lineWidth = 1;
    ctx.font = '11px Manrope, system-ui';
    ctx.fillStyle = '#94a3b8';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padT + (chartH * i) / steps;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const val = niceMax * (1 - i / steps);
      const label = opts.intFormat ? String(Math.round(val)) : shortMoney(val);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(label, padL - 8, y);
    }

    // bars
    const slot = chartW / data.length;
    const barW = Math.min(38, slot * 0.55);
    data.forEach((d, i) => {
      const x = padL + slot * i + (slot - barW) / 2;
      const h = (d.value / niceMax) * chartH;
      const y = padT + chartH - h;

      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(1, '#0ea5e9');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, h, 6); ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(d.label, x + barW / 2, padT + chartH + 8);

      if (d.value > 0) {
        ctx.fillStyle = '#e2e8f0';
        ctx.textBaseline = 'bottom';
        ctx.font = 'bold 11px Manrope, system-ui';
        const txt = opts.intFormat ? String(d.value) : shortMoney(d.value);
        ctx.fillText(txt, x + barW / 2, y - 4);
        ctx.font = '11px Manrope, system-ui';
      }
    });
  }
  function shortMoney(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return String(Math.round(n));
  }
  function niceCeil(n) {
    if (n <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(n)));
    const f = n / exp;
    let nice;
    if      (f <= 1) nice = 1;
    else if (f <= 2) nice = 2;
    else if (f <= 5) nice = 5;
    else nice = 10;
    return nice * exp;
  }
  function roundRect(ctx, x, y, w, h, r) {
    if (h < 1) h = 1;
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  window.addEventListener('resize', () => {
    if (!app.classList.contains('hidden')) {
      const visible = $$('.page').find(p => !p.classList.contains('hidden'));
      if (visible?.id === 'page-dashboard') renderDashboard();
      if (visible?.id === 'page-finance')   renderFinance();
    }
  });

  // ---------- INIT ----------
  function renderAll() {
    renderDashboard();
  }

  if (DB.admin.isAuthed()) showApp(); else showLogin();
})();
