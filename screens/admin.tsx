import React, { useMemo, useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, shadow } from '../lib/theme';
import {
  T, Icon, Toggle, IconBtn, Sheet, Card, Btn, Header, Empty, Segmented, Stat, Appear, Chip, EmojiBubble, IconBubble, Pill, AcctPill, OrderPill, Field,
  toast, confirmDialog, SectionTitle, Row, callPhone, openWhats,
} from '../components/ui';
import { OrderCard, ApptCard } from '../components/Cards';
import { useRC } from './customer';
import { ProfileScreen } from './shared';
import { ProviderFormSheet, CatalogEditor } from '../components/OwnerTools';
import {
  useStore, useMe, updateSettings, setProviderStatus, setUserStatus, resetAll, availableCouriers, adminDeleteProvider, adminDeleteCourier, adminResetPassword,
} from '../lib/store';
import { TYPES, money, fmtDateTime, fmtDate, DAYS, isoDay, ORDER_STATUS } from '../lib/format';
import { ProviderType, AccountStatus } from '../lib/types';

function AppSwitch() {
  const { db } = useStore();
  const on = db.settings.appEnabled;
  const toggle = () =>
    confirmDialog({
      title: on ? 'إيقاف التطبيق؟' : 'تشغيل التطبيق؟',
      message: on ? 'سيظهر للعملاء ومقدمي الخدمات والمناديب شاشة "التطبيق متوقف مؤقتاً" ولن يمكنهم تنفيذ أي عمليات.' : 'سيعود التطبيق للعمل بشكل طبيعي لجميع المستخدمين.',
      danger: on,
      confirmText: on ? 'إيقاف التطبيق' : 'تشغيل التطبيق',
      onConfirm: () => {
        updateSettings({ appEnabled: !on });
        toast(on ? 'تم إيقاف التطبيق' : 'تم تشغيل التطبيق', on ? 'info' : 'ok');
      },
    });
  return (
    <Pressable onPress={toggle}>
      <LinearGradient colors={on ? ['#16A163', '#0E7A4F'] : ['#B53A3A', '#8E2A2A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...shadow }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="power" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <T w="black" size={17} color="#fff">{on ? 'التطبيق يعمل' : 'التطبيق متوقف'}</T>
          <T size={12} color="rgba(255,255,255,0.85)">{on ? 'اضغط لإيقاف التطبيق لجميع المستخدمين' : 'اضغط لإعادة تشغيل التطبيق'}</T>
        </View>
        <View style={{ width: 52, height: 30, borderRadius: 15, backgroundColor: on ? C.gold : 'rgba(255,255,255,0.3)', padding: 3, alignItems: on ? 'flex-start' : 'flex-end' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ---------------- Dashboard ---------------- */
export function AdminDashboardScreen({ navigation, go }: any) {
  const rc = useRC();
  const { db } = useStore();
  const me = useMe()!;
  const orders = db.orders;
  const delivered = orders.filter((o) => o.status === 'delivered');
  const active = orders.filter((o) => ['pending', 'accepted', 'ready', 'on_the_way'].includes(o.status));
  const pendingProv = db.providers.filter((p) => p.status === 'pending');
  const pendingCour = db.users.filter((u) => u.role === 'courier' && u.status === 'pending');
  const couriers = db.users.filter((u) => u.role === 'courier' && u.status === 'active');
  const avail = availableCouriers(db).length;
  const revenue = delivered.reduce((s, o) => s + o.total, 0);

  const bars = useMemo(() => {
    const arr: { label: string; n: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = isoDay(d);
      arr.push({ label: i === 0 ? 'اليوم' : DAYS[d.getDay()].slice(0, 3), n: orders.filter((o) => isoDay(new Date(o.createdAt)) === key).length });
    }
    return arr;
  }, [orders]);
  const max = Math.max(1, ...bars.map((b) => b.n));
  const recent = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="لوحة الإدارة" subtitle={`مرحباً ${me.name}`} />
      <ScrollView refreshControl={rc} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 30 }}>
        <AppSwitch />

        {(pendingProv.length > 0 || pendingCour.length > 0) && (
          <Appear>
            <Card style={{ backgroundColor: C.goldSoft, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="notifications" size={20} color={C.goldDeep} />
                <T w="black" size={15} color={C.goldDeep}>طلبات انضمام بانتظار المراجعة</T>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {pendingProv.length > 0 && <Btn small title={`مقدمو خدمة (${pendingProv.length})`} icon="storefront" style={{ flex: 1 }} onPress={() => go('providers')} />}
                {pendingCour.length > 0 && <Btn small title={`مناديب (${pendingCour.length})`} icon="bicycle" variant="dark" style={{ flex: 1 }} onPress={() => go('couriers')} />}
              </View>
            </Card>
          </Appear>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="receipt" label="إجمالي الطلبات" value={orders.length} />
          <Stat icon="checkmark-done" label="المكتملة" value={delivered.length} color={C.blue} soft={C.blueSoft} />
          <Stat icon="bicycle" label="قيد التنفيذ" value={active.length} color={C.orange} soft={C.orangeSoft} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="cash" label="إجمالي المبيعات" value={money(revenue)} color={C.goldDeep} soft={C.goldSoft} />
          <Stat icon="calendar" label="حجوزات العيادات" value={db.appointments.length} color="#8A5CD1" soft="#EFE6FB" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="people" label="العملاء" value={db.users.filter((u) => u.role === 'customer').length} />
          <Stat icon="storefront" label="مقدمو الخدمة" value={db.providers.filter((p) => p.status === 'active').length} color={C.blue} soft={C.blueSoft} />
          <Stat icon="radio" label={`مناديب متاحون / ${couriers.length}`} value={avail} color={C.green} />
        </View>

        <Card style={{ gap: 12 }}>
          <T w="black" size={15}>الطلبات آخر 7 أيام</T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 8 }}>
            {bars.map((b, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' }}>
                <T w="bold" size={11} align="center">{b.n}</T>
                <View style={{ width: '70%', height: Math.max(6, (b.n / max) * 90), borderRadius: 8, backgroundColor: i === 6 ? C.gold : C.green, opacity: i === 6 ? 1 : 0.75 }} />
                <T size={9.5} color={C.sub} align="center" numberOfLines={1}>{b.label}</T>
              </View>
            ))}
          </View>
        </Card>

        <View>
          <SectionTitle title="أحدث الطلبات" action="عرض الكل" onAction={() => go('orders')} />
          <Card style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
            {recent.length === 0 && <Empty title="لا توجد طلبات" />}
            {recent.map((o, i) => (
              <Pressable key={o.id} onPress={() => navigation.navigate('OrderDetail', { id: o.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                <T w="bold" size={12} color={C.sub} style={{ width: 38 }}>#{o.number}</T>
                <View style={{ flex: 1 }}>
                  <T w="semi" size={13} numberOfLines={1}>{o.customerName}</T>
                  <T size={11} color={C.sub} numberOfLines={1}>{o.providerName}</T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <OrderPill s={o.status} />
                  <T w="bold" size={12}>{money(o.total)}</T>
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Providers ---------------- */
export function AdminProvidersScreen({ navigation }: any) {
  const rc = useRC();
  const { db } = useStore();
  const [st, setSt] = useState<'all' | AccountStatus>('all');
  const [tp, setTp] = useState<'all' | ProviderType>('all');
  const [adding, setAdding] = useState(false);
  const list = db.providers
    .filter((p) => (st === 'all' || p.status === st) && (tp === 'all' || p.type === tp))
    .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.createdAt - a.createdAt);
  const owner = (id: string) => db.users.find((u) => u.id === id);
  const pending = db.providers.filter((p) => p.status === 'pending').length;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="الخدمات ومقدموها" subtitle={`${db.providers.length} خدمة مسجلة`} right={<IconBtn icon="add" bg={C.gold} color={C.dark} onPress={() => setAdding(true)} />} />
      <ProviderFormSheet visible={adding} onClose={() => setAdding(false)} onCreated={(id) => navigation.navigate('AdminDetail', { kind: 'provider', id })} />
      <View style={{ paddingTop: 12, gap: 8 }}>
        <FlatList horizontal data={[{ k: 'all', l: 'الكل' }, { k: 'pending', l: 'قيد المراجعة' }, { k: 'active', l: 'معتمد' }, { k: 'rejected', l: 'مرفوض' }, { k: 'suspended', l: 'موقوف' }]} keyExtractor={(x) => x.k} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => <Chip label={item.l} active={st === item.k} count={item.k === 'pending' ? pending : undefined} onPress={() => setSt(item.k as any)} />} />
        <FlatList horizontal data={['all', 'restaurant', 'supermarket', 'pharmacy', 'clinic']} keyExtractor={(x) => x} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => <Chip label={item === 'all' ? 'كل الأنواع' : TYPES[item as ProviderType].label} icon={item === 'all' ? undefined : TYPES[item as ProviderType].icon} active={tp === item} onPress={() => setTp(item as any)} />} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        refreshControl={rc}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Empty icon="storefront" title="لا توجد نتائج" />}
        renderItem={({ item, index }) => {
          const n = db.orders.filter((o) => o.providerId === item.id).length;
          const ap = db.appointments.filter((a) => a.providerId === item.id).length;
          const o = owner(item.ownerId);
          return (
            <Appear i={index}>
              <Card onPress={() => navigation.navigate('AdminDetail', { kind: 'provider', id: item.id })} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <EmojiBubble emoji={item.emoji} size={50} bg={TYPES[item.type].soft} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T w="bold" size={15} numberOfLines={1}>{item.name}</T>
                    <T size={11.5} color={C.sub}>{TYPES[item.type].single} • {o?.name} • {o?.phone}</T>
                  </View>
                  <AcctPill s={item.status} />
                </View>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <T size={12} color={C.sub}>{item.type === 'clinic' ? `${ap} حجز` : `${n} طلب`}</T>
                  <T size={12} color={C.sub}>سجّل {fmtDate(item.createdAt)}</T>
                </View>
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn small variant="green" icon="checkmark" title="قبول" style={{ flex: 1 }} onPress={() => { setProviderStatus(item.id, 'active'); toast('تم قبول مقدم الخدمة ✅'); }} />
                    <Btn small variant="danger" icon="close" title="رفض" style={{ flex: 1 }} onPress={() => { setProviderStatus(item.id, 'rejected'); toast('تم رفض الطلب'); }} />
                  </View>
                )}
              </Card>
            </Appear>
          );
        }}
      />
    </View>
  );
}

/* ---------------- Couriers ---------------- */
export function AdminCouriersScreen({ navigation }: any) {
  const rc = useRC();
  const { db } = useStore();
  const list = db.users.filter((u) => u.role === 'courier').sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
  const avail = availableCouriers(db).length;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="المناديب" subtitle={`${avail} متاح الآن من ${list.filter((u) => u.status === 'active').length}`} />
      <FlatList
        data={list}
        keyExtractor={(u) => u.id}
        refreshControl={rc}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Empty icon="bicycle" title="لا يوجد مناديب" />}
        renderItem={({ item, index }) => {
          const active = db.orders.filter((o) => o.courierId === item.id && ['accepted', 'ready', 'on_the_way'].includes(o.status)).length;
          const done = db.orders.filter((o) => o.courierId === item.id && o.status === 'delivered').length;
          return (
            <Appear i={index}>
              <Card onPress={() => navigation.navigate('AdminDetail', { kind: 'courier', id: item.id })} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View>
                    <IconBubble icon="bicycle" color={C.orange} bg={C.orangeSoft} size={50} />
                    <View style={{ position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff', backgroundColor: item.status === 'active' && item.available ? '#22C55E' : '#A8B3AE' }} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T w="bold" size={15}>{item.name}</T>
                    <T size={11.5} color={C.sub}>{item.phone} • {item.vehicle}</T>
                    <T size={11.5} color={item.available ? C.green : C.sub} w="semi">{item.status !== 'active' ? '' : item.available ? 'متاح الآن' : 'غير متاح'}</T>
                  </View>
                  <AcctPill s={item.status} />
                </View>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <T size={12} color={C.sub}>{active} جارية</T>
                  <T size={12} color={C.sub}>{done} مكتملة</T>
                </View>
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn small variant="green" icon="checkmark" title="قبول المندوب" style={{ flex: 1 }} onPress={() => { setUserStatus(item.id, 'active'); toast('تم قبول المندوب ✅'); }} />
                    <Btn small variant="danger" icon="close" title="رفض" style={{ flex: 1 }} onPress={() => { setUserStatus(item.id, 'rejected'); toast('تم رفض الطلب'); }} />
                  </View>
                )}
              </Card>
            </Appear>
          );
        }}
      />
    </View>
  );
}

/* ---------------- Orders & bookings ---------------- */
export function AdminOrdersScreen({ navigation }: any) {
  const rc = useRC();
  const { db } = useStore();
  const [seg, setSeg] = useState('orders');
  const [f, setF] = useState('all');
  const orders = db.orders.filter((o) => f === 'all' || (f === 'active' ? ['pending', 'accepted', 'ready', 'on_the_way'].includes(o.status) : f === 'dead' ? ['rejected', 'cancelled'].includes(o.status) : o.status === f)).sort((a, b) => b.createdAt - a.createdAt);
  const appts = db.appointments.filter((a) => f === 'all' || a.status === f).sort((a, b) => b.createdAt - a.createdAt);
  const chips = seg === 'orders'
    ? [{ k: 'all', l: 'الكل' }, { k: 'active', l: 'جارية' }, { k: 'pending', l: 'جديدة' }, { k: 'delivered', l: 'مكتملة' }, { k: 'dead', l: 'ملغية' }]
    : [{ k: 'all', l: 'الكل' }, { k: 'pending', l: 'جديدة' }, { k: 'confirmed', l: 'مؤكدة' }, { k: 'completed', l: 'مكتملة' }, { k: 'rejected', l: 'مرفوضة' }];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="الطلبات والحجوزات" subtitle="متابعة كل العمليات داخل التطبيق" />
      <View style={{ padding: 16, paddingBottom: 6, gap: 10 }}>
        <Segmented value={seg} onChange={(s) => { setSeg(s); setF('all'); }} options={[{ key: 'orders', label: `طلبات التوصيل (${db.orders.length})` }, { key: 'appts', label: `حجوزات العيادات (${db.appointments.length})` }]} />
        <FlatList horizontal data={chips} keyExtractor={(x) => x.k} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} renderItem={({ item }) => <Chip label={item.l} active={f === item.k} onPress={() => setF(item.k)} />} />
      </View>
      {seg === 'orders' ? (
        <FlatList data={orders} keyExtractor={(o) => o.id} refreshControl={rc} contentContainerStyle={{ padding: 16, gap: 12 }} ListEmptyComponent={<Empty icon="receipt" title="لا توجد طلبات" />}
          renderItem={({ item, index }) => <Appear i={index}><OrderCard o={item} perspective="admin" onPress={() => navigation.navigate('OrderDetail', { id: item.id })} /></Appear>} />
      ) : (
        <FlatList data={appts} keyExtractor={(o) => o.id} refreshControl={rc} contentContainerStyle={{ padding: 16, gap: 12 }} ListEmptyComponent={<Empty icon="calendar" title="لا توجد حجوزات" />}
          renderItem={({ item, index }) => <Appear i={index}><ApptCard a={item} perspective="admin" onPress={() => navigation.navigate('ApptDetail', { id: item.id })} /></Appear>} />
      )}
    </View>
  );
}

/* ---------------- Detail (provider / courier) ---------------- */
export function AdminDetailScreen({ navigation, route }: any) {
  const { db } = useStore();
  const { kind, id } = route.params;
  const prov = kind === 'provider' ? db.providers.find((p) => p.id === id) : null;
  const user = kind === 'provider' ? db.users.find((u) => u.id === prov?.ownerId) : db.users.find((u) => u.id === id);
  if (!user) return <View style={{ flex: 1 }}><Header title="التفاصيل" onBack={() => navigation.goBack()} /><Empty title="غير موجود" /></View>;
  const status = prov ? prov.status : user.status;
  const setS = (s: AccountStatus) => (prov ? setProviderStatus(prov.id, s) : setUserStatus(user.id, s));
  const orders = (prov ? db.orders.filter((o) => o.providerId === prov.id) : db.orders.filter((o) => o.courierId === user.id)).sort((a, b) => b.createdAt - a.createdAt);
  const appts = prov ? db.appointments.filter((a) => a.providerId === prov.id).sort((a, b) => b.createdAt - a.createdAt) : [];
  const [editing, setEditing] = useState(false);
  const [pwSheet, setPwSheet] = useState(false);
  const [newPw, setNewPw] = useState('');
  const delivered = orders.filter((o) => o.status === 'delivered');
  const revenue = delivered.reduce((s, o) => s + (prov ? o.subtotal : o.deliveryFee), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={prov ? prov.name : user.name} subtitle={prov ? TYPES[prov.type].single : 'مندوب توصيل'} onBack={() => navigation.goBack()} right={<AcctPill s={status} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Card style={{ gap: 12 }}>
          <T w="black" size={15}>بيانات الحساب</T>
          <Row icon="person" label="المسؤول" value={user.name} />
          <Row icon="call" label="الهاتف" value={user.phone} />
          <Row icon="location" label="العنوان" value={prov?.address || user.address || '—'} />
          {prov && <Row icon="document-text" label="الوصف" value={prov.desc || '—'} />}
          {prov?.specialty && <Row icon="pulse" label="التخصص" value={prov.specialty} />}
          {!prov && <Row icon="bicycle" label="الوسيلة" value={user.vehicle || '—'} />}
          {!prov && <Row icon="radio" label="الحالة" value={user.available ? 'متاح الآن' : 'غير متاح'} color={user.available ? C.green : C.sub} />}
          <Row icon="calendar" label="تاريخ التسجيل" value={fmtDateTime(user.createdAt)} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small variant="soft" icon="call" title="اتصال" style={{ flex: 1 }} onPress={() => callPhone(user.phone)} />
            <Btn small variant="soft" icon="logo-whatsapp" title="واتساب" style={{ flex: 1 }} onPress={() => openWhats(user.phone)} />
          </View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="receipt" label={prov?.type === 'clinic' ? 'حجوزات' : 'طلبات'} value={prov?.type === 'clinic' ? appts.length : orders.length} />
          <Stat icon="checkmark-done" label="مكتملة" value={prov?.type === 'clinic' ? appts.filter((a) => a.status === 'completed').length : delivered.length} color={C.blue} soft={C.blueSoft} />
          <Stat icon="cash" label={prov ? 'المبيعات' : 'الأرباح'} value={prov?.type === 'clinic' ? money(appts.filter((a) => ['confirmed', 'completed'].includes(a.status)).reduce((s, a) => s + a.fee, 0)) : money(revenue)} color={C.goldDeep} soft={C.goldSoft} />
        </View>
        <Card style={{ gap: 10 }}>
          <T w="black" size={15}>إجراءات الإدارة</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {status !== 'active' && <Btn small variant="green" icon="checkmark" title="قبول / تفعيل" style={{ flexGrow: 1 }} onPress={() => { setS('active'); toast('تم تفعيل الحساب ✅'); }} />}
            {status === 'pending' && <Btn small variant="danger" icon="close" title="رفض" style={{ flexGrow: 1 }} onPress={() => { setS('rejected'); toast('تم رفض الطلب'); }} />}
            {status === 'active' && <Btn small variant="danger" icon="pause" title="إيقاف الحساب" style={{ flexGrow: 1 }} onPress={() => confirmDialog({ title: 'إيقاف الحساب؟', message: 'لن يتمكن من استقبال أي طلبات', danger: true, confirmText: 'إيقاف', onConfirm: () => { setS('suspended'); toast('تم إيقاف الحساب'); } })} />}
          </View>
        </Card>
        <Card style={{ gap: 10 }}>
          <T w="black" size={15}>تحكم المالك</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {prov && <Btn small variant="dark" icon="create" title="تعديل بيانات الخدمة" style={{ flexGrow: 1 }} onPress={() => setEditing(true)} />}
            <Btn small variant="soft" icon="key" title="تعيين كلمة مرور" style={{ flexGrow: 1 }} onPress={() => { setNewPw(''); setPwSheet(true); }} />
            <Btn small variant="danger" icon="trash" title={prov ? 'حذف الخدمة' : 'حذف المندوب'} style={{ flexGrow: 1 }} onPress={() => confirmDialog({
              title: prov ? 'حذف الخدمة نهائياً؟' : 'حذف المندوب نهائياً؟',
              message: prov ? `سيتم حذف "${prov.name}" وجميع منتجاتها وحساب مسؤولها. سجل الطلبات السابقة يبقى محفوظاً.` : `سيتم حذف حساب ${user.name}.`,
              danger: true, confirmText: 'حذف',
              onConfirm: () => { navigation.goBack(); setTimeout(() => { prov ? adminDeleteProvider(prov.id) : adminDeleteCourier(user.id); toast('تم الحذف'); }, 150); },
            })} />
          </View>
        </Card>
        {prov && <CatalogEditor prov={prov} />}
        {prov && <ProviderFormSheet visible={editing} onClose={() => setEditing(false)} provider={prov} />}
        <Sheet visible={pwSheet} onClose={() => setPwSheet(false)} title="تعيين كلمة مرور جديدة">
          <T size={12.5} color={C.sub}>سيتم تعيين كلمة مرور جديدة للحساب {user.phone}. كلمات المرور مشفّرة ولا يمكن عرضها.</T>
          <Field label="كلمة المرور الجديدة" icon="key" value={newPw} onChangeText={setNewPw} secureTextEntry />
          <Btn title="حفظ" icon="checkmark" onPress={() => { const r = adminResetPassword(user.id, newPw); if (!r.ok) return toast(r.error, 'err'); setPwSheet(false); toast('تم تعيين كلمة المرور'); }} />
        </Sheet>
        {prov?.type === 'clinic' && appts.length > 0 && (
          <View style={{ gap: 10 }}>
            <SectionTitle title="حجوزات العيادة" />
            {appts.slice(0, 15).map((a) => <ApptCard key={a.id} a={a} perspective="admin" onPress={() => navigation.navigate('ApptDetail', { id: a.id })} />)}
          </View>
        )}
        {prov?.type !== 'clinic' && (
          <View style={{ gap: 10 }}>
            <SectionTitle title={prov ? 'الطلبات عند مقدم الخدمة' : 'طلبات المندوب'} />
            {orders.length === 0 && <Empty icon="receipt" title="لا توجد طلبات" />}
            {orders.slice(0, 20).map((o) => <OrderCard key={o.id} o={o} perspective="admin" onPress={() => navigation.navigate('OrderDetail', { id: o.id })} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------------- Settings ---------------- */
export function AdminSettingsScreen({ navigation }: any) {
  const { db } = useStore();
  const s = db.settings;
  const [msg, setMsg] = useState(s.maintenanceMessage);
  const [ann, setAnn] = useState(s.announcement);
  const extra = (
    <>
      <AppSwitch />
      <Card style={{ gap: 12 }}>
        <T w="black" size={15}>إعدادات التطبيق</T>
        <Field label="رسالة الصيانة (عند إيقاف التطبيق)" value={msg} onChangeText={setMsg} multiline icon="construct" />
        <Field label="إعلان الصفحة الرئيسية" value={ann} onChangeText={setAnn} multiline icon="megaphone" />
        <Btn title="حفظ الإعدادات" icon="checkmark" onPress={() => { updateSettings({ maintenanceMessage: msg.trim(), announcement: ann.trim() }); toast('تم حفظ الإعدادات'); }} />
        <View style={{ height: 1, backgroundColor: C.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T w="bold" size={14}>التعيين التلقائي للمناديب</T>
            <T size={11.5} color={C.sub}>يتم إسناد الطلب تلقائياً لأقل مندوب متاح انشغالاً بدلاً من قبول المندوب يدوياً</T>
          </View>
          <Toggle value={s.autoAssign} onValueChange={(v) => { updateSettings({ autoAssign: v }); toast(v ? 'تم تفعيل التعيين التلقائي' : 'تم إيقاف التعيين التلقائي'); }} />
        </View>
      </Card>
      <Card style={{ gap: 10 }}>
        <T w="black" size={15}>قاعدة البيانات</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[['المستخدمون', db.users.length], ['الأنشطة', db.providers.length], ['المنتجات', db.products.length], ['الطلبات', db.orders.length], ['الحجوزات', db.appointments.length], ['الفواتير', db.invoices.length], ['الرسائل', db.messages.length]].map(([l, n]) => (
            <View key={l as string} style={{ backgroundColor: '#F3F4EE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
              <T size={11} color={C.sub}>{l}</T>
              <T w="black" size={16}>{n}</T>
            </View>
          ))}
        </View>
        <Btn variant="soft" icon="refresh" title="إعادة ضبط البيانات التجريبية" onPress={() => confirmDialog({ title: 'إعادة ضبط كل البيانات؟', message: 'سيتم حذف جميع التغييرات والعودة للبيانات الأولية وتسجيل الخروج.', danger: true, confirmText: 'إعادة ضبط', onConfirm: () => { resetAll(); toast('تمت إعادة الضبط'); } })} />
      </Card>
    </>
  );
  return <ProfileScreen navigation={navigation} extra={extra} title="الإعدادات" />;
}
