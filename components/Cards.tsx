import React from 'react';
import { View } from 'react-native';
import { Provider, Order, Appointment, Invoice } from '../lib/types';
import { C } from '../lib/theme';
import { TYPES, money, fmtDateTime, prettyIso, SPEC_EMOJI } from '../lib/format';
import { Card, T, Icon, EmojiBubble, OrderPill, ApptPill, Pill } from './ui';

export function ProviderCard({ p, onPress }: { p: Provider; onPress: () => void }) {
  const t = TYPES[p.type];
  const closed = !p.open;
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', opacity: closed ? 0.75 : 1 }}>
      <EmojiBubble emoji={p.emoji} size={62} bg={t.soft} />
      <View style={{ flex: 1, gap: 3 }}>
        <T w="bold" size={15.5} numberOfLines={1}>{p.name}</T>
        <T size={12} color={C.sub} numberOfLines={1}>{p.desc}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="star" size={13} color={C.gold} />
            <T w="bold" size={12}>{p.rating ? p.rating.toFixed(1) : 'جديد'}</T>
          </View>
          {p.type === 'clinic' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="pulse" size={13} color={t.color} />
              <T size={12} color={C.sub}>{p.specialty}</T>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="time-outline" size={13} color={C.sub} />
                <T size={12} color={C.sub}>{p.eta} د</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="bicycle" size={14} color={C.sub} />
                <T size={12} color={C.sub}>{p.deliveryFee} ج.م</T>
              </View>
            </>
          )}
        </View>
      </View>
      {closed ? <Pill label="مغلق" color={C.red} soft={C.redSoft} /> : <Icon name="chevron-back" size={18} color={C.sub} />}
    </Card>
  );
}

export function OrderCard({ o, onPress, perspective, children }: { o: Order; onPress: () => void; perspective: 'customer' | 'provider' | 'courier' | 'admin'; children?: React.ReactNode }) {
  const t = o.providerType === 'custom' ? null : TYPES[o.providerType];
  return (
    <Card onPress={onPress} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <EmojiBubble emoji={o.providerType === 'custom' ? '🎁' : t!.emoji} size={44} bg={t ? t.soft : C.goldSoft} />
        <View style={{ flex: 1 }}>
          <T w="bold" size={14.5} numberOfLines={1}>
            {perspective === 'provider' || perspective === 'courier' ? o.customerName : o.providerName}
          </T>
          <T size={11.5} color={C.sub}>طلب #{o.number} • {fmtDateTime(o.createdAt)}</T>
        </View>
        <OrderPill s={o.status} />
      </View>
      <T size={12.5} color={C.sub} numberOfLines={2}>
        {o.customText ? `🎁 ${o.customText}` : o.items.map((i) => `${i.qty}× ${i.name}`).join('، ')}
      </T>
      {(perspective === 'courier' || perspective === 'admin') && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="location" size={14} color={C.goldDeep} />
          <T size={12} style={{ flex: 1 }} numberOfLines={1}>
            {perspective === 'admin' ? `${o.providerName} ← ${o.customerName}` : `من ${o.providerName} إلى ${o.address}`}
          </T>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T w="black" size={15} style={{ flex: 1 }}>{money(perspective === 'courier' ? o.deliveryFee : o.total)}</T>
        {perspective === 'courier' && <T size={11.5} color={C.sub}>عمولة التوصيل</T>}
        {perspective !== 'courier' && o.courierName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="bicycle" size={14} color={C.sub} />
            <T size={11.5} color={C.sub}>{o.courierName}</T>
          </View>
        )}
      </View>
      {children}
    </Card>
  );
}

export function ApptCard({ a, onPress, perspective, children }: { a: Appointment; onPress: () => void; perspective: 'customer' | 'provider' | 'admin'; children?: React.ReactNode }) {
  return (
    <Card onPress={onPress} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <EmojiBubble emoji={SPEC_EMOJI[a.specialty] || '🩺'} size={44} bg="#EFE6FB" />
        <View style={{ flex: 1 }}>
          <T w="bold" size={14.5} numberOfLines={1}>{perspective === 'provider' ? a.patientName : a.doctorName}</T>
          <T size={11.5} color={C.sub} numberOfLines={1}>
            {perspective === 'customer' ? a.clinicName : perspective === 'admin' ? `${a.clinicName} • ${a.patientName}` : a.doctorName} • حجز #{a.number}
          </T>
        </View>
        <ApptPill s={a.status} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="calendar" size={14} color={C.goldDeep} />
          <T size={12.5}>{prettyIso(a.date)}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="time" size={14} color={C.goldDeep} />
          <T size={12.5}>{a.time}</T>
        </View>
        <T w="black" size={14} style={{ flex: 1 }} align="left">{money(a.fee)}</T>
      </View>
      {children}
    </Card>
  );
}

export const invoiceTotalLabel = (i: Invoice) => (i.kind === 'booking' ? 'رسوم الكشف' : 'الإجمالي');
