import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import {
  DB, User, Role, Provider, Product, Order, OrderStatus, Appointment, Invoice, Message,
  Settings, CartLine, AccountStatus, ProviderType, OrderItem,
} from './types';
import { buildSeed } from './seed';
import { hash, normPhone } from './format';

const DB_KEY = 'abis_db_v3';
const SESSION_KEY = 'abis_session_v3';
const CART_KEY = 'abis_cart_v3';

// Session token is kept in the OS secure keystore (Keychain/Keystore); falls back to app storage on web
const secure = {
  async get(k: string) {
    try {
      const v = await SecureStore.getItemAsync(k);
      if (v !== null && v !== undefined) return v;
    } catch {}
    return AsyncStorage.getItem(k);
  },
  async set(k: string, v: string) {
    try {
      await SecureStore.setItemAsync(k, v);
      return;
    } catch {}
    await AsyncStorage.setItem(k, v).catch(() => {});
  },
  async del(k: string) {
    try {
      await SecureStore.deleteItemAsync(k);
    } catch {}
    await AsyncStorage.removeItem(k).catch(() => {});
  },
};

export interface State {
  db: DB;
  userId: string | null;
  cart: CartLine[];
  ready: boolean;
}

let state: State = { db: buildSeed(), userId: null, cart: [], ready: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setState = (p: Partial<State>) => {
  state = { ...state, ...p };
  emit();
};

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const getState = () => state;
export const useStore = () => useSyncExternalStore(subscribe, getState, getState);

export const useMe = (): User | null => {
  const s = useStore();
  return s.userId ? s.db.users.find((u) => u.id === s.userId) || null : null;
};

let writeTimer: any = null;
const persist = () => {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    AsyncStorage.setItem(DB_KEY, JSON.stringify(state.db)).catch(() => {});
  }, 60);
};

function mutate(fn: (db: DB) => void) {
  const db: DB = { ...state.db, rev: state.db.rev + 1 };
  fn(db);
  setState({ db });
  persist();
}

const uid = (db: DB, p: string) => `${p}${++db.seq}`;

export async function initStore() {
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    let db: DB;
    if (raw) {
      db = JSON.parse(raw);
    } else {
      db = buildSeed();
      await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
    }
    const sid = await secure.get(SESSION_KEY);
    const cartRaw = await AsyncStorage.getItem(CART_KEY);
    const user = sid && db.users.find((u) => u.id === sid);
    setState({ db, userId: user ? sid : null, cart: cartRaw ? JSON.parse(cartRaw) : [], ready: true });
  } catch {
    setState({ ready: true });
  }
  // Live sync: pick up changes written by another session/tab
  setInterval(async () => {
    try {
      const raw = await AsyncStorage.getItem(DB_KEY);
      if (!raw) return;
      const parsed: DB = JSON.parse(raw);
      if (parsed.rev > state.db.rev) setState({ db: parsed });
    } catch {}
  }, 2000);
}

/* ---------- session ---------- */
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

