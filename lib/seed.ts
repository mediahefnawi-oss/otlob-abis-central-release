import { DB, User, Provider, Product, Order, Invoice, Appointment, ProviderType } from './types';
import { hash } from './format';

const H = 3600 * 1000;
const D = 24 * H;

// Owner account: only the salted hash is stored in code (never the plain password)
export const ADMIN_PHONE = '01004379508';
const ADMIN_HASH = 'h13zwwd7ghcn0w';

export function buildSeed(): DB {
  const now = Date.now();
  let seq = 1000;
  const id = (p: string) => `${p}${++seq}`;

  const users: User[] = [];
  const providers: Provider[] = [];
  const products: Product[] = [];

  const mkUser = (u: Partial<User> & { name: string; phone: string; role: User['role']; pass: string }): User => {
    const user: User = {
      id: id('u'),
      address: '',
      status: 'active',
      createdAt: now - 30 * D,
      ...u,
      // owner uses a pre-hashed password; all seeded sample accounts get random, unusable passwords
      pass: u.role === 'admin' ? u.pass : hash(Math.random().toString(36) + Date.now() + u.phone),
    };
    users.push(user);
    return user;
  };

  mkUser({ name: 'أحمد حفناوي', phone: ADMIN_PHONE, pass: ADMIN_HASH, role: 'admin', address: 'أبيس، الإسكندرية' });
  const customer = mkUser({
    name: 'أحمد محمد',
    phone: '01111111111',
    pass: 'x',
    role: 'customer',
    address: 'شارع الجمهورية، بجوار مسجد الرحمن، أبيس',
  });
  const c1 = mkUser({ name: 'محمود السيد', phone: '01500000001', pass: 'x', role: 'courier', vehicle: 'موتوسيكل', available: true, availableSince: now - H, address: 'أبيس' });
  const c2 = mkUser({ name: 'كريم علي', phone: '01500000002', pass: 'x', role: 'courier', vehicle: 'موتوسيكل', available: false, address: 'أبيس' });
  mkUser({ name: 'يوسف حسن', phone: '01500000003', pass: 'x', role: 'courier', vehicle: 'دراجة', available: false, status: 'pending', address: 'أبيس', createdAt: now - 2 * H });
  mkUser({ name: 'سارة إبراهيم', phone: '01111111112', pass: 'x', role: 'customer', address: 'أبيس 2، عمارات الشرطة' });
  mkUser({ name: 'مصطفى جابر', phone: '01111111113', pass: 'x', role: 'customer', address: 'طريق الإسكندرية مطروح، أبيس' });

  let pn = 0;
  const mkProvider = (
    type: ProviderType,
    name: string,
    emoji: string,
    desc: string,
    rating: number,
    eta: string,
    fee: number,
    extra: Partial<Provider> = {}
  ): Provider => {
    pn++;
    const phone = `0120000${String(pn).padStart(4, '0')}`;
    const owner = mkUser({ name: `مالك ${name}`, phone, pass: 'x', role: 'provider', address: 'أبيس' });
    const p: Provider = {
      id: id('p'),
      ownerId: owner.id,
      type,
      name,
      desc,
      address: 'أبيس، الإسكندرية',
      phone,
      emoji,
      rating,
      eta,
      deliveryFee: fee,
      status: 'active',
      open: true,
      createdAt: now - 25 * D,
      ...extra,
    };
    providers.push(p);
    return p;
  };

  const item = (p: Provider, category: string, name: string, price: number, emoji: string, desc = '') =>
    products.push({ id: id('i'), providerId: p.id, kind: 'item', name, price, emoji, category, desc, available: true });

  const doctor = (p: Provider, name: string, fee: number, specialty: string, desc: string, slots: string[]) =>
    products.push({
      id: id('d'),
      providerId: p.id,
      kind: 'doctor',
      name,
      price: fee,
      emoji: '👨‍⚕️',
      category: specialty,
      desc,
      available: true,
      slots,
    });

  // Restaurants
  const r1 = mkProvider('restaurant', 'برجر هاوس أبيس', '🍔', 'برجر مشوي على الفحم وبطاطس مقرمشة', 4.5, '30-45', 15);
  item(r1, 'برجر', 'برجر كلاسيك', 85, '🍔', 'لحم بقري طازج مع الخس والطماطم');
  item(r1, 'برجر', 'تشيز برجر', 95, '🧀', 'شريحتين جبنة شيدر');
  item(r1, 'برجر', 'دبل برجر', 130, '🍔', 'قطعتين لحم مع صوص خاص');
  item(r1, 'جانبية', 'بطاطس مقرمشة', 30, '🍟');
  item(r1, 'مشروبات', 'كولا', 15, '🥤');
  const r2 = mkProvider('restaurant', 'بيتزا أبيس', '🍕', 'بيتزا إيطالي بعجينة طازجة', 4.3, '35-50', 20);
  item(r2, 'بيتزا', 'مارجريتا', 90, '🍕', 'صلصة طماطم وجبنة موتزاريلا');
  item(r2, 'بيتزا', 'بيبروني', 120, '🍕', 'شرائح بيبروني حارة');
  item(r2, 'بيتزا', 'سوبريم', 140, '🍕', 'خضار ولحوم مشكلة');
  item(r2, 'جانبية', 'عيش بالثوم', 35, '🥖');
  item(r2, 'مشروبات', 'بيبسي', 15, '🥤');
  const r3 = mkProvider('restaurant', 'كشري التحرير', '🍛', 'أشهر كشري في أبيس بالدقة والشطة', 4.8, '25-40', 10);
  item(r3, 'كشري', 'كشري صغير', 25, '🍛');
  item(r3, 'كشري', 'كشري وسط', 35, '🍛');
  item(r3, 'كشري', 'كشري كبير', 45, '🍛');
  item(r3, 'حلو', 'أرز باللبن', 20, '🍮');
  const r4 = mkProvider('restaurant', 'مشويات الشرقاوي', '🍗', 'مشويات على الفحم وسلطات طازجة', 4.6, '40-55', 20);
  item(r4, 'مشويات', 'كفتة نصف كيلو', 220, '🍢');
  item(r4, 'مشويات', 'ريش ضاني', 320, '🥩');
  item(r4, 'مشويات', 'فراخ مشوية', 130, '🍗');
  item(r4, 'سلطات', 'سلطة خضراء', 20, '🥗');

  // Supermarkets
  const s1 = mkProvider('supermarket', 'سوبر ماركت الخير', '🛒', 'كل احتياجاتك في مكان واحد', 4.4, '20-35', 10);
  item(s1, 'خضروات وفواكه', 'طماطم (كيلو)', 18, '🍅');
  item(s1, 'خضروات وفواكه', 'بطاطس (كيلو)', 20, '🥔');
  item(s1, 'خضروات وفواكه', 'موز (كيلو)', 35, '🍌');
  item(s1, 'خضروات وفواكه', 'تفاح (كيلو)', 60, '🍎');
  item(s1, 'مشروبات', 'مياه معدنية', 6, '💧');
  item(s1, 'مشروبات', 'عصير مانجو', 12, '🧃');
  item(s1, 'ألبان', 'لبن ١ لتر', 38, '🥛');
  item(s1, 'ألبان', 'جبنة بيضاء', 45, '🧀');
  item(s1, 'مواد غذائية', 'بيض (طبق)', 6, '🥚');
  item(s1, 'منظفات', 'سائل جلي', 35, '🧴');
  const s2 = mkProvider('supermarket', 'هايبر أبيس', '🏪', 'عروض يومية وتوصيل سريع', 4.2, '25-40', 12);
  item(s2, 'مواد غذائية', 'أرز ١ كيلو', 32, '🍚');
  item(s2, 'مواد غذائية', 'مكرونة', 12, '🍝');
  item(s2, 'مواد غذائية', 'زيت عباد الشمس', 75, '🫒');
  item(s2, 'مشروبات', 'شاي ٢٥ كيس', 40, '🍵');
  item(s2, 'منظفات', 'مسحوق غسيل', 90, '🧺');
  item(s2, 'ألبان', 'زبادي', 8, '🥣');

  // Pharmacies
  const ph = [
    mkProvider('pharmacy', 'صيدلية العزبي', '💊', 'صيدلية ٢٤ ساعة', 4.7, '15-25', 8),
    mkProvider('pharmacy', 'صيدلية مايو', '💊', 'أدوية ومستحضرات تجميل', 4.5, '20-30', 8),
    mkProvider('pharmacy', 'صيدلية القاهرة', '💊', 'خدمة توصيل سريعة', 4.9, '25-35', 10),
    mkProvider('pharmacy', 'صيدلية الرحمة', '💊', 'أدوية الأطفال ومستلزمات العناية', 4.6, '15-25', 8),
  ];
  ph.forEach((p) => {
    item(p, 'أدوية', 'باراسيتامول ٥٠٠ مجم', 20, '💊', 'خافض للحرارة ومسكن');
    item(p, 'فيتامينات', 'فيتامين C فوار', 55, '🍊');
    item(p, 'مستلزمات', 'كمامات (علبة)', 40, '😷');
    item(p, 'مستلزمات', 'ميزان حرارة رقمي', 85, '🌡️');
    item(p, 'عناية', 'كريم مرطب', 60, '🧴');
    item(p, 'مستلزمات', 'شاش وبلاستر', 25, '🩹');
  });

  // Clinics
  const cl1 = mkProvider('clinic', 'عيادة د. محمد أحمد', '🩺', 'استشاري الباطنة والجهاز الهضمي', 4.8, '', 0, { specialty: 'باطنة' });
  doctor(cl1, 'د. محمد أحمد', 200, 'باطنة', 'استشاري الباطنة والجهاز الهضمي', ['10:00', '10:30', '11:00', '11:30', '12:00', '17:00', '17:30', '18:00']);
  const cl2 = mkProvider('clinic', 'مركز الابتسامة للأسنان', '🦷', 'تجميل وزراعة وتقويم الأسنان', 4.7, '', 0, { specialty: 'أسنان' });
  doctor(cl2, 'د. هالة منصور', 150, 'أسنان', 'تقويم وتجميل الأسنان', ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30']);
  doctor(cl2, 'د. عمرو فتحي', 180, 'أسنان', 'زراعة وجراحة الفم', ['12:00', '12:30', '13:00', '19:00', '19:30', '20:00']);
  const cl3 = mkProvider('clinic', 'عيادة د. سارة للأطفال', '🧒', 'رعاية الأطفال وحديثي الولادة', 4.9, '', 0, { specialty: 'أطفال' });
  doctor(cl3, 'د. سارة عبد الله', 180, 'أطفال', 'استشاري طب الأطفال', ['10:00', '10:30', '11:00', '16:00', '16:30', '17:00', '17:30']);
  const cl4 = mkProvider('clinic', 'مركز النور للعيون', '👁️', 'فحص النظر والليزك', 4.6, '', 0, { specialty: 'عيون' });
  doctor(cl4, 'د. طارق شاهين', 220, 'عيون', 'جراحات الشبكية والقرنية', ['11:00', '11:30', '12:00', '18:00', '18:30', '19:00']);
  const cl5 = mkProvider('clinic', 'عيادة د. منى للنساء والتوليد', '🤰', 'متابعة الحمل والولادة', 4.8, '', 0, { specialty: 'نساء وتوليد' });
  doctor(cl5, 'د. منى الشاذلي', 250, 'نساء وتوليد', 'استشاري النساء والتوليد', ['16:00', '16:30', '17:00', '17:30', '18:00']);
  const cl6 = mkProvider('clinic', 'عيادة العظام والمفاصل', '🦴', 'علاج طبيعي وجراحات العظام', 4.4, '', 0, { specialty: 'عظام' });
  doctor(cl6, 'د. أيمن رشدي', 200, 'عظام', 'استشاري العظام', ['13:00', '17:00', '17:30', '18:00', '18:30']);

  // Pending provider (for the admin approval flow)
  const pOwner = mkUser({ name: 'حسام النيل', phone: '01200000099', pass: 'x', role: 'provider', status: 'pending', address: 'أبيس', createdAt: now - 3 * H });
  providers.push({
    id: id('p'),
    ownerId: pOwner.id,
    type: 'restaurant',
    name: 'مطعم النيل للمأكولات البحرية',
    desc: 'أسماك وجمبري طازج',
    address: 'كورنيش أبيس',
    phone: '01200000099',
    emoji: '🦐',
    rating: 0,
    eta: '40-60',
    deliveryFee: 20,
    status: 'pending',
    open: false,
    createdAt: now - 3 * H,
  });

  // Historical orders (for dashboard & demo)
  const orders: Order[] = [];
  const invoices: Invoice[] = [];
  const hist = [
    { p: r1, days: 6, qty: 2 },
    { p: r2, days: 5, qty: 1 },
    { p: s1, days: 5, qty: 3 },
    { p: r3, days: 4, qty: 2 },
    { p: ph[0], days: 4, qty: 1 },
    { p: r4, days: 3, qty: 1 },
    { p: s2, days: 3, qty: 2 },
    { p: r1, days: 2, qty: 1 },
    { p: r2, days: 2, qty: 2 },
    { p: ph[2], days: 1, qty: 1 },
    { p: r3, days: 1, qty: 3 },
    { p: s1, days: 1, qty: 1 },
    { p: r1, days: 0, qty: 1 },
    { p: r3, days: 0, qty: 2 },
  ];
  let num = 1200;
  hist.forEach((h, i) => {
    const prods = products.filter((x) => x.providerId === h.p.id).slice(0, 2);
    const items = prods.map((x) => ({ productId: x.id, name: x.name, price: x.price, qty: h.qty, emoji: x.emoji }));
    const subtotal = items.reduce((s, x) => s + x.price * x.qty, 0);
    const created = now - h.days * D - (i % 5) * H - H;
    const oid = id('o');
    const invId = id('inv');
    const cu = i % 3 === 0 ? customer : users.find((u) => u.role === 'customer' && u.id !== customer.id)!;
    const live = h.days === 0 && i === hist.length - 1;
    const o: Order = {
      id: oid,
      number: ++num,
      groupId: invId,
      invoiceId: invId,
      customerId: cu.id,
      customerName: cu.name,
      phone: cu.phone,
      address: cu.address,
      notes: '',
      providerId: h.p.id,
      providerName: h.p.name,
      providerType: h.p.type,
      providerOwnerId: h.p.ownerId,
      items,
      subtotal,
      deliveryFee: h.p.deliveryFee,
      total: subtotal + h.p.deliveryFee,
      status: live ? 'pending' : 'delivered',
      courierId: live ? undefined : i % 2 ? c1.id : c2.id,
      courierName: live ? undefined : i % 2 ? c1.name : c2.name,
      createdAt: created,
      updatedAt: created + H / 2,
      history: [{ status: 'pending', at: created }],
    };
    orders.push(o);
    invoices.push({
      id: invId,
      number: `INV-${o.number}`,
      kind: 'delivery',
      customerId: cu.id,
      customerName: cu.name,
      phone: cu.phone,
      address: cu.address,
      createdAt: created,
      total: o.total,
      parts: [
        {
          orderId: oid,
          providerId: h.p.id,
          providerName: h.p.name,
          providerType: h.p.type,
          items,
          subtotal,
          deliveryFee: h.p.deliveryFee,
        },
      ],
    });
  });

  // One confirmed historic appointment with invoice
  const appointments: Appointment[] = [];
  const doc = products.find((x) => x.kind === 'doctor' && x.providerId === cl1.id)!;
  const apId = id('a');
  const bInv = id('inv');
  const dayIso = (n: number) => {
    const d = new Date(now + n * D);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  appointments.push({
    id: apId,
    number: 501,
    customerId: customer.id,
    patientName: customer.name,
    phone: customer.phone,
    providerId: cl1.id,
    clinicName: cl1.name,
    clinicOwnerId: cl1.ownerId,
    clinicAddress: cl1.address,
    doctorId: doc.id,
    doctorName: doc.name,
    specialty: doc.category,
    date: dayIso(1),
    time: '11:00',
    fee: doc.price,
    notes: 'كشف دوري',
    status: 'confirmed',
    invoiceId: bInv,
    createdAt: now - 5 * H,
    updatedAt: now - 4 * H,
  });
  invoices.push({
    id: bInv,
    number: 'BK-501',
    kind: 'booking',
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    address: customer.address,
    createdAt: now - 4 * H,
    parts: [],
    total: doc.price,
    appointmentId: apId,
    ownerId: cl1.ownerId,
    clinicName: cl1.name,
    doctorName: doc.name,
    specialty: doc.category,
    date: dayIso(1),
    time: '11:00',
    fee: doc.price,
  });

  return {
    rev: 1,
    seq,
    users,
    providers,
    products,
    orders,
    appointments,
    invoices,
    messages: [],
    settings: {
      appEnabled: true,
      maintenanceMessage: 'التطبيق متوقف مؤقتاً للصيانة والتحديث. سنعود إليكم قريباً.',
      announcement: 'مرحباً بك في أطلب أبيس — كل اللي محتاجه في أبيس لحد باب بيتك 🚀',
      autoAssign: false,
      supportPhone: '201004379508',
      supportName: 'أحمد حفناوي',
    },
  };
}
