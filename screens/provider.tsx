import React, { useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { C, shadow } from '../lib/theme';
import {
  T, Icon, Toggle, Card, Btn, Header, Empty, Segmented, Stat, Appear, EmojiBubble, Sheet, Field, Chip, Pill, IconBubble, toast, confirmDialog, SectionTitle, IconBtn,
} from '../components/ui';
import { OrderCard, ApptCard } from '../components/Cards';
import { useRC } from './customer';
import { ProfileScreen } from './shared';
import { useStore, useMe, orderAction, apptAction, saveProduct, deleteProduct, updateProvider, availableCouriers } from '../lib/store';
import { TYPES, money, fmtDateTime, isToday, isoDay, SPECIALTIES, ALL_SLOTS, SPEC_EMOJI } from '../lib/format';
import { Product } from '../lib/types';

const useMyProvider = () => {
  const me = useMe()!;
  const { db } = useStore();
  return { me, db, prov: db.providers.find((p) => p.ownerId === me.id)! };
};

/* ---------------- Orders / appointments ---------------- */
export function ProviderOrdersScreen({ navigation }: any) {
  const rc = useRC();
  const { me, db, prov } = useMyProvider();
  const isClinic = prov.type === 'clinic';
  const [seg, setSeg] = useState(isClinic ? 'pending' : 'new');
  const couriers = availableCouriers(db).length;

  const orders = db.orders.filter((o) => o.providerId === prov.id).sort((a, b) => b.createdAt - a.createdAt);
  const appts = db.appointments.filter((a) => a.providerId === prov.id).sort((a, b) => b.createdAt - a.createdAt);

  const groups: Record<string, (o: any) => boolean> = {
    new: (o) => o.status === 'pending',
    active: (o) => ['accepted', 'ready', 'on_the_way'].includes(o.status),
    done: (o) => o.status === 'delivered',
    dead: (o) => ['rejected', 'cancelled'].includes(o.status),
  };
  const agroups: Record<string, (a: any) => boolean> = {
    pending: (a) => a.status === 'pending',
    confirmed: (a) => a.status === 'confirmed',
    completed: (a) => a.status === 'completed',
    dead: (a) => ['rejected', 'cancelled'].includes(a.status),
  };

  const todayRev = orders.filter((o) => o.status === 'delivered' && isToday(o.updatedAt)).reduce((s, o) => s + o.subtotal, 0);
  const todayAppts = appts.filter((a) => a.status !== 'rejected' && a.status !== 'cancelled' && a.date === isoDay(new Date())).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={prov.name} subtitle={isClinic ? 'إدارة الحجوزات' : 'إدارة الطلبات'}
        right={
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Toggle dark value={prov.open} onValueChange={(v) => { updateProvider(prov.id, { open: v }); toast(v ? 'تم فتح المتجر لاستقبال الطلبات' : 'تم إغلاق المتجر'); }} />
            <T size={10} w="bold" color={prov.open ? C.gold : '#9FB5AC'} align="center">{prov.open ? 'مفتوح' : 'مغلق'}</T>
          </View>
        }
      >
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {isClinic ? (
            <>
              <MiniStat icon="time" label="بانتظار الرد" value={appts.filter(agroups.pending).length} />
              <MiniStat icon="calendar" label="حجوزات اليوم" value={todayAppts} />
              <MiniStat icon="checkmark-done" label="مكتملة" value={appts.filter(agroups.completed).length} />
            </>
          ) : (
            <>
              <MiniStat icon="notifications" label="طلبات جديدة" value={orders.filter(groups.new).length} />
              <MiniStat icon="cash" label="مبيعات اليوم" value={money(todayRev)} />
              <MiniStat icon="bicycle" label="مناديب متاحون" value={couriers} />
            </>
          )}
        </View>
      </Header>
      <View style={{ padding: 16, paddingBottom: 4 }}>
        {isClinic ? (
          <Segmented value={seg} onChange={setSeg} options={[
            { key: 'pending', label: 'جديدة', count: appts.filter(agroups.pending).length },
            { key: 'confirmed', label: 'مؤكدة' },
            { key: 'completed', label: 'مكتملة' },
            { key: 'dead', label: 'ملغية' },
          ]} />
        ) : (
          <Segmented value={seg} onChange={setSeg} options={[
            { key: 'new', label: 'جديدة', count: orders.filter(groups.new).length },
            { key: 'active', label: 'قيد التنفيذ' },
            { key: 'done', label: 'مكتملة' },
            { key: 'dead', label: 'ملغية' },
          ]} />
        )}
      </View>
      {isClinic ? (
        <FlatList
          data={appts.filter(agroups[seg])}
          keyExtractor={(a) => a.id}
          refreshControl={rc}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Empty icon="calendar" title="لا توجد حجوزات هنا" text="ستظهر طلبات الحجز الجديدة من العملاء في هذه الشاشة" />}
          renderItem={({ item, index }) => (
            <Appear i={index}>
              <ApptCard a={item} perspective="provider" onPress={() => navigation.navigate('ApptDetail', { id: item.id })}>
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn small variant="green" icon="checkmark" title="قبول وإصدار الفاتورة" style={{ flex: 2 }} onPress={() => { apptAction(item.id, 'confirm'); toast('تم قبول الحجز وإنشاء الفاتورة ✅'); }} />
                    <Btn small variant="danger" icon="close" title="رفض" style={{ flex: 1 }} onPress={() => { apptAction(item.id, 'reject'); toast('تم رفض الحجز'); }} />
                  </View>
                )}
                {item.status === 'confirmed' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn small variant="soft" icon="document-text" title="الفاتورة" style={{ flex: 1 }} onPress={() => navigation.navigate('Invoice', { id: item.invoiceId })} />
                    <Btn small variant="dark" icon="checkmark-done" title="تمت الزيارة" style={{ flex: 1 }} onPress={() => { apptAction(item.id, 'complete'); toast('تم تسجيل الزيارة'); }} />
                  </View>
                )}
              </ApptCard>
            </Appear>
          )}
        />
      ) : (
        <FlatList
          data={orders.filter(groups[seg])}
          keyExtractor={(o) => o.id}
          refreshControl={rc}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Empty icon="receipt" title="لا توجد طلبات هنا" text="ستظهر الطلبات الجديدة فور وصولها من العملاء" />}
          renderItem={({ item, index }) => (
            <Appear i={index}>
              <OrderCard o={item} perspective="provider" onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn small variant="green" icon="checkmark" title="قبول الطلب" style={{ flex: 2 }} onPress={() => { orderAction(item.id, 'accept', me); toast('تم قبول الطلب'); }} />
                    <Btn small variant="danger" icon="close" title="رفض" style={{ flex: 1 }} onPress={() => confirmDialog({ title: 'رفض الطلب؟', danger: true, confirmText: 'رفض', onConfirm: () => { orderAction(item.id, 'reject', me, 'تعذر على المتجر تنفيذ الطلب'); toast('تم رفض الطلب'); } })} />
                  </View>
                )}
                {item.status === 'accepted' && <Btn small icon="bag-check" title="الطلب جاهز للاستلام" onPress={() => { orderAction(item.id, 'ready', me); toast('تم إبلاغ المندوب بجاهزية الطلب'); }} />}
              </OrderCard>
            </Appear>
          )}
        />
      )}
    </View>
  );
}

