// Salqin Ichimliklar — umumiy ma'lumotlar bazasi (localStorage)
// Foydalanuvchi va admin paneli orasida bir xil ma'lumotlardan foydalanadi.

const DB = (() => {
  const KEYS = {
    products: 'si_products',
    orders: 'si_orders',
    users: 'si_users',
    cart: 'si_cart',
    session: 'si_session',
    adminSession: 'si_admin_session',
    settings: 'si_settings',
  };

  const ADMIN = { login: 'admin', password: 'admin123' };

  const read = (k, fallback) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // ----- Seed boshlang'ich ma'lumotlar -----
  function seed() {
    if (!localStorage.getItem(KEYS.products)) {
      const demo = [
        { name: 'Coca-Cola 1L',     category: 'Gazli',     price: 14000, discount: 10, stock: 50, img: svgDrink('#E11D48', 'Cola') },
        { name: 'Pepsi 1L',         category: 'Gazli',     price: 13500, discount: 0,  stock: 40, img: svgDrink('#1D4ED8', 'Pepsi') },
        { name: 'Fanta 1L',         category: 'Gazli',     price: 13000, discount: 5,  stock: 35, img: svgDrink('#F97316', 'Fanta') },
        { name: 'Sprite 1L',        category: 'Gazli',     price: 13000, discount: 0,  stock: 30, img: svgDrink('#22C55E', 'Sprite') },
        { name: 'Apelsin sharbati', category: 'Sharbat',   price: 18000, discount: 15, stock: 25, img: svgDrink('#FB923C', 'Juice') },
        { name: 'Olma sharbati',    category: 'Sharbat',   price: 17000, discount: 0,  stock: 22, img: svgDrink('#84CC16', 'Apple') },
        { name: 'Hayot suvi 1.5L',  category: 'Suv',       price: 5000,  discount: 0,  stock: 100,img: svgDrink('#0EA5E9', 'Water') },
        { name: 'Nestea limon',     category: 'Choy',      price: 12000, discount: 0,  stock: 28, img: svgDrink('#EAB308', 'Tea') },
        { name: 'Red Bull',         category: 'Energetik', price: 25000, discount: 0,  stock: 18, img: svgDrink('#0F172A', 'Energy') },
        { name: 'Adrenaline Rush',  category: 'Energetik', price: 22000, discount: 10, stock: 20, img: svgDrink('#7C3AED', 'Energy') },
      ].map(p => ({ id: uid(), createdAt: Date.now(), ...p }));
      write(KEYS.products, demo);
    }
    if (!localStorage.getItem(KEYS.orders))   write(KEYS.orders, []);
    if (!localStorage.getItem(KEYS.users))    write(KEYS.users, []);
    if (!localStorage.getItem(KEYS.settings)) write(KEYS.settings, { shopName: 'Salqin', currency: "so'm" });
  }

  // Placeholder rasm (SVG) — bazaga rasm yuklanmagan mahsulotlar uchun
  function svgDrink(color, label) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='${color}' stop-opacity='0.9'/>
        <stop offset='1' stop-color='${color}' stop-opacity='0.5'/>
      </linearGradient></defs>
      <rect width='200' height='200' fill='#e0f2fe'/>
      <path d='M70 40 h60 l-8 130 a12 12 0 0 1 -12 12 h-20 a12 12 0 0 1 -12 -12 z' fill='url(#g)' stroke='#0f172a' stroke-width='3'/>
      <rect x='70' y='40' width='60' height='12' fill='#0f172a'/>
      <text x='100' y='115' text-anchor='middle' fill='#fff' font-family='Arial' font-weight='bold' font-size='18'>${label}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ----- Mahsulotlar -----
  const products = {
    all: () => read(KEYS.products, []),
    get: (id) => products.all().find(p => p.id === id),
    add: (p) => {
      const list = products.all();
      const item = { id: uid(), createdAt: Date.now(), ...p };
      list.unshift(item);
      write(KEYS.products, list);
      return item;
    },
    update: (id, patch) => {
      const list = products.all().map(p => p.id === id ? { ...p, ...patch } : p);
      write(KEYS.products, list);
    },
    remove: (id) => write(KEYS.products, products.all().filter(p => p.id !== id)),
    categories: () => {
      const set = new Set(products.all().map(p => p.category));
      return ['Barchasi', ...Array.from(set)];
    },
    finalPrice: (p) => Math.round(p.price * (1 - (p.discount || 0) / 100)),
  };

  // ----- Foydalanuvchilar -----
  const users = {
    all: () => read(KEYS.users, []),
    get: (id) => users.all().find(u => u.id === id),
    findByPhone: (phone) => users.all().find(u => u.phone === phone),
    register: ({ name, phone, password, address = '' }) => {
      if (users.findByPhone(phone)) throw new Error('Bu telefon raqami avval ro\'yxatdan o\'tgan');
      const list = users.all();
      const u = { id: uid(), name, phone, password, address, createdAt: Date.now() };
      list.push(u);
      write(KEYS.users, list);
      return u;
    },
    login: (phone, password) => {
      const u = users.findByPhone(phone);
      if (!u || u.password !== password) throw new Error('Telefon yoki parol noto\'g\'ri');
      write(KEYS.session, { userId: u.id, at: Date.now() });
      return u;
    },
    logout: () => localStorage.removeItem(KEYS.session),
    current: () => {
      const s = read(KEYS.session, null);
      return s ? users.get(s.userId) : null;
    },
    update: (id, patch) => {
      const list = users.all().map(u => u.id === id ? { ...u, ...patch } : u);
      write(KEYS.users, list);
    },
    remove: (id) => write(KEYS.users, users.all().filter(u => u.id !== id)),
  };

  // ----- Savat (joriy foydalanuvchi yoki mehmon uchun) -----
  const cart = {
    all: () => read(KEYS.cart, []),
    count: () => cart.all().reduce((s, i) => s + i.qty, 0),
    total: () => cart.all().reduce((s, i) => s + i.qty * products.finalPrice(products.get(i.productId) || { price: 0 }), 0),
    add: (productId, qty = 1) => {
      const list = cart.all();
      const ex = list.find(i => i.productId === productId);
      if (ex) ex.qty += qty;
      else list.push({ productId, qty });
      write(KEYS.cart, list);
    },
    setQty: (productId, qty) => {
      let list = cart.all().map(i => i.productId === productId ? { ...i, qty } : i);
      list = list.filter(i => i.qty > 0);
      write(KEYS.cart, list);
    },
    remove: (productId) => write(KEYS.cart, cart.all().filter(i => i.productId !== productId)),
    clear: () => write(KEYS.cart, []),
  };

  // ----- Buyurtmalar -----
  const orders = {
    all: () => read(KEYS.orders, []),
    byUser: (userId) => orders.all().filter(o => o.userId === userId),
    place: ({ userId, name, phone, address, note, payment }) => {
      const items = cart.all().map(i => {
        const p = products.get(i.productId);
        return {
          productId: p.id,
          name: p.name,
          qty: i.qty,
          price: p.price,
          discount: p.discount || 0,
          finalPrice: products.finalPrice(p),
        };
      });
      if (!items.length) throw new Error('Savat bo\'sh');
      const total = items.reduce((s, i) => s + i.qty * i.finalPrice, 0);
      const order = {
        id: uid(),
        userId, name, phone, address, note, payment,
        items, total,
        status: 'yangi', // yangi -> tayyorlanmoqda -> yetkazilmoqda -> bajarildi / bekor
        createdAt: Date.now(),
      };
      const list = orders.all();
      list.unshift(order);
      write(KEYS.orders, list);

      // Stockdan ayirish
      items.forEach(i => {
        const p = products.get(i.productId);
        if (p) products.update(p.id, { stock: Math.max(0, (p.stock || 0) - i.qty) });
      });

      cart.clear();
      return order;
    },
    update: (id, patch) => {
      const list = orders.all().map(o => o.id === id ? { ...o, ...patch } : o);
      write(KEYS.orders, list);
    },
    remove: (id) => write(KEYS.orders, orders.all().filter(o => o.id !== id)),
  };

  // ----- Admin -----
  const admin = {
    login: (l, p) => {
      if (l === ADMIN.login && p === ADMIN.password) {
        write(KEYS.adminSession, { at: Date.now() });
        return true;
      }
      throw new Error('Admin login yoki parol noto\'g\'ri');
    },
    logout: () => localStorage.removeItem(KEYS.adminSession),
    isAuthed: () => !!read(KEYS.adminSession, null),
  };

  // ----- Statistika -----
  const stats = {
    revenueIn: (from, to) => orders.all()
      .filter(o => o.status !== 'bekor' && o.createdAt >= from && o.createdAt <= to)
      .reduce((s, o) => s + o.total, 0),
    countIn: (from, to) => orders.all()
      .filter(o => o.createdAt >= from && o.createdAt <= to).length,
    today() {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      return this.revenueIn(d.getTime(), Date.now());
    },
    week() {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 6);
      return this.revenueIn(d.getTime(), Date.now());
    },
    month() {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(1);
      return this.revenueIn(d.getTime(), Date.now());
    },
    last7Days() {
      const arr = [];
      const today = new Date(); today.setHours(0,0,0,0);
      for (let i = 6; i >= 0; i--) {
        const day = new Date(today); day.setDate(today.getDate() - i);
        const next = new Date(day); next.setDate(day.getDate() + 1);
        arr.push({
          label: day.toLocaleDateString('uz-UZ', { weekday: 'short', day: '2-digit' }),
          revenue: this.revenueIn(day.getTime(), next.getTime() - 1),
          count: this.countIn(day.getTime(), next.getTime() - 1),
        });
      }
      return arr;
    },
    topProducts(limit = 5) {
      const tally = {};
      orders.all().forEach(o => {
        if (o.status === 'bekor') return;
        o.items.forEach(i => {
          if (!tally[i.productId]) tally[i.productId] = { name: i.name, qty: 0, revenue: 0 };
          tally[i.productId].qty += i.qty;
          tally[i.productId].revenue += i.qty * i.finalPrice;
        });
      });
      return Object.values(tally).sort((a, b) => b.qty - a.qty).slice(0, limit);
    },
  };

  // ----- Formatlash yordamchilari -----
  const fmt = {
    money: (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm",
    date: (ts) => new Date(ts).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }),
    dateOnly: (ts) => new Date(ts).toLocaleDateString('uz-UZ'),
  };

  seed();
  return { products, users, cart, orders, admin, stats, fmt, svgDrink };
})();
