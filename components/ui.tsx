import React, { ReactNode, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, ActivityIndicator, TextStyle, ViewStyle,
  TextInputProps, Platform, KeyboardAvoidingView, ScrollView, Linking, StyleProp,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { C, R, FONT, shadow } from '../lib/theme';
import { ORDER_STATUS, APPT_STATUS, ACCOUNT_STATUS } from '../lib/format';

/* ---------- text ---------- */
type W = 'regular' | 'semi' | 'bold' | 'black';
export function T({
  children, w = 'regular', size = 14, color = C.text, align, style, numberOfLines, ...rest
}: {
  children?: ReactNode; w?: W; size?: number; color?: string; align?: 'left' | 'right' | 'center';
  style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: FONT[w], fontSize: size, color, textAlign: align || 'right', writingDirection: 'rtl' }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export const Icon = ({ name, size = 20, color = C.text, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) => (
  <Ionicons name={name as any} size={size} color={color} style={style} />
);

export const Logo = ({ width = 180 }: { width?: number }) => (
  <Image source={require('../assets/brand/logo.png')} style={{ width, height: width * (150 / 320) }} contentFit="contain" />
);

/* ---------- toast / confirm (works on web too) ---------- */
type ToastMsg = { id: number; text: string; type: 'ok' | 'err' | 'info' };
type Confirm = { title: string; message?: string; confirmText?: string; danger?: boolean; onConfirm: () => void };
let toastListener: ((t: ToastMsg) => void) | null = null;
let confirmListener: ((c: Confirm) => void) | null = null;
let tid = 0;
export const toast = (text: string, type: ToastMsg['type'] = 'ok') => toastListener?.({ id: ++tid, text, type });
export const confirmDialog = (c: Confirm) => confirmListener?.(c);

export function Overlays() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [conf, setConf] = useState<Confirm | null>(null);
  useEffect(() => {
    toastListener = (t) => {
      setToasts((x) => [...x, t]);
      setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 2600);
    };
    confirmListener = setConf;
    return () => {
      toastListener = null;
      confirmListener = null;
    };
  }, []);
  return (
    <>
      <View pointerEvents="none" style={[styles.toastWrap, { top: insets.top + 10 }]}>
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.duration(220)}
            style={[styles.toast, { backgroundColor: t.type === 'err' ? C.red : t.type === 'info' ? C.dark3 : C.dark }]}
          >
            <Icon name={t.type === 'err' ? 'alert-circle' : 'checkmark-circle'} size={20} color={t.type === 'err' ? '#fff' : C.gold} />
            <T w="semi" color="#fff" size={13} style={{ flex: 1 }}>{t.text}</T>
          </Animated.View>
        ))}
      </View>
      <Modal visible={!!conf} transparent animationType="fade" onRequestClose={() => setConf(null)}>
        <View style={[styles.backdrop, { justifyContent: 'center' }]}>
          <View style={styles.dialog}>
            <T w="bold" size={17} align="center">{conf?.title}</T>
            {!!conf?.message && <T color={C.sub} align="center" style={{ marginTop: 8 }}>{conf.message}</T>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Btn
                title={conf?.confirmText || 'تأكيد'}
                variant={conf?.danger ? 'danger' : 'dark'}
                style={{ flex: 1 }}
                onPress={() => {
                  const f = conf?.onConfirm;
                  setConf(null);
                  f?.();
                }}
              />
              <Btn title="إلغاء" variant="soft" style={{ flex: 1 }} onPress={() => setConf(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ---------- buttons ---------- */
export function Btn({
  title, onPress, variant = 'gold', icon, small, disabled, loading, style, full,
}: {
  title: string; onPress?: () => void; variant?: 'gold' | 'dark' | 'outline' | 'danger' | 'soft' | 'green' | 'ghost';
  icon?: string; small?: boolean; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; full?: boolean;
}) {
  const v = {
    gold: { bg: C.gold, fg: C.dark, bd: C.gold },
    dark: { bg: C.dark, fg: '#fff', bd: C.dark },
    green: { bg: C.green, fg: '#fff', bd: C.green },
    danger: { bg: C.red, fg: '#fff', bd: C.red },
    soft: { bg: '#EEF1EC', fg: C.text, bd: '#EEF1EC' },
    outline: { bg: 'transparent', fg: C.dark, bd: C.dark },
    ghost: { bg: 'transparent', fg: C.gold, bd: C.gold },
  }[variant];
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: v.bg, borderColor: v.bd, borderWidth: 1.5, borderRadius: R.md,
          paddingVertical: small ? 8 : 14, paddingHorizontal: small ? 14 : 20, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Icon name={icon} size={small ? 16 : 19} color={v.fg} /> : null}
      <T w="bold" size={small ? 12.5 : 15} color={v.fg}>{title}</T>
    </Pressable>
  );
}

export const IconBtn = ({ icon, onPress, color = '#fff', bg = 'rgba(255,255,255,0.12)', badge }: { icon: string; onPress?: () => void; color?: string; bg?: string; badge?: number }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}>
    <Icon name={icon} size={20} color={color} />
    {!!badge && (
      <View style={styles.dotBadge}><T w="bold" size={9} color="#fff" align="center">{badge}</T></View>
    )}
  </Pressable>
);

