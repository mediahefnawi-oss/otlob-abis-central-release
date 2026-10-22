require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const required = ['DATABASE_URL', 'JWT_SECRET', 'OWNER_USERNAME', 'OWNER_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) { console.error(`Missing required environment variable: ${key}`); process.exit(1); }
}
if (process.env.JWT_SECRET.length < 32) { console.error('JWT_SECRET must be at least 32 characters.'); process.exit(1); }

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('CORS_ORIGINS must contain the exact deployed Vercel origin in production.');
  process.exit(1);
}
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed')); }, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '256kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const cleanUser = row => ({ id: String(row.id), name: row.name, phone: row.phone, role: row.role, address: row.address, status: row.status, createdAt: row.created_at });
function tokenFor(user) { return jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h', issuer: 'otlob-abis-api', audience: 'otlob-abis-app' }); }
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'يلزم تسجيل الدخول' });
  try { req.auth = jwt.verify(h.slice(7), process.env.JWT_SECRET, { issuer: 'otlob-abis-api', audience: 'otlob-abis-app' }); next(); }
  catch { return res.status(401).json({ error: 'انتهت الجلسة أو رمز الدخول غير صالح' }); }
}
const roles = (...allowed) => (req, res, next) => { if (!req.auth || !allowed.includes(req.auth.role)) return res.status(403).json({ error: 'ليس لديك صلاحية لتنفيذ هذا الإجراء' }); next(); };

async function ensureSchema() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  await pool.query(schema);
  const username = process.env.OWNER_USERNAME;
  const phone = process.env.OWNER_PHONE || '01000000000';
  const passwordHash = await bcrypt.hash(process.env.OWNER_PASSWORD, 12);
  const existing = await pool.query("SELECT id FROM users WHERE role='admin' AND phone=$1", [phone]);
  if (!existing.rowCount) {
    await pool.query("INSERT INTO users(name, phone, password_hash, role, address, status) VALUES($1,$2,$3,'admin','إدارة التطبيق','active')", [username, phone, passwordHash]);
    console.log('Initial owner account created from environment settings.');
  }
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'otlob-abis-api', database: 'connected' });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, phone, password, address = '', role = 'customer', provider } = req.body || {};
  const normalizedPhone = String(phone || '').replace(/\s+/g, '');
  if (!name || String(name).trim().length < 3) return res.status(400).json({ error: 'اكتب الاسم بالكامل' });
  if (!/^01[0-9]{9}$/.test(normalizedPhone)) return res.status(400).json({ error: 'رقم الهاتف غير صحيح' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف' });
  if (!['customer','provider','courier'].includes(role)) return res.status(400).json({ error: 'نوع الحساب غير صالح' });
  if (role === 'provider' && (!provider || !String(provider.name || '').trim())) return res.status(400).json({ error: 'بيانات مقدم الخدمة مطلوبة' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 12);
    const status = role === 'customer' ? 'active' : 'pending';
    const result = await client.query('INSERT INTO users(name,phone,password_hash,role,address,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [String(name).trim(), normalizedPhone, hash, role, String(address).trim(), status]);
    const user = result.rows[0];
    if (role === 'provider') {
      await client.query('INSERT INTO providers(owner_user_id,type,name,description,address,phone,delivery_fee,status,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,\'pending\',$8)', [user.id, provider.type || 'other', String(provider.name).trim(), String(provider.desc || ''), String(address).trim(), normalizedPhone, Math.max(0, Number(provider.deliveryFee) || 0), JSON.stringify({ specialty: provider.specialty || '' })]);
    }
    await client.query('COMMIT');
    res.status(201).json({ token: tokenFor(user), user: cleanUser(user) });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'رقم الهاتف مسجل بالفعل' });
    throw e;
  } finally { client.release(); }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { phone, password, username } = req.body || {};
  let result;
  if (username && String(username) === process.env.OWNER_USERNAME) {
    result = await pool.query("SELECT * FROM users WHERE role='admin' AND phone=$1 LIMIT 1", [process.env.OWNER_PHONE || '01000000000']);
    if (!result.rowCount || !(await bcrypt.compare(String(password || ''), result.rows[0].password_hash))) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  } else {
    const ph = String(phone || '').replace(/\s+/g, '');
    result = await pool.query('SELECT * FROM users WHERE phone=$1 LIMIT 1', [ph]);
    if (!result.rowCount || !(await bcrypt.compare(String(password || ''), result.rows[0].password_hash))) return res.status(401).json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
  }
  const user = result.rows[0];
  if (user.status === 'suspended' || user.status === 'rejected') return res.status(403).json({ error: 'الحساب غير مفعّل. تواصل مع الدعم' });
  res.json({ token: tokenFor(user), user: cleanUser(user) });
}));

