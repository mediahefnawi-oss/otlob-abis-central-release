import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { C } from '../lib/theme';
import { T, Icon, Card, Btn, Sheet, Field, Chip, EmojiBubble, Toggle, SectionTitle, Empty, toast, confirmDialog } from './ui';
import { useStore, useMe, saveProduct, deleteProduct, updateProvider, adminCreateProvider } from '../lib/store';
import { TYPES, money, SPECIALTIES, ALL_SLOTS, SPEC_EMOJI } from '../lib/format';
import { Provider, Product, ProviderType } from '../lib/types';

const EMOJIS = ['🍔', '🍕', '🍗', '🥗', '🍟', '🥤', '🍰', '🥖', '🍅', '🥛', '🧴', '💊', '🩹', '🌡️', '🛒'];

/* Add / edit a service (restaurant, supermarket, pharmacy, clinic) */
export function ProviderFormSheet({ visible, onClose, provider, onCreated }: { visible: boolean; onClose: () => void; provider?: Provider; onCreated?: (id: string) => void }) {
  const me = useMe()!;
  const [type, setType] = useState<ProviderType>('restaurant');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('15');
  const [spec, setSpec] = useState('باطنة');
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPass, setMPass] = useState('');

  useEffect(() => {
    if (!visible) return;
    setType(provider?.type || 'restaurant');
    setName(provider?.name || '');
    setDesc(provider?.desc || '');
    setAddress(provider?.address || '');
    setPhone(provider?.phone || '');
    setFee(String(provider?.deliveryFee ?? 15));
    setSpec(provider?.specialty || 'باطنة');
    setMName(''); setMPhone(''); setMPass('');
  }, [visible, provider?.id]);

  const save = () => {
    if (name.trim().length < 2) return toast('اكتب اسم الخدمة', 'err');
    if (provider) {
      updateProvider(provider.id, {
        name: name.trim(), desc: desc.trim(), address: address.trim(), phone: phone.trim() || provider.phone,
        deliveryFee: provider.type === 'clinic' ? 0 : Number(fee) || 0,
        specialty: provider.type === 'clinic' ? spec : provider.specialty,
      });
      toast('تم حفظ التعديلات');
      onClose();
    } else {
      const r = adminCreateProvider(me, { type, name, desc, address, phone, deliveryFee: Number(fee) || 0, specialty: spec, managerName: mName, managerPhone: mPhone, managerPass: mPass });
      if (!r.ok) return toast(r.error, 'err');
      toast('تمت إضافة الخدمة ✅');
      onClose();
      onCreated?.(r.id);
    }
  };
  const t = provider?.type || type;
  return (
    <Sheet visible={visible} onClose={onClose} title={provider ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}>
      {!provider && (
        <View style={{ gap: 6 }}>
          <T w="semi" size={13} color={C.dark3}>نوع الخدمة</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(TYPES) as ProviderType[]).map((k) => <Chip key={k} label={TYPES[k].single} icon={TYPES[k].icon} active={type === k} onPress={() => setType(k)} />)}
          </View>
        </View>
      )}
      <Field label="اسم الخدمة" icon="storefront" value={name} onChangeText={setName} />
      <Field label="الوصف" icon="document-text" value={desc} onChangeText={setDesc} />
      <Field label="العنوان" icon="location" value={address} onChangeText={setAddress} />
      <Field label="هاتف الخدمة" icon="call" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {t === 'clinic' ? (
        <View style={{ gap: 6 }}>
          <T w="semi" size={13} color={C.dark3}>التخصص</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SPECIALTIES.map((s) => <Chip key={s} label={s} active={spec === s} onPress={() => setSpec(s)} />)}
          </View>
        </View>
      ) : (
        <Field label="رسوم التوصيل (ج.م)" icon="bicycle" value={fee} onChangeText={setFee} keyboardType="numeric" />
      )}
      {!provider && (
        <View style={{ gap: 10, backgroundColor: '#F6F7F3', borderRadius: 16, padding: 12 }}>
          <T w="bold" size={13} color={C.goldDeep}>حساب دخول لمسؤول الخدمة (اختياري)</T>
          <T size={11.5} color={C.sub}>اتركه فارغاً لتديرها بنفسك من لوحة المالك.</T>
          <Field label="اسم المسؤول" icon="person" value={mName} onChangeText={setMName} />
          <Field label="هاتف الدخول" icon="call" value={mPhone} onChangeText={setMPhone} keyboardType="phone-pad" />
          <Field label="كلمة المرور" icon="lock-closed" value={mPass} onChangeText={setMPass} secureTextEntry />
        </View>
      )}
      <Btn title={provider ? 'حفظ التعديلات' : 'إضافة الخدمة'} icon="checkmark" onPress={save} />
    </Sheet>
  );
}

/* Add / edit / delete products or doctors of any service */
export function CatalogEditor({ prov }: { prov: Provider }) {
  const { db } = useStore();
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
    setEditing(null); setName(''); setPrice(''); setCategory(isClinic ? prov.specialty || 'باطنة' : ''); setEmoji(TYPES[prov.type].emoji); setDesc('');
    setSlots(['10:00', '10:30', '11:00', '17:00', '17:30', '18:00']);
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
      emoji: isClinic ? '👨‍⚕️' : emoji, category: category.trim() || 'عام', desc: desc.trim(),
      available: editing ? editing.available : true, slots: isClinic ? [...slots].sort() : undefined,
    });
    setSheet(false);
    toast(editing ? 'تم تحديث البيانات' : isClinic ? 'تمت إضافة الطبيب' : 'تمت إضافة المنتج');
  };

  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title={isClinic ? `الأطباء (${items.length})` : `المنتجات (${items.length})`} action="+ إضافة" onAction={openNew} />
      {items.length === 0 && <Empty icon="pricetags" title={isClinic ? 'لا يوجد أطباء' : 'لا توجد منتجات'} text="اضغط + إضافة لإضافة عناصر تظهر للعملاء مباشرة" />}
      {items.map((item) => (
        <Card key={item.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <EmojiBubble emoji={isClinic ? SPEC_EMOJI[item.category] || '👨‍⚕️' : item.emoji} size={48} bg={TYPES[prov.type].soft} />
            <View style={{ flex: 1 }}>
              <T w="bold" size={14}>{item.name}</T>
              <T size={11.5} color={C.sub}>{item.category}{isClinic ? ` • ${item.slots?.length || 0} موعد` : ''}</T>
              <T w="black" size={13} color={C.goldDeep}>{money(item.price)}</T>
            </View>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Toggle value={item.available} onValueChange={(v) => saveProduct({ ...item, available: v })} />
              <T size={10} color={C.sub}>{item.available ? 'متاح' : 'غير متاح'}</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small variant="soft" icon="create" title="تعديل" style={{ flex: 1 }} onPress={() => openEdit(item)} />
            <Btn small variant="soft" icon="trash" title="حذف" style={{ flex: 1 }} onPress={() => confirmDialog({ title: 'حذف العنصر؟', message: item.name, danger: true, confirmText: 'حذف', onConfirm: () => { deleteProduct(item.id); toast('تم الحذف'); } })} />
          </View>
        </Card>
      ))}
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
