import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, FlatList, Pressable, Share, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C, R, shadow, FONT } from '../lib/theme';
import {
  T, Icon, Card, Btn, Header, Empty, Row, OrderPill, ApptPill, Pill, IconBubble, EmojiBubble, Sheet, Field, Logo,
  toast, confirmDialog, openWhats, callPhone, IconBtn, SectionTitle, AcctPill,
} from '../components/ui';
import { useStore, useMe, orderAction, apptAction, sendMessage, updateUser, changePassword, logout, updateProvider, setAvailable } from '../lib/store';
import { ORDER_STATUS, TYPES, money, fmtDateTime, fmtDate, prettyIso, SPEC_EMOJI } from '../lib/format';
import { Order, OrderStatus } from '../lib/types';

/* ---------------- Order detail (all roles) ---------------- */
const STEPS: OrderStatus[] = ['pending', 'accepted', 'ready', 'on_the_way', 'delivered'];
const STEP_LABEL: Record<string, string> = { pending: 'تم الطلب', accepted: 'التحضير', ready: 'جاهز', on_the_way: 'في الطريق', delivered: 'تم التسليم' };

export function OrderDetailScreen({ navigation, route }: any) {
  const { db } = useStore();
  const me = useMe()!;
  const o = db.orders.find((x) => x.id === route.params.id);
  if (!o) return <View style={{ flex: 1 }}><Header title="الطلب" onBack={() => navigation.goBack()} /><Empty title="الطلب غير موجود" /></View>;
  const st = ORDER_STATUS[o.status];
  const dead = o.status === 'rejected' || o.status === 'cancelled';
  const idx = STEPS.indexOf(o.status);
  const isCustom = o.providerType === 'custom';
  const courier = o.courierId ? db.users.find((u) => u.id === o.courierId) : null;
  const provider = db.providers.find((p) => p.id === o.providerId);
  const iAmCourier = me.role === 'courier';
  const mine = o.courierId === me.id;

  const act = (a: Parameters<typeof orderAction>[1], reason?: string) => {
    const r = orderAction(o.id, a, me, reason);
    if (!r.ok) toast(r.error, 'err');
    else toast('تم تحديث حالة الطلب');
  };

  const canChat = !!o.courierId && !dead && (me.role === 'admin' || me.id === o.customerId || mine);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`طلب #${o.number}`} subtitle={fmtDateTime(o.createdAt)} onBack={() => navigation.goBack()} right={<OrderPill s={o.status} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* tracking */}
        <Animated.View entering={FadeInDown}>
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconBubble icon={st.icon} color={st.color} bg={st.soft} />
              <View style={{ flex: 1 }}>
                <T w="black" size={17} color={st.color}>{st.label}</T>
                <T size={12} color={C.sub}>
                  {o.status === 'pending' && 'في انتظار موافقة مقدم الخدمة'}
                  {o.status === 'accepted' && (o.courierId ? `المندوب ${o.courierName} في الطريق للتجهيز` : 'جاري البحث عن مندوب متاح...')}
                  {o.status === 'ready' && (o.courierId ? 'المندوب سيستلم الطلب الآن' : 'في انتظار مندوب لاستلام الطلب')}
                  {o.status === 'on_the_way' && 'طلبك في الطريق إليك'}
                  {o.status === 'delivered' && `تم التسليم ${fmtDateTime(o.updatedAt)}`}
                  {dead && (o.rejectReason || '')}
                </T>
              </View>
            </View>
            {!dead && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {STEPS.filter((s) => !(isCustom && s === 'ready')).map((s, i, arr) => {
                  const done = STEPS.indexOf(s) <= idx;
                  return (
                    <View key={s} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                        <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : done ? C.green : C.line }} />
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? C.green : C.line, alignItems: 'center', justifyContent: 'center' }}>
                          {done && <Icon name="checkmark" size={13} color="#fff" />}
                        </View>
                        <View style={{ flex: 1, height: 3, backgroundColor: i === arr.length - 1 ? 'transparent' : STEPS.indexOf(arr[i + 1]) <= idx ? C.green : C.line }} />
                      </View>
                      <T size={10.5} w={done ? 'bold' : 'regular'} color={done ? C.dark : C.sub} align="center" style={{ marginTop: 4 }}>{STEP_LABEL[s]}</T>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* courier */}
        {courier && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBubble icon="bicycle" color={C.orange} bg={C.orangeSoft} />
            <View style={{ flex: 1 }}>
              <T size={11.5} color={C.sub}>المندوب</T>
              <T w="bold" size={15}>{courier.name}</T>
              <T size={12} color={C.sub}>{courier.vehicle}</T>
            </View>
            {me.role !== 'courier' && <IconBtn icon="call" bg={C.greenSoft} color={C.green} onPress={() => callPhone(courier.phone)} />}
          </Card>
        )}

        {/* parties */}
        <Card style={{ gap: 12 }}>
          <T w="black" size={15}>بيانات الطلب</T>
          <Row icon="storefront" label="مقدم الخدمة" value={o.providerName} />
          {provider && <Row icon="location" label="عنوان المتجر" value={provider.address} />}
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Row icon="person" label="اسم العميل" value={o.customerName} />
          <Row icon="call" label="الهاتف" value={o.phone} />
          <Row icon="location" label="العنوان" value={o.address} />
          {!!o.notes && <Row icon="create" label="ملاحظات" value={o.notes} />}
          {me.role !== 'customer' || true ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(me.role !== 'customer') && <Btn small variant="soft" icon="call" title="اتصال بالعميل" style={{ flex: 1 }} onPress={() => callPhone(o.phone)} />}
              {(me.role === 'customer' && provider) && <Btn small variant="soft" icon="call" title="اتصال بالمتجر" style={{ flex: 1 }} onPress={() => callPhone(provider.phone)} />}
            </View>
          ) : null}
        </Card>

        {/* items */}
        <Card style={{ gap: 10 }}>
          <T w="black" size={15}>تفاصيل الطلب</T>
          {isCustom ? (
            <View style={{ backgroundColor: C.goldSoft, borderRadius: 12, padding: 12 }}>
              <T w="semi" size={13.5} color={C.dark3}>🎁 {o.customText}</T>
            </View>
          ) : (
            o.items.map((i) => (
              <View key={i.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T size={20}>{i.emoji}</T>
                <T w="semi" size={13.5} style={{ flex: 1 }}>{i.qty}× {i.name}</T>
                <T w="bold" size={13.5}>{money(i.price * i.qty)}</T>
              </View>
            ))
          )}
          <View style={{ height: 1, backgroundColor: C.line }} />
          {!isCustom && <View style={{ flexDirection: 'row' }}><T color={C.sub} style={{ flex: 1 }}>المجموع</T><T w="bold">{money(o.subtotal)}</T></View>}
          <View style={{ flexDirection: 'row' }}><T color={C.sub} style={{ flex: 1 }}>{isCustom ? 'رسوم الخدمة' : 'التوصيل'}</T><T w="bold">{money(o.deliveryFee)}</T></View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T w="black" size={16} style={{ flex: 1 }}>{isCustom ? 'رسوم التوصيل + ثمن المشتريات' : 'الإجمالي'}</T>
            <T w="black" size={18} color={C.goldDeep}>{isCustom ? `${money(o.total)} +` : money(o.total)}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="cash" size={15} color={C.green} /><T size={12} color={C.green} w="semi">الدفع كاش عند الاستلام</T></View>
        </Card>

        {/* actions */}
        <View style={{ gap: 10 }}>
          {((me.role === 'provider' && o.providerOwnerId === me.id) || me.role === 'admin') && (
            <>
              {o.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn title="قبول الطلب" icon="checkmark" variant="green" style={{ flex: 1 }} onPress={() => act('accept')} />
                  <Btn title="رفض" icon="close" variant="danger" style={{ flex: 1 }} onPress={() => confirmDialog({ title: 'رفض الطلب؟', message: 'سيتم إبلاغ العميل برفض الطلب', danger: true, confirmText: 'رفض', onConfirm: () => act('reject', 'تعذر على المتجر تنفيذ الطلب') })} />
                </View>
              )}
              {o.status === 'accepted' && <Btn title="الطلب جاهز للاستلام" icon="bag-check" onPress={() => act('ready')} />}
            </>
          )}
          {iAmCourier && !o.courierId && ['accepted', 'ready'].includes(o.status) && <Btn title="قبول التوصيل" icon="bicycle" onPress={() => act('courier_accept')} />}
          {iAmCourier && mine && (
            <>
              {(o.status === 'ready' || (isCustom && o.status === 'accepted')) && <Btn title={isCustom ? 'تم شراء الطلب — في الطريق للعميل' : 'استلمت الطلب من المتجر'} icon="bag-handle" onPress={() => act('pickup')} />}
              {!isCustom && o.status === 'accepted' && <Btn title="بانتظار تجهيز الطلب من المتجر" icon="hourglass" variant="soft" disabled />}
              {o.status === 'on_the_way' && <Btn title="تم تسليم الطلب للعميل" icon="checkmark-done" variant="green" onPress={() => confirmDialog({ title: 'تأكيد التسليم', message: `هل استلمت ${money(o.total)} كاش من العميل؟`, confirmText: 'تم التسليم', onConfirm: () => act('deliver') })} />}
            </>
          )}
          {canChat && <Btn title={me.role === 'customer' ? 'محادثة المندوب' : me.role === 'courier' ? 'محادثة العميل' : 'عرض المحادثة'} icon="chatbubbles" variant="dark" onPress={() => navigation.navigate('Chat', { orderId: o.id })} />}
          {me.role === 'customer' && !o.courierId && !dead && o.status !== 'delivered' && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: C.goldSoft, padding: 12, borderRadius: 14, alignItems: 'center' }}>
              <Icon name="chatbubble-ellipses" size={18} color={C.goldDeep} />
              <T size={12} color={C.goldDeep} style={{ flex: 1 }}>سيتم تفعيل الشات مع المندوب فور قبوله لطلبك.</T>
            </View>
          )}
          {(me.role === 'customer' || me.role === 'admin' || me.role === 'provider') && (
            <Btn title="عرض الفاتورة" icon="document-text" variant="outline" onPress={() => navigation.navigate('Invoice', { id: o.invoiceId, providerId: me.role === 'provider' ? o.providerId : undefined })} />
          )}
          {((me.role === 'customer' && o.status === 'pending') || (me.role === 'admin' && !['delivered', 'cancelled', 'rejected'].includes(o.status))) && (
            <Btn title="إلغاء الطلب" icon="close-circle" variant="danger" onPress={() => confirmDialog({ title: 'إلغاء الطلب؟', message: 'لا يمكن التراجع عن الإلغاء', danger: true, confirmText: 'إلغاء الطلب', onConfirm: () => act('cancel') })} />
          )}
          <Btn title="مشكلة في الطلب؟ تواصل مع الدعم" icon="logo-whatsapp" variant="soft" onPress={() => openWhats('01004379508', `مرحباً، أحتاج مساعدة بخصوص الطلب رقم #${o.number}`)} />
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Appointment detail ---------------- */
export function ApptDetailScreen({ navigation, route }: any) {
  const { db } = useStore();
  const me = useMe()!;
  const a = db.appointments.find((x) => x.id === route.params.id);
  if (!a) return <View style={{ flex: 1 }}><Header title="الحجز" onBack={() => navigation.goBack()} /><Empty title="الحجز غير موجود" /></View>;
  const isOwner = (me.role === 'provider' && a.clinicOwnerId === me.id) || me.role === 'admin';
  const act = (x: 'confirm' | 'reject' | 'complete' | 'cancel', msg: string) => {
    apptAction(a.id, x);
    toast(msg);
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`حجز #${a.number}`} subtitle={fmtDateTime(a.createdAt)} onBack={() => navigation.goBack()} right={<ApptPill s={a.status} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
          <EmojiBubble emoji={SPEC_EMOJI[a.specialty] || '🩺'} size={72} bg="#EFE6FB" />
          <T w="black" size={18} align="center">{a.doctorName}</T>
          <T color={C.sub} align="center" size={13}>{a.specialty} • {a.clinicName}</T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <View style={{ backgroundColor: C.goldSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Icon name="calendar" size={16} color={C.goldDeep} /><T w="bold" size={13}>{prettyIso(a.date)}</T>
            </View>
            <View style={{ backgroundColor: C.goldSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Icon name="time" size={16} color={C.goldDeep} /><T w="bold" size={13}>{a.time}</T>
            </View>
          </View>
        </Card>
        <Card style={{ gap: 12 }}>
          <T w="black" size={15}>بيانات الحجز</T>
          <Row icon="person" label="المريض" value={a.patientName} />
          <Row icon="call" label="الهاتف" value={a.phone} />
          <Row icon="pulse" label="العيادة" value={a.clinicName} />
          <Row icon="location" label="العنوان" value={a.clinicAddress} />
          <Row icon="cash" label="رسوم الكشف" value={money(a.fee)} color={C.goldDeep} />
          {!!a.notes && <Row icon="create" label="ملاحظات" value={a.notes} />}
        </Card>
        {a.status === 'pending' && me.role === 'customer' && <T size={12.5} color={C.sub} align="center">بانتظار تأكيد العيادة، وستصلك فاتورة الحجز فور القبول.</T>}
        <View style={{ gap: 10 }}>
          {isOwner && a.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn title="قبول الحجز" icon="checkmark" variant="green" style={{ flex: 1 }} onPress={() => act('confirm', 'تم قبول الحجز وإنشاء الفاتورة ✅')} />
              <Btn title="رفض" icon="close" variant="danger" style={{ flex: 1 }} onPress={() => confirmDialog({ title: 'رفض الحجز؟', danger: true, confirmText: 'رفض', onConfirm: () => act('reject', 'تم رفض الحجز') })} />
            </View>
          )}
          {isOwner && a.status === 'confirmed' && <Btn title="تمت الزيارة" icon="checkmark-done" onPress={() => act('complete', 'تم تسجيل الزيارة')} />}
          {a.invoiceId && <Btn title="عرض فاتورة الحجز" icon="document-text" variant="dark" onPress={() => navigation.navigate('Invoice', { id: a.invoiceId })} />}
          {(me.id === a.customerId || me.role === 'admin') && ['pending', 'confirmed'].includes(a.status) && (
            <Btn title="إلغاء الحجز" icon="close-circle" variant="danger" onPress={() => confirmDialog({ title: 'إلغاء الحجز؟', danger: true, confirmText: 'إلغاء', onConfirm: () => act('cancel', 'تم إلغاء الحجز') })} />
          )}
          {me.role !== 'provider' && <Btn title="اتصال بالعيادة" icon="call" variant="soft" onPress={() => callPhone(db.providers.find((p) => p.id === a.providerId)?.phone || '')} />}
          {isOwner && <Btn title="اتصال بالمريض" icon="call" variant="soft" onPress={() => callPhone(a.phone)} />}
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Invoice ---------------- */
export function InvoiceScreen({ navigation, route }: any) {
  const { db } = useStore();
  const me = useMe()!;
  const inv = db.invoices.find((i) => i.id === route.params.id);
  const onlyProvider: string | undefined = route.params.providerId;
  if (!inv) return <View style={{ flex: 1 }}><Header title="الفاتورة" onBack={() => navigation.goBack()} /><Empty title="الفاتورة غير موجودة" /></View>;
  const parts = onlyProvider ? inv.parts.filter((p) => p.providerId === onlyProvider) : inv.parts;
  const total = inv.kind === 'booking' ? inv.total : parts.reduce((s, p) => s + p.subtotal + p.deliveryFee, 0);
  const appt = inv.appointmentId ? db.appointments.find((a) => a.id === inv.appointmentId) : null;

  const text = () => {
    const lines = [`🧾 فاتورة ${inv.number} — أطلب أبيس`, `العميل: ${inv.customerName}`, `الهاتف: ${inv.phone}`, `العنوان: ${inv.address}`, ''];
    if (inv.kind === 'booking') {
      lines.push(`العيادة: ${inv.clinicName}`, `الدكتور: ${inv.doctorName} (${inv.specialty})`, `الموعد: ${prettyIso(inv.date!)} - ${inv.time}`, `رسوم الكشف: ${money(inv.fee!)}`);
    } else {
      parts.forEach((p) => {
        lines.push(`🏪 ${p.providerName}`);
        if (p.customText) lines.push(`  • ${p.customText}`);
        p.items.forEach((i) => lines.push(`  • ${i.qty}× ${i.name} = ${money(i.price * i.qty)}`));
        lines.push(`  التوصيل: ${money(p.deliveryFee)}`, '');
      });
      lines.push(`الإجمالي: ${money(total)}`);
    }
    return lines.join('\n');
  };
  const share = async () => {
    try {
      await Share.share({ message: text() });
    } catch {
      toast('تعذرت المشاركة', 'err');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={inv.kind === 'booking' ? 'فاتورة حجز' : 'فاتورة الطلب'} subtitle={inv.number} onBack={() => navigation.goBack()} right={<IconBtn icon="share-social" onPress={share} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInDown} style={{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', ...shadow, alignSelf: 'center', width: '100%', maxWidth: 560 }}>
          <LinearGradient colors={[C.dark, C.dark3]} style={{ padding: 18, alignItems: 'center', gap: 4 }}>
            <Logo width={190} />
            <T size={12} color="#C9D8D2" align="center">كل اللي محتاجه في أبيس.. لحد باب بيتك</T>
          </LinearGradient>
          <View style={{ height: 4, backgroundColor: C.gold }} />
          <View style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <T size={11.5} color={C.sub}>رقم الفاتورة</T>
                <T w="black" size={18}>{inv.number}</T>
              </View>
              <View>
                <T size={11.5} color={C.sub} align="left">التاريخ</T>
                <T w="bold" size={13} align="left">{fmtDateTime(inv.createdAt)}</T>
              </View>
            </View>

            <View style={{ backgroundColor: '#F6F7F3', borderRadius: 16, padding: 14, gap: 10 }}>
              <T w="black" size={13.5} color={C.goldDeep}>{inv.kind === 'booking' ? 'بيانات المريض' : 'بيانات العميل'}</T>
              <Row icon="person" label={inv.kind === 'booking' ? 'اسم المريض' : 'اسم العميل'} value={inv.customerName} />
              <Row icon="location" label="العنوان" value={inv.address} />
              <Row icon="call" label="رقم الهاتف" value={inv.phone} />
            </View>

            {inv.kind === 'booking' ? (
              <View style={{ borderWidth: 1.5, borderColor: C.line, borderRadius: 16, padding: 14, gap: 10 }}>
                <T w="black" size={13.5} color={C.goldDeep}>تفاصيل الحجز</T>
                <Row icon="pulse" label="العيادة" value={inv.clinicName!} />
                <Row icon="person" label="الطبيب" value={`${inv.doctorName} — ${inv.specialty}`} />
                <Row icon="calendar" label="الموعد" value={`${prettyIso(inv.date!)} • ${inv.time}`} />
                {appt && <Row icon="flag" label="حالة الحجز" value={appt.status === 'completed' ? 'تمت الزيارة' : appt.status === 'confirmed' ? 'مؤكد' : appt.status === 'cancelled' ? 'ملغي' : appt.status} />}
                <View style={{ height: 1, backgroundColor: C.line }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T w="black" size={16} style={{ flex: 1 }}>رسوم الكشف</T>
                  <T w="black" size={19} color={C.goldDeep}>{money(inv.fee!)}</T>
                </View>
              </View>
            ) : (
              <>
                <T w="black" size={14.5}>الفاتورة مقسمة حسب مقدم الخدمة</T>
                {parts.map((p, idx) => {
                  const o = db.orders.find((x) => x.id === p.orderId);
                  const t = p.providerType === 'custom' ? null : TYPES[p.providerType];
                  return (
                    <View key={p.orderId} style={{ borderWidth: 1.5, borderColor: C.line, borderRadius: 16, overflow: 'hidden' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t ? t.soft : C.goldSoft, padding: 12 }}>
                        <T size={22}>{t ? t.emoji : '🎁'}</T>
                        <View style={{ flex: 1 }}>
                          <T w="bold" size={14}>{idx + 1}. {p.providerName}</T>
                          <T size={11.5} color={C.sub}>{t ? t.single : 'طلب خاص'}</T>
                        </View>
                        {o && <Pressable onPress={() => navigation.navigate('OrderDetail', { id: o.id })}><View><Pill label={ORDER_STATUS[o.status].label} color={ORDER_STATUS[o.status].color} soft="#fff" /></View></Pressable>}
                      </View>
                      <View style={{ padding: 12, gap: 8 }}>
                        {p.customText && <T size={13} color={C.dark3}>🎁 {p.customText}</T>}
                        {p.items.map((i) => (
                          <View key={i.productId} style={{ flexDirection: 'row' }}>
                            <T size={13} style={{ flex: 1 }}>{i.qty}× {i.name}</T>
                            <T w="semi" size={13}>{money(i.price * i.qty)}</T>
                          </View>
                        ))}
                        <View style={{ height: 1, backgroundColor: C.line }} />
                        {p.providerType !== 'custom' && <View style={{ flexDirection: 'row' }}><T size={12.5} color={C.sub} style={{ flex: 1 }}>المجموع</T><T w="semi" size={12.5}>{money(p.subtotal)}</T></View>}
                        <View style={{ flexDirection: 'row' }}><T size={12.5} color={C.sub} style={{ flex: 1 }}>التوصيل</T><T w="semi" size={12.5}>{money(p.deliveryFee)}</T></View>
                        <View style={{ flexDirection: 'row' }}><T w="bold" size={13.5} style={{ flex: 1 }}>إجمالي {p.providerName}</T><T w="black" size={14}>{money(p.subtotal + p.deliveryFee)}</T></View>
                      </View>
                    </View>
                  );
                })}
                <View style={{ backgroundColor: C.dark, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                  <T w="black" size={16} color={C.gold} style={{ flex: 1 }}>الإجمالي المطلوب</T>
                  <T w="black" size={21} color={C.gold}>{money(total)}</T>
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenSoft, padding: 12, borderRadius: 14 }}>
              <Icon name="cash" size={18} color={C.green} />
              <T w="semi" size={12.5} color={C.green} style={{ flex: 1 }}>{inv.kind === 'booking' ? 'تُدفع رسوم الكشف في العيادة عند الزيارة' : 'طريقة الدفع: كاش عند الاستلام'}</T>
            </View>
            <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
              <T w="bold" size={13} align="center">شكراً لاختيارك أطلب أبيس 💚</T>
              <T size={11.5} color={C.sub} align="center">الدعم الفني واتساب: 01004379508 — Eng/Ahmed El-hefnawi</T>
            </View>
          </View>
        </Animated.View>
        <View style={{ gap: 10, marginTop: 14, alignSelf: 'center', width: '100%', maxWidth: 560 }}>
          <Btn title="مشاركة الفاتورة" icon="share-social" onPress={share} />
          <Btn title="إرسال عبر واتساب" icon="logo-whatsapp" variant="green" onPress={() => openWhats(inv.phone, text())} />
          <Btn title="رجوع" variant="soft" onPress={() => (navigation.canGoBack() ? navigation.goBack() : null)} />
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Chat ---------------- */
export function ChatScreen({ navigation, route }: any) {
  const { db } = useStore();
  const me = useMe()!;
  const insets = useSafeAreaInsets();
  const o = db.orders.find((x) => x.id === route.params.orderId);
  const [text, setText] = useState('');
  if (!o) return <Empty title="غير موجود" />;
  const msgs = db.messages.filter((m) => m.orderId === o.id).sort((a, b) => b.createdAt - a.createdAt);
  const other = me.role === 'courier' ? `${o.customerName} (العميل)` : me.role === 'customer' ? `${o.courierName || 'المندوب'} (المندوب)` : `${o.customerName} ↔ ${o.courierName || '—'}`;
  const canWrite = me.role !== 'admin' && !['delivered', 'cancelled', 'rejected'].includes(o.status);
  const quick = me.role === 'courier' ? ['أنا في الطريق إليك', 'وصلت أمام العنوان', 'ممكن توضح العنوان أكتر؟'] : ['أنا في انتظارك', 'العنوان بجوار المسجد', 'من فضلك اتصل بي عند الوصول'];

  const send = (t = text) => {
    if (!t.trim()) return;
    sendMessage(o.id, t, me);
    setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ECEFE8' }}>
      <Header title={other} subtitle={`شات طلب #${o.number}`} onBack={() => navigation.goBack()} right={me.role !== 'admin' ? <IconBtn icon="call" onPress={() => callPhone(me.role === 'courier' ? o.phone : db.users.find((u) => u.id === o.courierId)?.phone || '')} /> : undefined} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          inverted
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 14, gap: 8 }}
          ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }] }}><Empty icon="chatbubbles" title="ابدأ المحادثة" text="تواصل مباشرة مع الطرف الآخر بخصوص تفاصيل التوصيل" /></View>}
          renderItem={({ item: m }) => {
            if (m.senderRole === 'system')
              return (
                <View style={{ alignSelf: 'center', backgroundColor: 'rgba(0,33,26,0.08)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '88%' }}>
                  <T size={11.5} color={C.dark3} align="center">{m.text}</T>
                </View>
              );
            const mineMsg = m.senderId === me.id;
            return (
              <View style={{ alignSelf: mineMsg ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                <View style={{ backgroundColor: mineMsg ? C.gold : '#fff', borderRadius: 18, borderTopRightRadius: mineMsg ? 4 : 18, borderTopLeftRadius: mineMsg ? 18 : 4, paddingHorizontal: 14, paddingVertical: 9, ...shadow, shadowOpacity: 0.05 }}>
                  {!mineMsg && <T w="bold" size={10.5} color={C.goldDeep}>{m.senderName}</T>}
                  <T size={14} color={C.dark}>{m.text}</T>
                  <T size={9.5} color={mineMsg ? C.dark3 : C.sub} align="left" style={{ marginTop: 2 }}>{new Date(m.createdAt).getHours() % 12 || 12}:{String(new Date(m.createdAt).getMinutes()).padStart(2, '0')}</T>
                </View>
              </View>
            );
          }}
        />
        {canWrite ? (
          <View style={{ backgroundColor: '#fff', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 12, gap: 8 }}>
            <FlatList horizontal data={quick} keyExtractor={(x) => x} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} renderItem={({ item }) => (
              <Pressable onPress={() => send(item)} style={{ backgroundColor: C.goldSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}><T size={12} w="semi" color={C.dark3}>{item}</T></Pressable>
            )} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="اكتب رسالتك..."
                placeholderTextColor="#9AA8A2"
                onSubmitEditing={() => send()}
                returnKeyType="send"
                style={[{ flex: 1, backgroundColor: '#F3F4EE', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontFamily: FONT.regular, fontSize: 14, textAlign: 'right' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
              />
              <Pressable onPress={() => send()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? C.dark : '#C9D1CC', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="send" size={19} color={C.gold} style={{ transform: [{ scaleX: -1 }] }} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: '#fff', padding: 14, paddingBottom: Math.max(insets.bottom, 14) }}>
            <T size={12.5} color={C.sub} align="center">{me.role === 'admin' ? 'وضع المراقبة — عرض فقط' : 'تم إغلاق المحادثة بعد انتهاء الطلب'}</T>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------------- Support ---------------- */
const FAQ = [
  { q: 'كيف أتابع طلبي؟', a: 'من تبويب "طلباتي" اضغط على الطلب لمشاهدة حالته لحظة بلحظة، وتواصل مع المندوب عبر الشات الداخلي.' },
  { q: 'ما طرق الدفع المتاحة؟', a: 'الدفع كاش عند الاستلام للطلبات، وتُدفع رسوم الكشف في العيادة عند الزيارة.' },
  { q: 'كيف أحجز عند دكتور؟', a: 'من الرئيسية اختر "حجز العيادات" ثم الدكتور واليوم والميعاد. بعد تأكيد العيادة تصلك فاتورة الحجز.' },
  { q: 'كيف أنضم كمقدم خدمة أو مندوب؟', a: 'من شاشة البداية اختر "سجّل كمقدم خدمة" أو "انضم كمندوب" وستتم مراجعة طلبك من الإدارة.' },
];
export function SupportScreen({ navigation }: any) {
  const me = useMe();
  const [open, setOpen] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="الدعم الفني" subtitle="نحن هنا لمساعدتك على مدار الساعة" onBack={navigation?.canGoBack?.() && navigation.getState?.().routes?.length > 1 ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 22 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="logo-whatsapp" size={44} color="#fff" />
          </View>
          <T w="black" size={18} align="center">الدعم عبر واتساب</T>
          <T w="bold" size={15} color={C.dark3} align="center">Eng/Ahmed El-hefnawi — أحمد حفناوي</T>
          <T w="black" size={24} color={C.goldDeep} align="center">01004379508</T>
          <Btn title="ابدأ محادثة واتساب" icon="logo-whatsapp" variant="green" full onPress={() => openWhats('01004379508', `مرحباً، أحتاج مساعدة في تطبيق أطلب أبيس${me ? ` (${me.name})` : ''}`)} />
          <Btn title="اتصال هاتفي" icon="call" variant="soft" full onPress={() => callPhone('01004379508')} />
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[{ i: 'cash', t: 'دفع كاش عند الاستلام' }, { i: 'flash', t: 'توصيل سريع' }, { i: 'location', t: 'متابعة لحظية' }, { i: 'headset', t: 'دعم على مدار الساعة' }].map((f) => (
            <View key={f.t} style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: C.dark, borderRadius: 16, padding: 10 }}>
              <Icon name={f.i} size={22} color={C.gold} />
              <T w="semi" size={10.5} color="#fff" align="center">{f.t}</T>
            </View>
          ))}
        </View>
        <SectionTitle title="أسئلة شائعة" />
        {FAQ.map((f, i) => (
          <Card key={f.q} onPress={() => setOpen(open === i ? -1 : i)} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T w="bold" size={14} style={{ flex: 1 }}>{f.q}</T>
              <Icon name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={C.sub} />
            </View>
            {open === i && <T size={13} color={C.sub}>{f.a}</T>}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

/* ---------------- Profile (all roles) ---------------- */
export function ProfileScreen({ navigation, extra, title = 'حسابي' }: { navigation: any; extra?: React.ReactNode; title?: string }) {
  const me = useMe()!;
  const { db } = useStore();
  const [edit, setEdit] = useState(false);
  const [pw, setPw] = useState(false);
  const [name, setName] = useState(me.name);
  const [address, setAddress] = useState(me.address);
  const [o, setO] = useState('');
  const [n, setN] = useState('');
  const roleLabel = { customer: 'عميل', provider: 'مقدم خدمة', courier: 'مندوب توصيل', admin: 'مدير التطبيق' }[me.role];

  const Item = ({ icon, label, onPress, danger, sub }: { icon: string; label: string; onPress: () => void; danger?: boolean; sub?: string }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
      <IconBubble icon={icon} color={danger ? C.red : C.dark3} bg={danger ? C.redSoft : C.greenSoft} size={38} />
      <View style={{ flex: 1 }}>
        <T w="semi" size={14.5} color={danger ? C.red : C.text}>{label}</T>
        {!!sub && <T size={11.5} color={C.sub}>{sub}</T>}
      </View>
      <Icon name="chevron-back" size={17} color={C.sub} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={title}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' }}>
            <T w="black" size={28} color={C.dark} align="center">{me.name.trim()[0]}</T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T w="black" size={18} color="#fff">{me.name}</T>
            <T size={13} color="#C9D8D2">{me.phone}</T>
            <View style={{ flexDirection: 'row' }}><Pill label={roleLabel} color={C.dark} soft={C.gold} /></View>
          </View>
        </View>
      </Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {extra}
        <Card style={{ paddingVertical: 4 }}>
          <Item icon="create" label="تعديل البيانات الشخصية" sub={me.address || 'أضف عنوانك'} onPress={() => { setName(me.name); setAddress(me.address); setEdit(true); }} />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Item icon="key" label="تغيير كلمة المرور" onPress={() => setPw(true)} />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Item icon="logo-whatsapp" label="الدعم الفني واتساب" sub="01004379508 — أحمد حفناوي" onPress={() => openWhats('01004379508', `مرحباً، أنا ${me.name}`)} />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Item icon="log-out" label="تسجيل الخروج" danger onPress={() => confirmDialog({ title: 'تسجيل الخروج', message: 'هل تريد تسجيل الخروج من حسابك؟', confirmText: 'خروج', danger: true, onConfirm: logout })} />
        </Card>
        <View style={{ alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Logo width={120} />
          <T size={11} color={C.sub} align="center">أطلب أبيس • الإصدار 1.0.0</T>
        </View>
      </ScrollView>

      <Sheet visible={edit} onClose={() => setEdit(false)} title="تعديل البيانات">
        <Field label="الاسم" icon="person" value={name} onChangeText={setName} />
        <Field label="العنوان" icon="location" value={address} onChangeText={setAddress} multiline />
        <Btn title="حفظ" icon="checkmark" onPress={() => {
          if (name.trim().length < 3) return toast('اكتب الاسم بالكامل', 'err');
          updateUser(me.id, { name: name.trim(), address: address.trim() });
          setEdit(false);
          toast('تم حفظ البيانات');
        }} />
      </Sheet>
      <Sheet visible={pw} onClose={() => setPw(false)} title="تغيير كلمة المرور">
        <Field label="كلمة المرور الحالية" icon="lock-closed" value={o} onChangeText={setO} secureTextEntry />
        <Field label="كلمة المرور الجديدة" icon="key" value={n} onChangeText={setN} secureTextEntry />
        <Btn title="تغيير" onPress={() => {
          const r = changePassword(me.id, o, n);
          if (!r.ok) return toast(r.error, 'err');
          setO(''); setN(''); setPw(false);
          toast('تم تغيير كلمة المرور');
        }} />
      </Sheet>
    </View>
  );
}