/* ---------- layout ---------- */
export function Header({
  title, subtitle, onBack, right, children,
}: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack && <IconBtn icon="arrow-forward" onPress={onBack} />}
        <View style={{ flex: 1 }}>
          <T w="black" size={19} color={C.gold} numberOfLines={1}>{title}</T>
          {!!subtitle && <T size={12} color="#C9D8D2" numberOfLines={1}>{subtitle}</T>}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export const Screen = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flex: 1, backgroundColor: C.bg }, style]}>{children}</View>
);

export const Card = ({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) => {
  const base = [styles.card, style];
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
        {children}
      </Pressable>
    );
  return <View style={base}>{children}</View>;
};

export const Appear = ({ children, i = 0, style }: { children: ReactNode; i?: number; style?: StyleProp<ViewStyle> }) => (
  <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 45).duration(300)} style={style}>{children}</Animated.View>
);

export const Chip = ({ label, active, onPress, icon, count }: { label: string; active?: boolean; onPress?: () => void; icon?: string; count?: number }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: C.dark, borderColor: C.dark }]}>
    {icon && <Icon name={icon} size={14} color={active ? C.gold : C.sub} />}
    <T w="semi" size={12.5} color={active ? '#fff' : C.text}>{label}</T>
    {count !== undefined && count > 0 && (
      <View style={[styles.cnt, active && { backgroundColor: C.gold }]}>
        <T w="bold" size={10} color={active ? C.dark : '#fff'} align="center">{count}</T>
      </View>
    )}
  </Pressable>
);

export const Pill = ({ label, color, soft, icon }: { label: string; color: string; soft: string; icon?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: soft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
    {icon && <Icon name={icon} size={12} color={color} />}
    <T w="bold" size={11.5} color={color}>{label}</T>
  </View>
);
export const OrderPill = ({ s }: { s: keyof typeof ORDER_STATUS }) => <Pill label={ORDER_STATUS[s].label} color={ORDER_STATUS[s].color} soft={ORDER_STATUS[s].soft} icon={ORDER_STATUS[s].icon} />;
export const ApptPill = ({ s }: { s: keyof typeof APPT_STATUS }) => <Pill label={APPT_STATUS[s].label} color={APPT_STATUS[s].color} soft={APPT_STATUS[s].soft} />;
export const AcctPill = ({ s }: { s: string }) => <Pill label={ACCOUNT_STATUS[s].label} color={ACCOUNT_STATUS[s].color} soft={ACCOUNT_STATUS[s].soft} />;

export const EmojiBubble = ({ emoji, size = 52, bg = C.goldSoft }: { emoji: string; size?: number; bg?: string }) => (
  <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
  </View>
);

export const IconBubble = ({ icon, color, bg, size = 44 }: { icon: string; color: string; bg: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon} size={size * 0.5} color={color} />
  </View>
);

export function Empty({ icon = 'file-tray', title, text }: { icon?: string; title: string; text?: string }) {
  return (
    <Animated.View entering={FadeIn} style={{ alignItems: 'center', padding: 40, gap: 8 }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={38} color={C.goldDeep} />
      </View>
      <T w="bold" size={16} align="center">{title}</T>
      {!!text && <T color={C.sub} align="center" size={13}>{text}</T>}
    </Animated.View>
  );
}

export const Segmented = ({ options, value, onChange }: { options: { key: string; label: string; count?: number }[]; value: string; onChange: (k: string) => void }) => (
  <View style={styles.seg}>
    {options.map((o) => {
      const a = o.key === value;
      return (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, a && { backgroundColor: C.dark }]}>
          <T w="bold" size={13} color={a ? C.gold : C.sub} align="center">{o.label}</T>
          {!!o.count && (
            <View style={[styles.cnt, { backgroundColor: a ? C.gold : C.red }]}>
              <T w="bold" size={10} color={a ? C.dark : '#fff'} align="center">{o.count}</T>
            </View>
          )}
        </Pressable>
      );
    })}
  </View>
);

