import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { C, R } from '../lib/theme';
import { T, Btn, Field, Logo, Icon, Chip, Header, openWhats, toast, Card } from '../components/ui';
import { login, register, logout, useStore, useMe } from '../lib/store';
import { TYPES, SPECIALTIES } from '../lib/format';
import { ProviderType } from '../lib/types';

export function WelcomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <Image source={require('../assets/brand/scene.png')} style={[StyleSheet.absoluteFill, { top: '28%' }]} contentFit="cover" contentPosition="bottom" />
      <LinearGradient colors={[C.dark, 'rgba(0,33,26,0.55)', 'rgba(0,33,26,0.2)', 'rgba(0,33,26,0.92)']} locations={[0, 0.35, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, alignItems: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeIn.duration(700)} style={{ alignItems: 'center' }}>
          <Logo width={280} />
          <T w="bold" size={17} color="#fff" align="center" style={{ marginTop: 6 }}>كل اللي محتاجه في أبيس.. لحد باب بيتك</T>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300)} style={{ flexDirection: 'row', gap: 10, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          {(['restaurant', 'supermarket', 'pharmacy', 'clinic'] as ProviderType[]).map((k) => (
            <View key={k} style={{ alignItems: 'center', gap: 6, width: 72 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: C.gold, backgroundColor: 'rgba(0,33,26,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TYPES[k].icon} size={24} color={C.gold} />
              </View>
              <T w="semi" size={11} color="#fff" align="center">{TYPES[k].label}</T>
            </View>
          ))}
        </Animated.View>
        <View style={{ flex: 1 }} />
        <Animated.View entering={FadeInDown.delay(500)} style={{ alignSelf: 'stretch', gap: 12 }}>
          <Btn title="ابدأ الآن" icon="arrow-back" onPress={() => navigation.navigate('Login')} />
          <Btn title="إنشاء حساب عميل جديد" variant="ghost" onPress={() => navigation.navigate('Register', { role: 'customer' })} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => navigation.navigate('Register', { role: 'provider' })} style={styles.joinBtn}>
              <Icon name="storefront" size={18} color={C.gold} />
              <T w="bold" size={12.5} color="#fff">سجّل كمقدم خدمة</T>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Register', { role: 'courier' })} style={styles.joinBtn}>
              <Icon name="bicycle" size={18} color={C.gold} />
              <T w="bold" size={12.5} color="#fff">انضم كمندوب</T>
            </Pressable>
          </View>
          <Pressable onPress={() => openWhats('01004379508', 'مرحباً، أحتاج مساعدة في تطبيق أطلب أبيس')} style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 6 }}>
            <Icon name="logo-whatsapp" size={18} color="#25D366" />
            <T size={12.5} color="#C9D8D2">دعم فني واتساب: 01004379508 — Eng/Ahmed El-hefnawi</T>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

export function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);

  const submit = async (ph = phone, pw = pass) => {
    setBusy(true);
    setErr('');
    const r = await login(ph, pw);
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else toast(`أهلاً ${r.user.name} 👋`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.dark }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch' }}>
            <Pressable onPress={() => navigation.canGoBack() && navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
          <Logo width={230} />
        </View>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.sheet}>
          <T w="black" size={22}>تسجيل الدخول</T>
          <T color={C.sub} size={13} style={{ marginTop: -6 }}>سجّل دخولك كعميل أو مقدم خدمة أو مندوب أو مدير</T>
          <Field label="رقم الهاتف" icon="call" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01xxxxxxxxx" returnKeyType="next" />
          <View style={{ gap: 6 }}>
            <Field label="كلمة المرور" icon="lock-closed" value={pass} onChangeText={setPass} secureTextEntry={!show} placeholder="••••••" returnKeyType="done" onSubmitEditing={() => submit()} />
            <Pressable onPress={() => setShow(!show)} style={{ alignSelf: 'flex-start' }}>
              <T size={12} color={C.goldDeep} w="semi">{show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}</T>
            </Pressable>
          </View>
          {!!err && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: C.redSoft, padding: 10, borderRadius: 12, alignItems: 'center' }}>
              <Icon name="alert-circle" size={18} color={C.red} />
              <T size={12.5} color={C.red} style={{ flex: 1 }}>{err}</T>
            </View>
          )}
          <Btn title="دخول" loading={busy} onPress={() => submit()} disabled={!phone || !pass} />
          <Pressable onPress={() => navigation.navigate('Register', { role: 'customer' })} style={{ alignItems: 'center' }}>
            <T size={13.5} color={C.sub}>ليس لديك حساب؟ <T w="bold" size={13.5} color={C.goldDeep}>أنشئ حساباً جديداً</T></T>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function RegisterScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<'customer' | 'provider' | 'courier'>(route.params?.role || 'customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [address, setAddress] = useState('');
  const [vehicle, setVehicle] = useState('موتوسيكل');
  const [ptype, setPtype] = useState<ProviderType>('restaurant');
  const [pname, setPname] = useState('');
  const [pdesc, setPdesc] = useState('');
  const [spec, setSpec] = useState('باطنة');
  const [fee, setFee] = useState('15');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const roles = [
    { k: 'customer', l: 'عميل', i: 'person' },
    { k: 'provider', l: 'مقدم خدمة', i: 'storefront' },
    { k: 'courier', l: 'مندوب', i: 'bicycle' },
  ] as const;

  const submit = async () => {
    setBusy(true);
    setErr('');
    const r = await register({
      name, phone, pass, role, address, vehicle,
      provider: role === 'provider' ? { type: ptype, name: pname, desc: pdesc, specialty: ptype === 'clinic' ? spec : undefined, deliveryFee: Number(fee) || 0 } : undefined,
    });
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else toast(role === 'customer' ? 'تم إنشاء حسابك بنجاح 🎉' : 'تم إرسال طلبك للمراجعة من الإدارة');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.dark }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </Pressable>
          <T w="black" size={20} color={C.gold} style={{ flex: 1 }}>إنشاء حساب جديد</T>
        </View>
        <View style={[styles.sheet, { marginTop: 18 }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {roles.map((r) => (
              <Pressable key={r.k} onPress={() => setRole(r.k)} style={[styles.roleBtn, role === r.k && { backgroundColor: C.dark, borderColor: C.dark }]}>
                <Icon name={r.i} size={22} color={role === r.k ? C.gold : C.sub} />
                <T w="bold" size={12.5} color={role === r.k ? '#fff' : C.text} align="center">{r.l}</T>
              </Pressable>
            ))}
          </View>
          {role !== 'customer' && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: C.goldSoft, padding: 10, borderRadius: 12 }}>
              <Icon name="information-circle" size={18} color={C.goldDeep} />
              <T size={12} color={C.goldDeep} style={{ flex: 1 }}>
                {role === 'provider' ? 'سيتم مراجعة طلبك من إدارة التطبيق، وبعد القبول يمكنك إضافة منتجاتك واستقبال الطلبات.' : 'سيتم مراجعة طلبك من الإدارة، وبعد القبول يمكنك العمل واستقبال طلبات التوصيل.'}
              </T>
            </View>
          )}
          <Field label={role === 'provider' ? 'اسم المسؤول' : 'الاسم بالكامل'} icon="person" value={name} onChangeText={setName} placeholder="الاسم" />
          <Field label="رقم الهاتف" icon="call" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01xxxxxxxxx" />
          <Field label="كلمة المرور" icon="lock-closed" value={pass} onChangeText={setPass} secureTextEntry placeholder="6 أحرف على الأقل" />
          <Field label={role === 'provider' ? 'عنوان النشاط' : 'العنوان'} icon="location" value={address} onChangeText={setAddress} placeholder="الحي، الشارع، علامة مميزة" />
          {role === 'courier' && (
            <View style={{ gap: 6 }}>
              <T w="semi" size={13} color={C.dark3}>وسيلة التوصيل</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['موتوسيكل', 'دراجة', 'سيارة'].map((v) => <Chip key={v} label={v} active={vehicle === v} onPress={() => setVehicle(v)} />)}
              </View>
            </View>
          )}
          {role === 'provider' && (
            <>
              <View style={{ gap: 6 }}>
                <T w="semi" size={13} color={C.dark3}>نوع النشاط</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(Object.keys(TYPES) as ProviderType[]).map((k) => <Chip key={k} label={TYPES[k].single} icon={TYPES[k].icon} active={ptype === k} onPress={() => setPtype(k)} />)}
                </View>
              </View>
              <Field label="اسم النشاط التجاري" icon="storefront" value={pname} onChangeText={setPname} placeholder={ptype === 'clinic' ? 'مثال: عيادة د. أحمد' : 'مثال: مطعم الأصيل'} />
              <Field label="وصف مختصر" icon="document-text" value={pdesc} onChangeText={setPdesc} placeholder="نبذة عن نشاطك" />
              {ptype === 'clinic' ? (
                <View style={{ gap: 6 }}>
                  <T w="semi" size={13} color={C.dark3}>التخصص</T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {SPECIALTIES.map((s) => <Chip key={s} label={s} active={spec === s} onPress={() => setSpec(s)} />)}
                  </View>
                </View>
              ) : (
                <Field label="رسوم التوصيل (ج.م)" icon="bicycle" value={fee} onChangeText={setFee} keyboardType="numeric" />
              )}
            </>
          )}
          {!!err && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: C.redSoft, padding: 10, borderRadius: 12, alignItems: 'center' }}>
              <Icon name="alert-circle" size={18} color={C.red} />
              <T size={12.5} color={C.red} style={{ flex: 1 }}>{err}</T>
            </View>
          )}
          <Btn title={role === 'customer' ? 'إنشاء الحساب' : 'إرسال طلب الانضمام'} loading={busy} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function PendingScreen() {
  const me = useMe();
  const { db } = useStore();
  const insets = useSafeAreaInsets();
  if (!me) return null;
  const rejected = me.status === 'rejected' || me.status === 'suspended';
  const prov = db.providers.find((p) => p.ownerId === me.id);
  return (
    <View style={{ flex: 1, backgroundColor: C.dark, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, alignItems: 'center' }}>
      <Logo width={220} />
      <Animated.View entering={FadeInDown} style={[styles.sheet, { marginTop: 30, borderRadius: 28, alignSelf: 'stretch', maxWidth: 480, alignItems: 'center', flex: 0 }]}>
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: rejected ? C.redSoft : C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={rejected ? 'close-circle' : 'hourglass'} size={46} color={rejected ? C.red : C.goldDeep} />
        </View>
        <T w="black" size={20} align="center">{rejected ? (me.status === 'suspended' ? 'تم إيقاف حسابك' : 'تم رفض طلب الانضمام') : 'طلبك قيد المراجعة'}</T>
        <T color={C.sub} align="center" size={13.5}>
          {rejected
            ? 'للاستفسار أو إعادة المراجعة تواصل مع الدعم الفني عبر الواتساب.'
            : `أهلاً ${me.name}، تم استلام طلب تسجيلك${prov ? ` لنشاط "${prov.name}"` : ''} وسيقوم فريق الإدارة بمراجعته وتفعيل حسابك قريباً. سيتم تحديث هذه الصفحة تلقائياً بمجرد القبول.`}
        </T>
        <Btn title="تواصل مع الدعم عبر واتساب" icon="logo-whatsapp" variant="green" full onPress={() => openWhats('01004379508', `مرحباً، أنا ${me.name} وأستفسر عن حالة طلب تسجيلي`)} />
        <Btn title="تسجيل الخروج" variant="soft" full onPress={logout} />
      </Animated.View>
    </View>
  );
}

