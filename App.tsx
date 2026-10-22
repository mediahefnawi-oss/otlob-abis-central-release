import React, { useEffect } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from './lib/theme';
import { initStore, useStore, useMe, availableCouriers } from './lib/store';
import { Overlays, Logo } from './components/ui';
import { TabHost, TabDef } from './components/Tabs';
import { WelcomeScreen, LoginScreen, RegisterScreen, PendingScreen, MaintenanceScreen } from './screens/auth';
import {
  HomeScreen, CategoryScreen, ProviderScreen, CartScreen, CustomOrderScreen, BookingScreen, CustomerOrdersScreen,
} from './screens/customer';
import { OrderDetailScreen, ApptDetailScreen, InvoiceScreen, ChatScreen, SupportScreen, ProfileScreen } from './screens/shared';
import { ProviderOrdersScreen, ProviderCatalogScreen, ProviderInvoicesScreen, ProviderProfileScreen } from './screens/provider';
import { CourierWorkScreen, CourierHistoryScreen, CourierProfileScreen } from './screens/courier';
import {
  AdminDashboardScreen, AdminProvidersScreen, AdminCouriersScreen, AdminOrdersScreen, AdminDetailScreen, AdminSettingsScreen,
} from './screens/admin';

const Stack = createNativeStackNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.gold } };

function Main({ navigation }: any) {
  const me = useMe()!;
  const { db } = useStore();

  let tabs: TabDef[] = [];
  if (me.role === 'customer') {
    const active = db.orders.filter((o) => o.customerId === me.id && ['pending', 'accepted', 'ready', 'on_the_way'].includes(o.status)).length;
    tabs = [
      { key: 'home', label: 'الرئيسية', icon: 'home', render: () => <HomeScreen navigation={navigation} /> },
      { key: 'orders', label: 'طلباتي', icon: 'receipt', badge: active, render: () => <CustomerOrdersScreen navigation={navigation} /> },
      { key: 'support', label: 'الدعم', icon: 'headset', render: () => <SupportScreen navigation={{ canGoBack: () => false }} /> },
      { key: 'profile', label: 'حسابي', icon: 'person', render: () => <ProfileScreen navigation={navigation} /> },
    ];
  } else if (me.role === 'provider') {
    const prov = db.providers.find((p) => p.ownerId === me.id);
    const pending = prov ? (prov.type === 'clinic' ? db.appointments.filter((a) => a.providerId === prov.id && a.status === 'pending').length : db.orders.filter((o) => o.providerId === prov.id && o.status === 'pending').length) : 0;
    const clinic = prov?.type === 'clinic';
    tabs = [
      { key: 'orders', label: clinic ? 'الحجوزات' : 'الطلبات', icon: clinic ? 'calendar' : 'receipt', badge: pending, render: () => <ProviderOrdersScreen navigation={navigation} /> },
      { key: 'catalog', label: clinic ? 'الأطباء' : 'المنتجات', icon: clinic ? 'people' : 'pricetags', render: () => <ProviderCatalogScreen /> },
      { key: 'invoices', label: 'الفواتير', icon: 'document-text', render: () => <ProviderInvoicesScreen navigation={navigation} /> },
      { key: 'support', label: 'الدعم', icon: 'headset', render: () => <SupportScreen navigation={{ canGoBack: () => false }} /> },
      { key: 'profile', label: 'حسابي', icon: 'person', render: () => <ProviderProfileScreen navigation={navigation} /> },
    ];
  } else if (me.role === 'courier') {
    const offers = me.available ? db.orders.filter((o) => !o.courierId && ['accepted', 'ready'].includes(o.status)).length : 0;
    tabs = [
      { key: 'work', label: 'العمل', icon: 'bicycle', badge: offers, render: () => <CourierWorkScreen navigation={navigation} /> },
      { key: 'history', label: 'السجل', icon: 'time', render: () => <CourierHistoryScreen navigation={navigation} /> },
      { key: 'support', label: 'الدعم', icon: 'headset', render: () => <SupportScreen navigation={{ canGoBack: () => false }} /> },
      { key: 'profile', label: 'حسابي', icon: 'person', render: () => <CourierProfileScreen navigation={navigation} /> },
    ];
  } else {
    const pend = db.providers.filter((p) => p.status === 'pending').length;
    const pendC = db.users.filter((u) => u.role === 'courier' && u.status === 'pending').length;
    tabs = [
      { key: 'dash', label: 'الرئيسية', icon: 'stats-chart', render: (go) => <AdminDashboardScreen navigation={navigation} go={go} /> },
      { key: 'orders', label: 'الطلبات', icon: 'receipt', render: () => <AdminOrdersScreen navigation={navigation} /> },
      { key: 'providers', label: 'الخدمات', icon: 'storefront', badge: pend, render: () => <AdminProvidersScreen navigation={navigation} /> },
      { key: 'couriers', label: 'المناديب', icon: 'bicycle', badge: pendC, render: () => <AdminCouriersScreen navigation={navigation} /> },
      { key: 'settings', label: 'الإعدادات', icon: 'settings', render: () => <AdminSettingsScreen navigation={navigation} /> },
    ];
  }
  return <TabHost tabs={tabs} />;
}

function Root() {
  const { db, ready } = useStore();
  const me = useMe();
  const enabled = db.settings.appEnabled;
  const isAdmin = me?.role === 'admin';

  let screens: React.ReactNode;
  if (!enabled && !isAdmin) {
    screens = (
      <>
        <Stack.Screen name="Maintenance">{(p) => <MaintenanceScreen {...p} canLogin />}</Stack.Screen>
        {!me && <Stack.Screen name="Login" component={LoginScreen} />}
      </>
    );
  } else if (!me) {
    screens = (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </>
    );
  } else if (me.status !== 'active') {
    screens = <Stack.Screen name="Pending" component={PendingScreen} />;
  } else {
    screens = (
      <>
        <Stack.Screen name="Main" component={Main} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Provider" component={ProviderScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="CustomOrder" component={CustomOrderScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="ApptDetail" component={ApptDetailScreen} />
        <Stack.Screen name="Invoice" component={InvoiceScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="AdminDetail" component={AdminDetailScreen} />
      </>
    );
  }

  return (
    <NavigationContainer theme={navTheme} direction="rtl">
      <Stack.Navigator key={`${me?.id || 'guest'}-${enabled}-${me?.status}`} screenOptions={{ headerShown: false, animation: 'slide_from_left', contentStyle: { backgroundColor: C.bg } }}>
        {screens}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold,
  });
  const { ready } = useStore();

  useEffect(() => {
    initStore();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.title = 'أطلب أبيس';
      document.body.style.backgroundColor = C.dark;
    }
  }, []);

  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Logo width={240} />
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: C.dark, direction: 'rtl' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: C.bg, overflow: 'hidden' }}>
          <Root />
          <Overlays />
        </View>
      </View>
    </SafeAreaProvider>
  );
}