const attempts: Record<string, { n: number; until: number }> = {};
export async function login(phone: string, pass: string): Promise<Result<{ user: User }>> {
  const ph = normPhone(phone);
  const at = attempts[ph] || { n: 0, until: 0 };
  if (at.until > Date.now()) return { ok: false, error: `محاولات كثيرة خاطئة. حاول بعد ${Math.ceil((at.until - Date.now()) / 1000)} ثانية` };
  const user = state.db.users.find((u) => u.phone === ph);
  if (!user || user.pass !== hash(pass + ph)) {
    at.n += 1;
    if (at.n >= 5) {
      at.n = 0;
      at.until = Date.now() + 60000;
    }
    attempts[ph] = at;
    return { ok: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
  }
  delete attempts[ph];
  if (user.status === 'suspended') return { ok: false, error: 'هذا الحساب موقوف. تواصل مع الدعم الفني' };
  setState({ userId: user.id });
  secure.set(SESSION_KEY, user.id);
  return { ok: true, user };
}

export function logout() {
  setState({ userId: null });
  secure.del(SESSION_KEY);
}

export interface RegisterInput {
  name: string;
  phone: string;
  pass: string;
  role: Exclude<Role, 'admin'>;
  address: string;
  vehicle?: string;
  provider?: { type: ProviderType; name: string; desc: string; specialty?: string; deliveryFee: number };
}

export async function register(inp: RegisterInput): Promise<Result<{ user: User }>> {
  const phone = normPhone(inp.phone);
  if (inp.name.trim().length < 3) return { ok: false, error: 'اكتب الاسم بالكامل' };
  if (!/^01[0-9]{9}$/.test(phone)) return { ok: false, error: 'رقم الهاتف غير صحيح (مثال: 01012345678)' };
  if (inp.pass.length < 6) return { ok: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف' };
  if (state.db.users.some((u) => u.phone === phone)) return { ok: false, error: 'رقم الهاتف مسجل بالفعل' };
  if (inp.role === 'provider' && (!inp.provider || inp.provider.name.trim().length < 2))
    return { ok: false, error: 'اكتب اسم النشاط التجاري' };
  let created!: User;
  mutate((db) => {
    const needsReview = inp.role !== 'customer';
    created = {
      id: uid(db, 'u'),
      name: inp.name.trim(),
      phone,
      pass: hash(inp.pass + phone),
      role: inp.role,
      address: inp.address.trim(),
      status: needsReview ? 'pending' : 'active',
      createdAt: Date.now(),
      ...(inp.role === 'courier' ? { vehicle: inp.vehicle || 'موتوسيكل', available: false } : {}),
    };
    db.users = [...db.users, created];
    if (inp.role === 'provider' && inp.provider) {
      const t = inp.provider;
      const p: Provider = {
        id: uid(db, 'p'),
        ownerId: created.id,
        type: t.type,
        name: t.name.trim(),
        desc: t.desc.trim(),
        address: inp.address.trim(),
        phone,
        emoji: t.type === 'restaurant' ? '🍽️' : t.type === 'supermarket' ? '🛒' : t.type === 'pharmacy' ? '💊' : '🩺',
        rating: 0,
        eta: t.type === 'clinic' ? '' : '30-45',
        deliveryFee: t.type === 'clinic' ? 0 : t.deliveryFee,
        status: 'pending',
        open: false,
        specialty: t.specialty,
        createdAt: Date.now(),
      };
      db.providers = [...db.providers, p];
    }
  });
  setState({ userId: created.id });
  secure.set(SESSION_KEY, created.id);
  return { ok: true, user: created };
}

export function updateUser(id: string, patch: Partial<User>) {
  mutate((db) => {
    db.users = db.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    if (patch.name || patch.phone) {
      // keep provider contact info consistent
    }
  });
}

export function changePassword(id: string, oldP: string, newP: string): Result {
  const u = state.db.users.find((x) => x.id === id);
  if (!u || u.pass !== hash(oldP + u.phone)) return { ok: false, error: 'كلمة المرور الحالية غير صحيحة' };
  if (newP.length < 6) return { ok: false, error: 'كلمة المرور الجديدة قصيرة' };
  updateUser(id, { pass: hash(newP + u.phone) });
  return { ok: true };
}

/* ---------- cart ---------- */
const saveCart = (cart: CartLine[]) => {
  setState({ cart });
  AsyncStorage.setItem(CART_KEY, JSON.stringify(cart)).catch(() => {});
};
export function cartAdd(productId: string, delta: number) {
  const cur = state.cart.find((l) => l.productId === productId);
  let next: CartLine[];
  if (!cur) next = delta > 0 ? [...state.cart, { productId, qty: delta }] : state.cart;
  else {
    const q = cur.qty + delta;
    next = q <= 0 ? state.cart.filter((l) => l.productId !== productId) : state.cart.map((l) => (l.productId === productId ? { ...l, qty: q } : l));
  }
  saveCart(next);
}
export const cartClear = () => saveCart([]);

/* ---------- helpers ---------- */
export const availableCouriers = (db: DB) =>
  db.users.filter((u) => u.role === 'courier' && u.status === 'active' && u.available);

const ACTIVE: OrderStatus[] = ['accepted', 'ready', 'on_the_way'];

function sysMsg(db: DB, orderId: string, text: string) {
  const m: Message = { id: uid(db, 'm'), orderId, senderId: 'system', senderName: 'النظام', senderRole: 'system', text, createdAt: Date.now() };
  db.messages = [...db.messages, m];
}

function tryAutoAssign(db: DB, orderId: string) {
  if (!db.settings.autoAssign) return;
  const o = db.orders.find((x) => x.id === orderId);
  if (!o || o.courierId) return;
  const cands = availableCouriers(db)
    .map((c) => ({ c, load: db.orders.filter((x) => x.courierId === c.id && ACTIVE.includes(x.status)).length }))
    .sort((a, b) => a.load - b.load);
  if (!cands.length) return;
  const c = cands[0].c;
  db.orders = db.orders.map((x) => (x.id === orderId ? { ...x, courierId: c.id, courierName: c.name } : x));
  sysMsg(db, orderId, `تم تعيين المندوب ${c.name} تلقائياً لتوصيل طلبك 🛵`);
}

const setStatus = (db: DB, id: string, status: OrderStatus, extra: Partial<Order> = {}) => {
  db.orders = db.orders.map((o) =>
    o.id === id ? { ...o, ...extra, status, updatedAt: Date.now(), history: [...o.history, { status, at: Date.now() }] } : o
  );
};

/* ---------- ordering ---------- */
export function cartDetails(db: DB, cart: CartLine[]) {
  const groups: Record<string, { provider: Provider; items: OrderItem[]; subtotal: number }> = {};
  cart.forEach((l) => {
    const p = db.products.find((x) => x.id === l.productId);
    if (!p) return;
    const prov = db.providers.find((x) => x.id === p.providerId);
    if (!prov) return;
    if (!groups[prov.id]) groups[prov.id] = { provider: prov, items: [], subtotal: 0 };
    groups[prov.id].items.push({ productId: p.id, name: p.name, price: p.price, qty: l.qty, emoji: p.emoji });
    groups[prov.id].subtotal += p.price * l.qty;
  });
  const list = Object.values(groups);
  const delivery = list.reduce((s, g) => s + g.provider.deliveryFee, 0);
  const subtotal = list.reduce((s, g) => s + g.subtotal, 0);
  return { groups: list, delivery, subtotal, total: subtotal + delivery };
}

export function placeOrder(me: User, info: { name: string; phone: string; address: string; notes: string }): Result<{ invoiceId: string }> {
  if (!state.db.settings.appEnabled) return { ok: false, error: 'التطبيق متوقف حالياً' };
  const det = cartDetails(state.db, state.cart);
  if (!det.groups.length) return { ok: false, error: 'السلة فارغة' };
  if (info.address.trim().length < 6) return { ok: false, error: 'اكتب العنوان بالتفصيل' };
  if (!/^01[0-9]{9}$/.test(normPhone(info.phone))) return { ok: false, error: 'رقم الهاتف غير صحيح' };
  const closed = det.groups.find((g) => !g.provider.open || g.provider.status !== 'active');
  if (closed) return { ok: false, error: `${closed.provider.name} مغلق حالياً` };
  let invId = '';
  mutate((db) => {
    const now = Date.now();
    invId = uid(db, 'inv');
    const orders: Order[] = det.groups.map((g) => {
      const num = db.orders.reduce((m, o) => Math.max(m, o.number), 1200) + 1 + 0;
      return {
        id: uid(db, 'o'),
        number: num,
        groupId: invId,
        invoiceId: invId,
        customerId: me.id,
        customerName: info.name.trim(),
        phone: normPhone(info.phone),
        address: info.address.trim(),
        notes: info.notes.trim(),
        providerId: g.provider.id,
        providerName: g.provider.name,
        providerType: g.provider.type,
        providerOwnerId: g.provider.ownerId,
        items: g.items,
        subtotal: g.subtotal,
        deliveryFee: g.provider.deliveryFee,
        total: g.subtotal + g.provider.deliveryFee,
        status: 'pending' as OrderStatus,
        createdAt: now,
        updatedAt: now,
        history: [{ status: 'pending' as OrderStatus, at: now }],
      };
    });
    // unique sequential numbers
    let base = db.orders.reduce((m, o) => Math.max(m, o.number), 1200);
    orders.forEach((o) => (o.number = ++base));
    db.orders = [...db.orders, ...orders];
    const inv: Invoice = {
      id: invId,
      number: `INV-${orders[0].number}`,
      kind: 'delivery',
      customerId: me.id,
      customerName: info.name.trim(),
      phone: normPhone(info.phone),
      address: info.address.trim(),
      createdAt: now,
      total: det.total,
      parts: orders.map((o) => ({
        orderId: o.id,
        providerId: o.providerId,
        providerName: o.providerName,
        providerType: o.providerType,
        items: o.items,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
      })),
    };
    db.invoices = [...db.invoices, inv];
    if (info.address !== me.address) db.users = db.users.map((u) => (u.id === me.id ? { ...u, address: info.address.trim() } : u));
  });
  saveCart([]);
  return { ok: true, invoiceId: invId };
}

export const CUSTOM_FEE = 20;
export function placeCustomOrder(me: User, info: { text: string; phone: string; address: string }): Result<{ orderId: string }> {
  if (!state.db.settings.appEnabled) return { ok: false, error: 'التطبيق متوقف حالياً' };
  if (info.text.trim().length < 3) return { ok: false, error: 'اكتب ما تريد طلبه' };
  if (info.address.trim().length < 6) return { ok: false, error: 'اكتب العنوان بالتفصيل' };
  if (!/^01[0-9]{9}$/.test(normPhone(info.phone))) return { ok: false, error: 'رقم الهاتف غير صحيح' };
  let oid = '';
  mutate((db) => {
    const now = Date.now();
    oid = uid(db, 'o');
    const invId = uid(db, 'inv');
    const num = db.orders.reduce((m, o) => Math.max(m, o.number), 1200) + 1;
    const o: Order = {
      id: oid,
      number: num,
      groupId: invId,
      invoiceId: invId,
      customerId: me.id,
      customerName: me.name,
      phone: normPhone(info.phone),
      address: info.address.trim(),
      notes: '',
      providerId: 'custom',
      providerName: 'طلب خاص — اطلب إيه؟',
      providerType: 'custom',
      providerOwnerId: '',
      items: [],
      customText: info.text.trim(),
      subtotal: 0,
      deliveryFee: CUSTOM_FEE,
      total: CUSTOM_FEE,
      status: 'accepted',
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'pending', at: now }, { status: 'accepted', at: now }],
    };
    db.orders = [...db.orders, o];
    db.invoices = [
      ...db.invoices,
      {
        id: invId,
        number: `INV-${num}`,
        kind: 'delivery',
        customerId: me.id,
        customerName: me.name,
        phone: o.phone,
        address: o.address,
        createdAt: now,
        total: CUSTOM_FEE,
        parts: [
          { orderId: oid, providerId: 'custom', providerName: o.providerName, providerType: 'custom', items: [], customText: o.customText, subtotal: 0, deliveryFee: CUSTOM_FEE },
        ],
      },
    ];
    tryAutoAssign(db, oid);
  });
  return { ok: true, orderId: oid };
}

