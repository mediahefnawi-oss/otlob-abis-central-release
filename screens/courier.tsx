import React, { useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, shadow } from '../lib/theme';
import { T, Icon, Card, Btn, Header, Empty, Segmented, Appear, Stat, confirmDialog, toast, SectionTitle } from '../components/ui';
import { OrderCard } from '../components/Cards';
import { useRC } from './customer';
import { ProfileScreen } from './shared';
import { useStore, useMe, setAvailable, orderAction } from '../lib/store';
import { money, isToday, fmtTime } from '../lib/format';

export function CourierWorkScreen({ navigation }: any) {
  const rc = useRC();
  const { db } = useStore();
  const me = useMe()!;
  const [seg, setSeg] = useState('offers');
  const offers = db.orders.filter((o) => !o.courierId && ['accepted', 'ready'].includes(o.status)).sort((a, b) => b.updatedAt - a.updatedAt);
  const mine = db.orders.filter((o) => o.courierId === me.id && ['accepted', 'ready', 'on_the_way'].includes(o.status)).sort((a, b) => b.updatedAt - a.updatedAt);
  const doneToday = db.orders.filter((o) => o.courierId === me.id && o.status === 'delivered' && isToday(o.updatedAt));
  const earn = doneToday.reduce((s, o) => s + o.deliveryFee, 0);
  const on = !!me.available;

  const toggle = () => {
    if (on && mine.length > 0) return toast('أكمل طلباتك الحالية قبل إيقاف الاستقبال', 'err');
    setAvailable(me.id, !on);
    toast(!on ? 'أنت الآن متاح لاستقبال الطلبات 🟢' : 'تم إيقاف استقبال الطلبات');
  };

  const take = (id: string) => {
    const r = orderAction(id, 'courier_accept', me);
    if (!r.ok) return toast(r.error, 'err');
    toast('تم قبول الطلب ✅');
    setSeg('mine');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="لوحة المندوب" subtitle={`أهلاً ${me.name}`}>
        <Pressable onPress={toggle} style={{ marginTop: 14 }}>
          <LinearGradient colors={on ? ['#16A163', '#0E7A4F'] : ['#3A4C46', '#2A3A35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="power" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <T w="black" size={18} color="#fff">{on ? 'أنت متاح للعمل' : 'أنت غير متاح'}</T>
              <T size={12} color="rgba(255,255,255,0.8)">{on ? `منذ ${fmtTime(me.availableSince || Date.now())} • اضغط للإيقاف` : 'اضغط لتفعيل استقبال الطلبات'}</T>
            </View>
            <View style={{ width: 52, height: 30, borderRadius: 15, backgroundColor: on ? C.gold : 'rgba(255,255,255,0.25)', padding: 3, alignItems: on ? 'flex-start' : 'flex-end' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} />
            </View>
          </LinearGradient>
        </Pressable>
      </Header>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="cash" label="أرباح اليوم" value={money(earn)} color={C.goldDeep} soft={C.goldSoft} />
          <Stat icon="checkmark-done" label="تم تسليمها اليوم" value={doneToday.length} />
          <Stat icon="bicycle" label="جارية الآن" value={mine.length} color={C.orange} soft={C.orangeSoft} />
        </View>
        <Segmented value={seg} onChange={setSeg} options={[{ key: 'offers', label: 'طلبات متاحة', count: on ? offers.length : 0 }, { key: 'mine', label: 'طلباتي الحالية', count: mine.length }]} />
      </View>
      {seg === 'offers' ? (
        <FlatList
          data={on ? offers : []}
          keyExtractor={(o) => o.id}
          refreshControl={rc}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            on ? <Empty icon="radio" title="لا توجد طلبات الآن" text="سيظهر هنا أي طلب جديد فور قبوله من المتجر، ابقَ متاحاً" /> : <Empty icon="power" title="فعّل حالتك للعمل" text="اضغط على زر التشغيل بالأعلى لتظهر لك الطلبات المتاحة" />
          }
          renderItem={({ item, index }) => (
            <Appear i={index}>
              <OrderCard o={item} perspective="courier" onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
                <Btn icon="bicycle" title="قبول الطلب" onPress={() => take(item.id)} />
              </OrderCard>
            </Appear>
          )}
        />
      ) : (
        <FlatList
          data={mine}
          keyExtractor={(o) => o.id}
          refreshControl={rc}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Empty icon="bicycle" title="لا توجد طلبات حالية" text="الطلبات التي تقبلها ستظهر هنا مع أزرار التحديث" />}
          renderItem={({ item, index }) => {
            const isCustom = item.providerType === 'custom';
            return (
              <Appear i={index}>
                <OrderCard o={item} perspective="courier" onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn small variant="dark" icon="chatbubbles" title="شات العميل" style={{ flex: 1 }} onPress={() => navigation.navigate('Chat', { orderId: item.id })} />
                    {item.status === 'accepted' && !isCustom && <Btn small variant="soft" icon="hourglass" title="بانتظار التجهيز" style={{ flex: 1.3 }} disabled />}
                    {(item.status === 'ready' || (isCustom && item.status === 'accepted')) && <Btn small icon="bag-handle" title={isCustom ? 'تم الشراء — في الطريق' : 'استلمت الطلب'} style={{ flex: 1.3 }} onPress={() => { orderAction(item.id, 'pickup', me); toast('الطلب في الطريق للعميل 🚀'); }} />}
                    {item.status === 'on_the_way' && <Btn small variant="green" icon="checkmark-done" title="تم التسليم" style={{ flex: 1.3 }} onPress={() => confirmDialog({ title: 'تأكيد التسليم', message: `هل استلمت ${money(item.total)} كاش من العميل؟`, confirmText: 'تم التسليم', onConfirm: () => { orderAction(item.id, 'deliver', me); toast('تم تسليم الطلب 💚'); } })} />}
                  </View>
                </OrderCard>
              </Appear>
            );
          }}
        />
      )}
    </View>
  );
}

export function CourierHistoryScreen({ navigation }: any) {
  const rc = useRC();
  const { db } = useStore();
  const me = useMe()!;
  const done = db.orders.filter((o) => o.courierId === me.id && o.status === 'delivered').sort((a, b) => b.updatedAt - a.updatedAt);
  const total = done.reduce((s, o) => s + o.deliveryFee, 0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="سجل التوصيل" subtitle="طلباتك المكتملة وأرباحك">
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12 }}>
            <T size={11} color="#C9D8D2">إجمالي الأرباح</T>
            <T w="black" size={20} color={C.gold}>{money(total)}</T>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12 }}>
            <T size={11} color="#C9D8D2">طلبات مكتملة</T>
            <T w="black" size={20} color="#fff">{done.length}</T>
          </View>
        </View>
      </Header>
      <FlatList
        data={done}
        keyExtractor={(o) => o.id}
        refreshControl={rc}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Empty icon="time" title="لا يوجد سجل بعد" text="ستظهر هنا الطلبات التي أتممت توصيلها" />}
        renderItem={({ item, index }) => (
          <Appear i={index}><OrderCard o={item} perspective="courier" onPress={() => navigation.navigate('OrderDetail', { id: item.id })} /></Appear>
        )}
      />
    </View>
  );
}

export function CourierProfileScreen({ navigation }: any) {
  const me = useMe()!;
  const extra = (
    <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Icon name="bicycle" size={26} color={C.goldDeep} />
      <View style={{ flex: 1 }}>
        <T w="bold" size={14}>وسيلة التوصيل: {me.vehicle}</T>
        <T size={12} color={C.sub}>الحالة: {me.available ? 'متاح للعمل' : 'غير متاح'}</T>
      </View>
    </Card>
  );
  return <ProfileScreen navigation={navigation} extra={extra} />;
}