app.get('/api/me', auth, asyncRoute(async (req, res) => {
  const r = await pool.query('SELECT * FROM users WHERE id=$1', [req.auth.sub]);
  if (!r.rowCount) return res.status(404).json({ error: 'الحساب غير موجود' });
  res.json({ user: cleanUser(r.rows[0]) });
}));

app.get('/api/providers', asyncRoute(async (req, res) => {
  const { type } = req.query;
  const values = [];
  let sql = "SELECT p.* FROM providers p WHERE p.status='active'";
  if (type) { values.push(String(type)); sql += ` AND p.type=$${values.length}`; }
  sql += ' ORDER BY p.created_at DESC LIMIT 200';
  const r = await pool.query(sql, values);
  res.json({ providers: r.rows.map(p => ({ id: String(p.id), ownerId: String(p.owner_user_id), type: p.type, name: p.name, desc: p.description, address: p.address, phone: p.phone, deliveryFee: Number(p.delivery_fee), status: p.status, open: p.is_open, ...p.metadata })) });
}));
app.get('/api/products', asyncRoute(async (req, res) => {
  const values = []; let sql = "SELECT pr.*, p.name AS provider_name FROM products pr JOIN providers p ON p.id=pr.provider_id WHERE pr.available=TRUE AND p.status='active'";
  if (req.query.providerId) { values.push(Number(req.query.providerId)); sql += ` AND pr.provider_id=$${values.length}`; }
  sql += ' ORDER BY pr.created_at DESC LIMIT 500';
  const r = await pool.query(sql, values);
  res.json({ products: r.rows.map(x => ({ id: String(x.id), providerId: String(x.provider_id), name: x.name, price: Number(x.price), available: x.available, ...x.data })) });
}));

app.post('/api/products', auth, roles('provider','admin'), asyncRoute(async (req, res) => {
  const { providerId, name, price, data = {} } = req.body || {};
  if (!name || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ error: 'اسم المنتج والسعر مطلوبان' });
  const p = await pool.query('SELECT id,owner_user_id FROM providers WHERE id=$1', [Number(providerId)]);
  if (!p.rowCount) return res.status(404).json({ error: 'مقدم الخدمة غير موجود' });
  if (req.auth.role !== 'admin' && String(p.rows[0].owner_user_id) !== req.auth.sub) return res.status(403).json({ error: 'لا يمكنك إدارة منتجات مقدم خدمة آخر' });
  const r = await pool.query('INSERT INTO products(provider_id,name,price,data) VALUES($1,$2,$3,$4) RETURNING *', [Number(providerId), String(name).trim(), Number(price), JSON.stringify(data)]);
  res.status(201).json({ product: { id: String(r.rows[0].id), providerId: String(r.rows[0].provider_id), name: r.rows[0].name, price: Number(r.rows[0].price), available: r.rows[0].available, ...r.rows[0].data } });
}));

app.patch('/api/products/:id', auth, roles('provider','admin'), asyncRoute(async (req, res) => {
  const found = await pool.query('SELECT pr.*, p.owner_user_id FROM products pr JOIN providers p ON p.id=pr.provider_id WHERE pr.id=$1', [Number(req.params.id)]);
  if (!found.rowCount) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (req.auth.role !== 'admin' && String(found.rows[0].owner_user_id) !== req.auth.sub) return res.status(403).json({ error: 'غير مسموح' });
  const old = found.rows[0]; const name = req.body.name === undefined ? old.name : String(req.body.name).trim();
  const price = req.body.price === undefined ? Number(old.price) : Number(req.body.price);
  const available = req.body.available === undefined ? old.available : Boolean(req.body.available);
  if (!name || !Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'بيانات المنتج غير صالحة' });
  const data = { ...old.data, ...(req.body.data || {}) };
  const r = await pool.query('UPDATE products SET name=$1,price=$2,available=$3,data=$4,updated_at=NOW() WHERE id=$5 RETURNING *', [name, price, available, JSON.stringify(data), old.id]);
  res.json({ product: { id: String(r.rows[0].id), providerId: String(r.rows[0].provider_id), name: r.rows[0].name, price: Number(r.rows[0].price), available: r.rows[0].available, ...r.rows[0].data } });
}));
app.delete('/api/products/:id', auth, roles('provider','admin'), asyncRoute(async (req, res) => {
  const found = await pool.query('SELECT pr.id,p.owner_user_id FROM products pr JOIN providers p ON p.id=pr.provider_id WHERE pr.id=$1', [Number(req.params.id)]);
  if (!found.rowCount) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (req.auth.role !== 'admin' && String(found.rows[0].owner_user_id) !== req.auth.sub) return res.status(403).json({ error: 'غير مسموح' });
  await pool.query('DELETE FROM products WHERE id=$1', [found.rows[0].id]); res.status(204).end();
}));