export type OrderAction = 'accept' | 'reject' | 'ready' | 'cancel' | 'courier_accept' | 'pickup' | 'deliver';

export function orderAction(orderId: string, action: OrderAction, by: User, reason?: string): Result {
  const o = state.db.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, error: 'الطلب غير موجود' };
  switch (action) {
    case 'accept':
      mutate((db) => {
        setStatus(db, orderId, 'accepted');
        sysMsg(db, orderId, 'تم قبول طلبك وجاري التحضير 👨‍🍳');
        tryAutoAssign(db, orderId);
      });
      break;
    case 'reject':
      mutate((db) => setStatus(db, orderId, 'rejected', { rejectReason: reason || 'غير متاح حالياً' }));
      break;
    case 'ready':
      mutate((db) => {
        setStatus(db, orderId, 'ready');
        sysMsg(db, orderId, 'الطلب جاهز للاستلام من المندوب ✅');
      });
      break;
    case 'cancel':
      if (['on_the_way', 'delivered'].includes(o.status)) return { ok: false, error: 'لا يمكن إلغاء الطلب الآن' };
      mutate((db) => setStatus(db, orderId, 'cancelled', { rejectReason: by.role === 'admin' ? 'ألغاه المدير' : 'ألغاه العميل' }));
      break;
    case 'courier_accept': {
      if (!by.available) return { ok: false, error: 'فعّل حالتك إلى "متاح" أولاً لقبول الطلبات' };
      if (o.courierId && o.courierId !== by.id) return { ok: false, error: 'تم قبول الطلب بواسطة مندوب آخر' };
      mutate((db) => {
        db.orders = db.orders.map((x) => (x.id === orderId ? { ...x, courierId: by.id, courierName: by.name, updatedAt: Date.now() } : x));
        sysMsg(db, orderId, `المندوب ${by.name} قبل طلبك وسيتولى التوصيل 🛵`);
      });
      break;
    }
    case 'pickup':
      mutate((db) => {
        setStatus(db, orderId, 'on_the_way');
        sysMsg(db, orderId, 'استلم المندوب طلبك وهو الآن في الطريق إليك 🚀');
      });
      break;
    case 'deliver':
      mutate((db) => {
        setStatus(db, orderId, 'delivered');
        sysMsg(db, orderId, 'تم تسليم الطلب بنجاح. بالهناء والشفاء 💚');
      });
      break;
  }
  return { ok: true };
}

