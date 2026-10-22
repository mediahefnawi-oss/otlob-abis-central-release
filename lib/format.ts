import { OrderStatus, ApptStatus, ProviderType } from './types';
import { C } from './theme';

export const money = (n: number) => `${Math.round(n * 100) / 100} ج.م`;

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
export const fmtTime = (t: number) => {
  const d = new Date(t);
  let h = d.getHours();
  const ap = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ap}`;
};
export const fmtDateTime = (t: number) => `${fmtDate(t)} • ${fmtTime(t)}`;
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const dayName = (iso: string) => DAYS[new Date(iso + 'T12:00:00').getDay()];
export const prettyIso = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${dayName(iso)} ${Number(d)}/${Number(m)}/${y}`;
};
export const isToday = (t: number) => isoDay(new Date(t)) === isoDay(new Date());

export const TYPES: Record<
  ProviderType,
  { label: string; single: string; icon: string; emoji: string; color: string; soft: string }
> = {
  restaurant: { label: 'المطاعم', single: 'مطعم', icon: 'restaurant', emoji: '🍔', color: C.orange, soft: C.orangeSoft },
  supermarket: { label: 'السوبر ماركت', single: 'سوبر ماركت', icon: 'cart', emoji: '🛒', color: C.green, soft: C.greenSoft },
  pharmacy: { label: 'الصيدليات', single: 'صيدلية', icon: 'medkit', emoji: '💊', color: C.blue, soft: C.blueSoft },
  clinic: { label: 'حجز العيادات', single: 'عيادة', icon: 'pulse', emoji: '🩺', color: '#8A5CD1', soft: '#EFE6FB' },
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; soft: string; icon: string }> = {
  pending: { label: 'بانتظار المتجر', color: C.goldDeep, soft: C.goldSoft, icon: 'time' },
  accepted: { label: 'قيد التحضير', color: C.blue, soft: C.blueSoft, icon: 'flame' },
  ready: { label: 'جاهز للاستلام', color: '#8A5CD1', soft: '#EFE6FB', icon: 'bag-check' },
  on_the_way: { label: 'جاري التوصيل', color: C.orange, soft: C.orangeSoft, icon: 'bicycle' },
  delivered: { label: 'تم التسليم', color: C.green, soft: C.greenSoft, icon: 'checkmark-circle' },
  rejected: { label: 'مرفوض', color: C.red, soft: C.redSoft, icon: 'close-circle' },
  cancelled: { label: 'ملغي', color: C.red, soft: C.redSoft, icon: 'close-circle' },
};

export const APPT_STATUS: Record<ApptStatus, { label: string; color: string; soft: string }> = {
  pending: { label: 'بانتظار تأكيد العيادة', color: C.goldDeep, soft: C.goldSoft },
  confirmed: { label: 'تم تأكيد الحجز', color: C.green, soft: C.greenSoft },
  rejected: { label: 'مرفوض', color: C.red, soft: C.redSoft },
  completed: { label: 'تمت الزيارة', color: C.blue, soft: C.blueSoft },
  cancelled: { label: 'ملغي', color: C.red, soft: C.redSoft },
};

export const ACCOUNT_STATUS: Record<string, { label: string; color: string; soft: string }> = {
  active: { label: 'معتمد', color: C.green, soft: C.greenSoft },
  pending: { label: 'قيد المراجعة', color: C.goldDeep, soft: C.goldSoft },
  rejected: { label: 'مرفوض', color: C.red, soft: C.redSoft },
  suspended: { label: 'موقوف', color: C.red, soft: C.redSoft },
};

export const SPECIALTIES = ['باطنة', 'أطفال', 'أسنان', 'عيون', 'نساء وتوليد', 'عظام', 'جلدية'];
export const SPEC_EMOJI: Record<string, string> = {
  باطنة: '🩺',
  أطفال: '🧒',
  أسنان: '🦷',
  عيون: '👁️',
  'نساء وتوليد': '🤰',
  عظام: '🦴',
  جلدية: '🧴',
};
export const ALL_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

export const normPhone = (p: string) =>
  p
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^0-9]/g, '');

const SALT = 'abis$2026#salt';
export const hash = (s: string) => {
  const input = SALT + s + SALT;
  let h1 = 5381;
  let h2 = 52711;
  for (let r = 0; r < 600; r++) {
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h1 = Math.imul(h1, 33) ^ c ^ (h2 >>> 13);
      h2 = Math.imul(h2, 31) ^ c ^ (h1 >>> 7);
    }
  }
  return 'h' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
};