app.post('/api/orders', auth, roles('customer'), asyncRoute(async (req, res) => {
  const { providerId = null, total = 0, data = {} } = req.body || {};
  if (!Number.isFinite(Number(total)) || Number(total) < 0) return res.status(400).json({ error: 'إجمالي الطلب غير صالح' });
  if (providerId !== null) { const p = await pool.query("SELECT id FROM providers WHERE id=$1 AND status='active'", [Number(providerId)]); if (!p.rowCount) return res.status(400).json({ error: 'مقدم الخدمة غير متاح' }); }
  const r = await pool.query('INSERT INTO orders(customer_user_id,provider_id,total,data) VALUES($1,$2,$3,$4) RETURNING *', [Number(req.auth.sub), providerId === null ? null : Number(providerId), Number(total), JSON.stringify(data)]);
  res.status(201).json({ order: { id: String(r.rows[0].id), number: Number(r.rows[0].order_number), status: r.rows[0].status, total: Number(r.rows[0].total), ...r.rows[0].data, createdAt: r.rows[0].created_at } });
}));
app.get('/api/orders', auth, asyncRoute(async (req, res) => {
  let sql, params;
  if (req.auth.role === 'admin') { sql = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 200'; params = []; }
  else if (req.auth.role === 'customer') { sql = 'SELECT * FROM orders WHERE customer_user_id=$1 ORDER BY created_at DESC LIMIT 200'; params = [Number(req.auth.sub)]; }
  else if (req.auth.role === 'provider') { sql = 'SELECT o.* FROM orders o JOIN providers p ON p.id=o.provider_id WHERE p.owner_user_id=$1 ORDER BY o.created_at DESC LIMIT 200'; params = [Number(req.auth.sub)]; }
  else { sql = 'SELECT * FROM orders WHERE courier_user_id=$1 ORDER BY created_at DESC LIMIT 200'; params = [Number(req.auth.sub)]; }
  const r = await pool.query(sql, params);
  res.json({ orders: r.rows.map(o => ({ id: String(o.id), number: Number(o.order_number), customerId: String(o.customer_user_id), providerId: o.provider_id === null ? null : String(o.provider_id), courierId: o.courier_user_id === null ? null : String(o.courier_user_id), status: o.status, total: Number(o.total), ...o.data, createdAt: o.created_at, updatedAt: o.updated_at })) });
}));
app.patch('/api/orders/:id/status', auth, roles('provider','courier','admin'), asyncRoute(async (req, res) => {
  const allowed = ['accepted','ready','on_the_way','delivered','rejected','cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'حالة الطلب غير صالحة' });
  const found = await pool.query('SELECT o.*,p.owner_user_id FROM orders o LEFT JOIN providers p ON p.id=o.provider_id WHERE o.id=$1', [Number(req.params.id)]);
  if (!found.rowCount) return res.status(404).json({ error: 'الطلب غير موجود' });
  const o = found.rows[0];
  if (req.auth.role === 'provider' && String(o.owner_user_id) !== req.auth.sub) return res.status(403).json({ error: 'غير مسموح' });
  if (req.auth.role === 'courier' && o.courier_user_id !== null && String(o.courier_user_id) !== req.auth.sub) return res.status(403).json({ error: 'الطلب ليس مسندًا إليك' });
  const r = await pool.query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [req.body.status, o.id]);
  res.json({ order: { id: String(r.rows[0].id), number: Number(r.rows[0].order_number), status: r.rows[0].status, total: Number(r.rows[0].total), ...r.rows[0].data, updatedAt: r.rows[0].updated_at } });
}));

app.get('/api/orders/:id/messages', auth, asyncRoute(async (req, res) => {
  const order = await pool.query('SELECT o.*,p.owner_user_id FROM orders o LEFT JOIN providers p ON p.id=o.provider_id WHERE o.id=$1', [Number(req.params.id)]);
  if (!order.rowCount) return res.status(404).json({ error: 'الطلب غير موجود' });
  const o = order.rows[0];
  const allowed = req.auth.role === 'admin' || String(o.customer_user_id) === req.auth.sub || String(o.owner_user_id) === req.auth.sub || String(o.courier_user_id || '') === req.auth.sub;
  if (!allowed) return res.status(403).json({ error: 'غير مسموح بالاطلاع على المحادثة' });
  const r = await pool.query('SELECT m.id,m.order_id,m.sender_user_id,m.body,m.created_at,u.name,u.role FROM messages m JOIN users u ON u.id=m.sender_user_id WHERE m.order_id=$1 ORDER BY m.created_at ASC LIMIT 500', [o.id]);
  res.json({ messages: r.rows.map(m => ({ id: String(m.id), orderId: String(m.order_id), senderId: String(m.sender_user_id), senderName: m.name, senderRole: m.role, text: m.body, createdAt: m.created_at })) });
}));
app.post('/api/orders/:id/messages', auth, asyncRoute(async (req, res) => {
  const body = String(req.body.text || '').trim();
  if (!body || body.length > 2000) return res.status(400).json({ error: 'الرسالة فارغة أو طويلة جدًا' });
  const order = await pool.query('SELECT o.*,p.owner_user_id FROM orders o LEFT JOIN providers p ON p.id=o.provider_id WHERE o.id=$1', [Number(req.params.id)]);
  if (!order.rowCount) return res.status(404).json({ error: 'الطلب غير موجود' });
  const o = order.rows[0];
  const allowed = req.auth.role === 'admin' || String(o.customer_user_id) === req.auth.sub || String(o.owner_user_id) === req.auth.sub || String(o.courier_user_id || '') === req.auth.sub;
  if (!allowed) return res.status(403).json({ error: 'غير مسموح بإرسال رسالة في هذه المحادثة' });
  const r = await pool.query('INSERT INTO messages(order_id,sender_user_id,body) VALUES($1,$2,$3) RETURNING *', [o.id, Number(req.auth.sub), body]);
  const u = await pool.query('SELECT name,role FROM users WHERE id=$1', [Number(req.auth.sub)]);
  res.status(201).json({ message: { id: String(r.rows[0].id), orderId: String(r.rows[0].order_id), senderId: String(req.auth.sub), senderName: u.rows[0].name, senderRole: u.rows[0].role, text: body, createdAt: r.rows[0].created_at } });
}));

app.get('/api/admin/providers/pending', auth, roles('admin'), asyncRoute(async (_req, res) => {
  const r = await pool.query("SELECT p.*,u.name AS owner_name FROM providers p JOIN users u ON u.id=p.owner_user_id WHERE p.status='pending' ORDER BY p.created_at ASC");
  res.json({ providers: r.rows.map(p => ({ id: String(p.id), ownerId: String(p.owner_user_id), ownerName: p.owner_name, type: p.type, name: p.name, desc: p.description, address: p.address, phone: p.phone, deliveryFee: Number(p.delivery_fee), status: p.status, ...p.metadata })) });
}));
app.patch('/api/admin/providers/:id/decision', auth, roles('admin'), asyncRoute(async (req, res) => {
  const status = req.body.status;
  if (!['active','rejected','suspended'].includes(status)) return res.status(400).json({ error: 'قرار غير صالح' });
  const r = await pool.query('UPDATE providers SET status=$1 WHERE id=$2 RETURNING id,owner_user_id,status', [status, Number(req.params.id)]);
  if (!r.rowCount) return res.status(404).json({ error: 'مقدم الخدمة غير موجود' });
  await pool.query('UPDATE users SET status=$1 WHERE id=$2', [status === 'active' ? 'active' : status, r.rows[0].owner_user_id]);
  res.json({ ok: true, providerId: String(r.rows[0].id), status });
}));

app.use((err, _req, res, _next) => {
  if (err && err.message === 'Origin not allowed') return res.status(403).json({ error: 'مصدر الاتصال غير مسموح' });
  if (err && err.code === '23505') return res.status(409).json({ error: 'البيانات مسجلة بالفعل' });
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ داخلي. حاول لاحقًا' });
});
const port = Number(process.env.PORT || 4000);
ensureSchema().then(() => app.listen(port, () => console.log(`Otlob Abis API listening on ${port}`))).catch(err => { console.error('API startup failed:', err); process.exit(1); });