export function sendMessage(orderId: string, text: string, by: User) {
  const t = text.trim();
  if (!t) return;
  mutate((db) => {
    db.messages = [
      ...db.messages,
      { id: uid(db, 'm'), orderId, senderId: by.id, senderName: by.name, senderRole: by.role, text: t, createdAt: Date.now() },
    ];
  });
}

/* ---------- appointments ---------- */
export function slotTaken(db: DB, doctorId: string, date: string, time: string) {
  return db.appointments.some(
    (a) => a.doctorId === doctorId && a.date === date && a.time === time && ['pending', 'confirmed'].includes(a.status)
  );
}

export function bookAppointment(
  me: User,
  info: { doctor: Product; date: string; time: string; patientName: string; phone: string; notes: string }
): Result<{ id: string }> {
  if (!state.db.settings.appEnabled) return { ok: false, error: 'التطبيق متوقف حالياً' };
  const prov = state.db.providers.find((p) => p.id === info.doctor.providerId);
  if (!prov || prov.status !== 'active' || !prov.open) return { ok: false, error: 'العيادة لا تستقبل حجوزات حالياً' };
  if (info.patientName.trim().length < 3) return { ok: false, error: 'اكتب اسم المريض' };
  if (!/^01[0-9]{9}$/.test(normPhone(info.phone))) return { ok: false, error: 'رقم الهاتف غير صحيح' };
  if (slotTaken(state.db, info.doctor.id, info.date, info.time)) return { ok: false, error: 'هذا الموعد محجوز، اختر موعداً آخر' };
  let id = '';
  mutate((db) => {
    const now = Date.now();
    id = uid(db, 'a');
    const num = db.appointments.reduce((m, a) => Math.max(m, a.number), 500) + 1;
    const a: Appointment = {
      id,
      number: num,
      customerId: me.id,
      patientName: info.patientName.trim(),
      phone: normPhone(info.phone),
      providerId: prov.id,
      clinicName: prov.name,
      clinicOwnerId: prov.ownerId,
      clinicAddress: prov.address,
      doctorId: info.doctor.id,
      doctorName: info.doctor.name,
      specialty: info.doctor.category,
      date: info.date,
      time: info.time,
      fee: info.doctor.price,
      notes: info.notes.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    db.appointments = [...db.appointments, a];
  });
  return { ok: true, id };
}

export function apptAction(id: string, action: 'confirm' | 'reject' | 'complete' | 'cancel') {
  mutate((db) => {
    const a = db.appointments.find((x) => x.id === id);
    if (!a) return;
    const now = Date.now();
    let patch: Partial<Appointment> = {};
    if (action === 'confirm') {
      const invId = uid(db, 'inv');
      patch = { status: 'confirmed', invoiceId: invId };
      const inv: Invoice = {
        id: invId,
        number: `BK-${a.number}`,
        kind: 'booking',
        customerId: a.customerId,
        customerName: a.patientName,
        phone: a.phone,
        address: a.clinicAddress,
        createdAt: now,
        parts: [],
        total: a.fee,
        appointmentId: a.id,
        ownerId: a.clinicOwnerId,
        clinicName: a.clinicName,
        doctorName: a.doctorName,
        specialty: a.specialty,
        date: a.date,
        time: a.time,
        fee: a.fee,
      };
      db.invoices = [...db.invoices, inv];
    } else if (action === 'reject') patch = { status: 'rejected' };
    else if (action === 'complete') patch = { status: 'completed' };
    else patch = { status: 'cancelled' };
    db.appointments = db.appointments.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x));
  });
}