export const Stepper = ({ qty, onAdd, onSub }: { qty: number; onAdd: () => void; onSub: () => void }) =>
  qty === 0 ? (
    <Pressable onPress={onAdd} style={[styles.stepBtn, { backgroundColor: C.gold }]}>
      <Icon name="add" size={22} color={C.dark} />
    </Pressable>
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.greenSoft, borderRadius: 14, padding: 3 }}>
      <Pressable onPress={onAdd} style={[styles.stepBtn, { backgroundColor: C.green, width: 32, height: 32 }]}>
        <Icon name="add" size={18} color="#fff" />
      </Pressable>
      <T w="bold" size={15} style={{ minWidth: 18 }} align="center">{qty}</T>
      <Pressable onPress={onSub} style={[styles.stepBtn, { backgroundColor: '#fff', width: 32, height: 32 }]}>
        <Icon name={qty === 1 ? 'trash-outline' : 'remove'} size={17} color={qty === 1 ? C.red : C.green} />
      </Pressable>
    </View>
  );

export function Field({ label, icon, ...p }: TextInputProps & { label?: string; icon?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {!!label && <T w="semi" size={13} color={C.dark3}>{label}</T>}
      <View style={[styles.field, focus && { borderColor: C.gold, backgroundColor: '#fff' }, p.multiline && { alignItems: 'flex-start' }]}>
        {icon && <Icon name={icon} size={18} color={focus ? C.goldDeep : C.sub} style={p.multiline ? { marginTop: 12 } : undefined} />}
        <TextInput
          placeholderTextColor="#9AA8A2"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          {...p}
          style={[
            { flex: 1, fontFamily: FONT.regular, fontSize: 14.5, color: C.text, paddingVertical: 12, textAlign: 'right', writingDirection: 'rtl' },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            p.multiline && { minHeight: 90, textAlignVertical: 'top' },
            p.style,
          ]}
        />
      </View>
    </View>
  );
}

export const SearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder: string }) => (
  <View style={styles.search}>
    <Icon name="search" size={19} color={C.sub} />
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#8FA099"
      returnKeyType="search"
      style={[{ flex: 1, fontFamily: FONT.regular, fontSize: 14, color: C.text, paddingVertical: 10, textAlign: 'right' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
    />
    {!!value && (
      <Pressable onPress={() => onChange('')}><Icon name="close-circle" size={18} color={C.sub} /></Pressable>
    )}
  </View>
);

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.line }} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <T w="black" size={18} style={{ flex: 1 }}>{title}</T>
              <IconBtn icon="close" onPress={onClose} color={C.text} bg="#EEF1EC" />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14, paddingBottom: 8 }}>{children}</View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const Row = ({ icon, label, value, color }: { icon?: string; label: string; value: string; color?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
    {icon && <Icon name={icon} size={17} color={C.goldDeep} style={{ marginTop: 3 }} />}
    <T color={C.sub} size={13} style={{ width: 78 }}>{label}</T>
    <T w="semi" size={13.5} style={{ flex: 1 }} color={color || C.text}>{value}</T>
  </View>
);

export const Toggle = ({ value, onValueChange, dark }: { value: boolean; onValueChange: (v: boolean) => void; dark?: boolean }) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    style={{ width: 50, height: 28, borderRadius: 14, padding: 3, backgroundColor: value ? (dark ? C.gold : C.green) : dark ? '#52665F' : '#CBD3CE', alignItems: value ? 'flex-start' : 'flex-end', justifyContent: 'center' }}
  >
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', ...shadow, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 }} />
  </Pressable>
);

export const Stat = ({ icon, label, value, color = C.green, soft = C.greenSoft }: { icon: string; label: string; value: string | number; color?: string; soft?: string }) => (
  <View style={[styles.card, { flex: 1, padding: 12, gap: 6, minWidth: 96 }]}>
    <IconBubble icon={icon} color={color} bg={soft} size={34} />
    <T w="black" size={20}>{value}</T>
    <T size={11.5} color={C.sub}>{label}</T>
  </View>
);

export const SectionTitle = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 6 }}>
    <T w="black" size={17} style={{ flex: 1 }}>{title}</T>
    {action && <Pressable onPress={onAction}><T w="bold" size={12.5} color={C.goldDeep}>{action}</T></Pressable>}
  </View>
);

export const openWhats = (phone: string, text = '') => {
  const p = phone.replace(/^0/, '20');
  Linking.openURL(`https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ''}`).catch(() => {});
};
export const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`).catch(() => {});

const styles = StyleSheet.create({
  header: { backgroundColor: C.dark, paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotBadge: { position: 'absolute', top: -4, left: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 14, ...shadow },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  cnt: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  seg: { flexDirection: 'row', backgroundColor: '#E6EAE3', borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  stepBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F6F7F3', borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, ...shadow, shadowOpacity: 0.06 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,20,15,0.55)', justifyContent: 'flex-end', direction: 'rtl' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center' },
  dialog: { backgroundColor: '#fff', margin: 24, borderRadius: 24, padding: 22, alignSelf: 'center', width: '88%', maxWidth: 400 },
  toastWrap: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 999, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, maxWidth: 440, width: '100%', ...shadow },
});