const MiniStat = ({ icon, label, value }: { icon: string; label: string; value: string | number }) => (
  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 10, gap: 3 }}>
    <Icon name={icon} size={16} color={C.gold} />
    <T w="black" size={15} color="#fff" numberOfLines={1}>{value}</T>
    <T size={10.5} color="#C9D8D2" numberOfLines={1}>{label}</T>
  </View>
);

/* ---------------- Catalog ---------------- */
const EMOJIS = ['🍔', '🍕', '🍗', '🥗', '🍟', '🥤', '🍰', '🥖', '🍅', '🥛', '🧴', '💊', '🩹', '🌡️', '🛒'];

export function ProviderCatalogScreen() {
  const rc = useRC();
  const { db, prov } = useMyProvider();
  const isClinic = prov.type === 'clinic';
  const items = db.products.filter((p) => p.providerId === prov.id);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [emoji, setEmoji] = useState('🍔');
  const [desc, setDesc] = useState('');
  const [slots, setSlots] = useState<string[]>([]);

  const openNew = () => {
    setEditing(null); setName(''); setPrice(''); setCategory(isClinic ? prov.specialty || 'باطنة' : ''); setEmoji(TYPES[prov.type].emoji); setDesc(''); setSlots(['10:00', '10:30', '11:00', '17:00', '17:30', '18:00']);
    setSheet(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p); setName(p.name); setPrice(String(p.price)); setCategory(p.category); setEmoji(p.emoji); setDesc(p.desc); setSlots(p.slots || []);
    setSheet(true);
  };
  const save = () => {
    const pr = Number(price);
    if (name.trim().length < 2) return toast('اكتب الاسم', 'err');
    if (!pr || pr < 0) return toast('اكتب سعراً صحيحاً', 'err');
    if (isClinic && slots.length === 0) return toast('اختر مواعيد الكشف', 'err');
    saveProduct({
      id: editing?.id, providerId: prov.id, kind: isClinic ? 'doctor' : 'item', name: name.trim(), price: pr,
      emoji: isClinic ? '👨‍⚕️' : emoji, category: category.trim() || (isClinic ? 'عام' : 'عام'), desc: desc.trim(),
      available: editing ? editing.available : true, slots: isClinic ? [...slots].sort() : undefined,
    });
    setSheet(false);
    toast(editing ? 'تم تحديث البيانات' : isClinic ? 'تمت إضافة الطبيب' : 'تمت إضافة المنتج');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={isClinic ? 'الأطباء والمواعيد' : 'المنتجات والقائمة'} subtitle={`${items.length} ${isClinic ? 'طبيب' : 'منتج'}`} right={<IconBtn icon="add" bg={C.gold} color={C.dark} onPress={openNew} />} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        refreshControl={rc}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Empty icon="pricetags" title={isClinic ? 'أضف أول طبيب' : 'أضف أول منتج'} text="اضغط على زر + لإضافة عناصر تظهر للعملاء مباشرة" />}
        renderItem={({ item, index }) => (
          <Appear i={index}>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <EmojiBubble emoji={isClinic ? SPEC_EMOJI[item.category] || '👨‍⚕️' : item.emoji} size={52} bg={TYPES[prov.type].soft} />
                <View style={{ flex: 1 }}>
                  <T w="bold" size={14.5}>{item.name}</T>
                  <T size={12} color={C.sub}>{item.category}{isClinic ? ` • ${item.slots?.length || 0} موعد` : ''}</T>
                  <T w="black" size={13.5} color={C.goldDeep}>{money(item.price)}</T>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Toggle value={item.available} onValueChange={(v) => saveProduct({ ...item, available: v })} />
                  <T size={10} color={C.sub}>{item.available ? 'متاح' : 'غير متاح'}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small variant="soft" icon="create" title="تعديل" style={{ flex: 1 }} onPress={() => openEdit(item)} />
                <Btn small variant="soft" icon="trash" title="حذف" style={{ flex: 1 }} onPress={() => confirmDialog({ title: 'حذف العنصر؟', message: item.name, danger: true, confirmText: 'حذف', onConfirm: () => { deleteProduct(item.id); toast('تم الحذف'); } })} />
              </View>
            </Card>
          </Appear>
        )}
      />
      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editing ? 'تعديل' : isClinic ? 'إضافة طبيب' : 'إضافة منتج'}>
        <Field label={isClinic ? 'اسم الطبيب' : 'اسم المنتج'} value={name} onChangeText={setName} icon="pricetag" />
        <Field label={isClinic ? 'رسوم الكشف (ج.م)' : 'السعر (ج.م)'} value={price} onChangeText={setPrice} keyboardType="numeric" icon="cash" />
        {isClinic ? (
          <View style={{ gap: 6 }}>
            <T w="semi" size={13} color={C.dark3}>التخصص</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALTIES.map((s) => <Chip key={s} label={s} active={category === s} onPress={() => setCategory(s)} />)}
            </View>
          </View>
        ) : (
          <>
            <Field label="القسم" value={category} onChangeText={setCategory} icon="folder" placeholder="مثال: برجر، مشروبات، أدوية" />
            <View style={{ gap: 6 }}>
              <T w="semi" size={13} color={C.dark3}>الأيقونة</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EMOJIS.map((e) => (
                  <Pressable key={e} onPress={() => setEmoji(e)} style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: emoji === e ? C.goldSoft : '#F3F4EE', borderWidth: 2, borderColor: emoji === e ? C.gold : 'transparent' }}>
                    <T size={22} align="center">{e}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
        <Field label="وصف" value={desc} onChangeText={setDesc} icon="document-text" />
        {isClinic && (
          <View style={{ gap: 6 }}>
            <T w="semi" size={13} color={C.dark3}>مواعيد الكشف المتاحة</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALL_SLOTS.map((s) => <Chip key={s} label={s} active={slots.includes(s)} onPress={() => setSlots((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))} />)}
            </View>
          </View>
        )}
        <Btn title="حفظ" icon="checkmark" onPress={save} />
      </Sheet>
    </View>
  );
}