/* ---------- provider catalog ---------- */
export function saveProduct(p: Omit<Product, 'id'> & { id?: string }) {
  mutate((db) => {
    if (p.id) db.products = db.products.map((x) => (x.id === p.id ? ({ ...x, ...p } as Product) : x));
    else db.products = [...db.products, { ...p, id: uid(db, p.kind === 'doctor' ? 'd' : 'i') } as Product];
  });
}
export function deleteProduct(id: string) {
  mutate((db) => {
    db.products = db.products.filter((x) => x.id !== id);
  });
}
export function updateProvider(id: string, patch: Partial<Provider>) {
  mutate((db) => {
    db.providers = db.providers.map((p) => (p.id === id ? { ...p, ...patch } : p));
  });
}

/* ---------- courier ---------- */
export function setAvailable(userId: string, available: boolean) {
  updateUser(userId, { available, availableSince: available ? Date.now() : undefined });
}

/* ---------- admin ---------- */
export function setProviderStatus(providerId: string, status: AccountStatus) {
  mutate((db) => {
    const p = db.providers.find((x) => x.id === providerId);
    if (!p) return;
    db.providers = db.providers.map((x) => (x.id === providerId ? { ...x, status, open: status === 'active' ? x.open || true : false } : x));
    db.users = db.users.map((u) => (u.id === p.ownerId ? { ...u, status } : u));
  });
}
export function setUserStatus(userId: string, status: AccountStatus) {
  mutate((db) => {
    db.users = db.users.map((u) => (u.id === userId ? { ...u, status, available: status === 'active' ? u.available : false } : u));
  });
}
export function updateSettings(patch: Partial<Settings>) {
  mutate((db) => {
    db.settings = { ...db.settings, ...patch };
  });
}
export async function resetAll() {
  const db = buildSeed();
  db.rev = state.db.rev + 1;
  setState({ db, userId: null, cart: [] });
  secure.del(SESSION_KEY);
  AsyncStorage.removeItem(CART_KEY).catch(() => {});
  AsyncStorage.setItem(DB_KEY, JSON.stringify(db)).catch(() => {});
}