export function MaintenanceScreen({ navigation, canLogin }: any) {
  const { db } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.dark, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, alignItems: 'center' }}>
      <Logo width={240} />
      <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(242,181,29,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 40, borderWidth: 2, borderColor: C.gold }}>
        <Icon name="construct" size={52} color={C.gold} />
      </View>
      <T w="black" size={24} color="#fff" align="center" style={{ marginTop: 22 }}>التطبيق متوقف مؤقتاً</T>
      <T color="#C9D8D2" align="center" size={14} style={{ marginTop: 8, maxWidth: 380 }}>{db.settings.maintenanceMessage}</T>
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'stretch', maxWidth: 420, gap: 10 }}>
        <Btn title="تواصل مع الدعم الفني" icon="logo-whatsapp" variant="green" onPress={() => openWhats(db.settings.supportPhone)} />
        {me ? <Btn title="تسجيل الخروج" variant="ghost" onPress={logout} /> : canLogin ? <Btn title="دخول الإدارة" variant="ghost" icon="shield-checkmark" onPress={() => navigation.navigate('Login')} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, gap: 14, flex: 1,
    width: '100%', maxWidth: 560, alignSelf: 'center', marginTop: 10,
  },
  joinBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(242,181,29,0.4)' },
  roleBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: R.md, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line },
});