/* ---------------- Invoices ---------------- */
export function ProviderInvoicesScreen({ navigation }: any) {
  const rc = useRC();
  const { me, db, prov } = useMyProvider();
  const isClinic = prov.type === 'clinic';
  const list = db.invoices
    .filter((i) => (i.kind === 'booking' ? i.ownerId === me.id : i.parts.some((p) => p.providerId === prov.id)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const amount = (i: (typeof list)[0]) => (i.kind === 'booking' ? i.total : i.parts.filter((p) => p.providerId === prov.id).reduce((s, p) => s + p.subtotal + p.deliveryFee, 0));
  const total = list.reduce((s, i) => s + amount(i), 0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="الفواتير" subtitle={isClinic ? 'فواتير الحجوزات المؤكدة' : 'فواتير الطلبات'}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <MiniStat icon="document-text" label="عدد الفواتير" value={list.length} />
          <MiniStat icon="cash" label="إجمالي الفواتير" value={money(total)} />
        </View>
      </Header>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        refreshControl={rc}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Empty icon="document-text" title="لا توجد فواتير" text={isClinic ? 'تصدر فاتورة الحجز تلقائياً عند قبولك لأي حجز' : 'ستظهر فواتير الطلبات هنا'} />}
        renderItem={({ item, index }) => (
          <Appear i={index}>
            <Card onPress={() => navigation.navigate('Invoice', { id: item.id, providerId: prov.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBubble icon="document-text" color={C.goldDeep} bg={C.goldSoft} />
              <View style={{ flex: 1 }}>
                <T w="bold" size={14.5}>{item.number}</T>
                <T size={12} color={C.sub}>{item.customerName} • {fmtDateTime(item.createdAt)}</T>
                {item.kind === 'booking' && <T size={11.5} color={C.sub}>{item.doctorName}</T>}
              </View>
              <T w="black" size={15}>{money(amount(item))}</T>
            </Card>
          </Appear>
        )}
      />
    </View>
  );
}

/* ---------------- Profile ---------------- */
export function ProviderProfileScreen({ navigation }: any) {
  const { prov, db } = useMyProvider();
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState(prov.name);
  const [desc, setDesc] = useState(prov.desc);
  const [address, setAddress] = useState(prov.address);
  const [fee, setFee] = useState(String(prov.deliveryFee));
  const t = TYPES[prov.type];
  const orders = db.orders.filter((o) => o.providerId === prov.id && o.status === 'delivered');
  const extra = (
    <>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <EmojiBubble emoji={prov.emoji} size={56} bg={t.soft} />
          <View style={{ flex: 1 }}>
            <T w="black" size={16}>{prov.name}</T>
            <T size={12} color={C.sub}>{t.single}{prov.specialty ? ` • ${prov.specialty}` : ''}</T>
          </View>
          <IconBtn icon="create" bg="#EEF1EC" color={C.text} onPress={() => { setName(prov.name); setDesc(prov.desc); setAddress(prov.address); setFee(String(prov.deliveryFee)); setSheet(true); }} />
        </View>
        <T size={12.5} color={C.sub}>{prov.desc}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="location" size={15} color={C.goldDeep} /><T size={12.5}>{prov.address}</T></View>
        {prov.type !== 'clinic' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="bicycle" size={15} color={C.goldDeep} /><T size={12.5}>رسوم التوصيل {money(prov.deliveryFee)}</T></View>}
        <View style={{ height: 1, backgroundColor: C.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T w="bold" size={14}>{prov.open ? 'مفتوح لاستقبال الطلبات' : 'مغلق حالياً'}</T>
            <T size={11.5} color={C.sub}>يظهر للعملاء حسب هذه الحالة</T>
          </View>
          <Toggle value={prov.open} onValueChange={(v) => updateProvider(prov.id, { open: v })} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="checkmark-done" label="طلبات مكتملة" value={orders.length} />
          <Stat icon="star" label="التقييم" value={prov.rating ? prov.rating.toFixed(1) : '—'} color={C.goldDeep} soft={C.goldSoft} />
        </View>
      </Card>
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="بيانات النشاط">
        <Field label="اسم النشاط" value={name} onChangeText={setName} icon="storefront" />
        <Field label="الوصف" value={desc} onChangeText={setDesc} icon="document-text" />
        <Field label="العنوان" value={address} onChangeText={setAddress} icon="location" />
        {prov.type !== 'clinic' && <Field label="رسوم التوصيل (ج.م)" value={fee} onChangeText={setFee} keyboardType="numeric" icon="bicycle" />}
        <Btn title="حفظ" icon="checkmark" onPress={() => {
          if (name.trim().length < 2) return toast('اكتب الاسم', 'err');
          updateProvider(prov.id, { name: name.trim(), desc: desc.trim(), address: address.trim(), deliveryFee: Number(fee) || 0 });
          setSheet(false);
          toast('تم حفظ بيانات النشاط');
        }} />
      </Sheet>
    </>
  );
  return <ProfileScreen navigation={navigation} extra={extra} title="حساب النشاط" />;
}