export async function refresh() {
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    if (!raw) return;
    const parsed: DB = JSON.parse(raw);
    if (parsed.rev > state.db.rev) setState({ db: parsed });
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

/* ---------- owner (admin): full control over services ---------- */
export interface NewProviderInput {
  type: ProviderType;
  name: string;
  desc: string;
  address: string;
  phone: string;
  deliveryFee: number;
  specialty?: string;
  emoji?: string;
  managerName?: string;
  managerPhone?: string;
  managerPass?: string;
}

export function adminCreateProvider(admin: User, inp: NewProviderInput): Result<{ id: string }> {
  if (admin.role !== 'admin') return { ok: false, error: 'غير مصرح' };
  if (inp.name.trim().length < 2) return { ok: false, error: 'اكتب اسم الخدمة' };
  const mPhone = normPhone(inp.managerPhone || '');
  if (mPhone) {
    if (!/^01[0-9]{9}$/.test(mPhone)) return { ok: false, error: 'رقم هاتف المسؤول غير صحيح' };
    if ((inp.managerPass || '').length < 6) return { ok: false, error: 'كلمة مرور المسؤول 6 أحرف على الأقل' };
    if (state.db.users.some((u) => u.phone === mPhone)) return { ok: false, error: 'رقم هاتف المسؤول مسجل بالفعل' };
  }
  let id = '';
  mutate((db) => {
    let ownerId = admin.id;
    if (mPhone) {
      const owner: User = {
        id: uid(db, 'u'),
        name: (inp.managerName || inp.name).trim(),
        phone: mPhone,
        pass: hash((inp.managerPass || '') + mPhone),
        role: 'provider',
        address: inp.address.trim(),
        status: 'active',
        createdAt: Date.now(),
      };
      db.users = [...db.users, owner];
      ownerId = owner.id;
    }
    id = uid(db, 'p');
    db.providers = [
      ...db.providers,
      {
        id,
        ownerId,
        type: inp.type,
        name: inp.name.trim(),
        desc: inp.desc.trim(),
        address: inp.address.trim() || 'أبيس',
        phone: normPhone(inp.phone) || admin.phone,
        emoji: inp.emoji || TYPES_EMOJI[inp.type],
        rating: 0,
        eta: inp.type === 'clinic' ? '' : '30-45',
        deliveryFee: inp.type === 'clinic' ? 0 : inp.deliveryFee,
        status: 'active',
        open: true,
        specialty: inp.type === 'clinic' ? inp.specialty : undefined,
        createdAt: Date.now(),
      },
    ];
  });
  return { ok: true, id };
}
const TYPES_EMOJI: Record<ProviderType, string> = { restaurant: '🍽️', supermarket: '🛒', pharmacy: '💊', clinic: '🩺' };

export function adminDeleteProvider(providerId: string) {
  mutate((db) => {
    const p = db.providers.find((x) => x.id === providerId);
    if (!p) return;
    db.providers = db.providers.filter((x) => x.id !== providerId);
    db.products = db.products.filter((x) => x.providerId !== providerId);
    const owner = db.users.find((u) => u.id === p.ownerId);
    if (owner && owner.role === 'provider' && !db.providers.some((x) => x.ownerId === owner.id)) {
      db.users = db.users.filter((u) => u.id !== owner.id);
    }
  });
  if (state.userId && !state.db.users.some((u) => u.id === state.userId)) logout();
}

export function adminDeleteCourier(userId: string) {
  mutate((db) => {
    db.users = db.users.filter((u) => u.id !== userId || u.role !== 'courier');
  });
}

export function adminResetPassword(userId: string, newPass: string): Result {
  const u = state.db.users.find((x) => x.id === userId);
  if (!u) return { ok: false, error: 'الحساب غير موجود' };
  if (newPass.length < 6) return { ok: false, error: 'كلمة المرور 6 أحرف على الأقل' };
  updateUser(userId, { pass: hash(newPass + u.phone) });
  return { ok: true };
}
