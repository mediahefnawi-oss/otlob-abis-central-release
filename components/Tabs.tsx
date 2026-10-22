import React, { ReactNode, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, shadow } from '../lib/theme';
import { T, Icon } from './ui';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
  badge?: number;
  render: (go: (k: string) => void) => ReactNode;
}

export function TabHost({ tabs, initial }: { tabs: TabDef[]; initial?: string }) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(initial || tabs[0].key);
  const [visited, setVisited] = useState<string[]>([initial || tabs[0].key]);
  const go = (k: string) => {
    setActive(k);
    setVisited((v) => (v.includes(k) ? v : [...v, k]));
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {tabs.map((t) =>
          visited.includes(t.key) ? (
            <View key={t.key} style={{ flex: 1, display: t.key === active ? 'flex' : 'none' }}>
              {t.render(go)}
            </View>
          ) : null
        )}
      </View>
      <View
        style={{
          flexDirection: 'row', backgroundColor: '#fff', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8),
          borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow, shadowOffset: { width: 0, height: -3 }, paddingHorizontal: 6,
        }}
      >
        {tabs.map((t) => {
          const a = t.key === active;
          return (
            <Pressable key={t.key} onPress={() => go(t.key)} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 }}>
              <View
                style={{
                  width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: a ? C.dark : 'transparent',
                }}
              >
                <Icon name={a ? t.icon : t.icon + '-outline'} size={20} color={a ? C.gold : C.sub} />
                {!!t.badge && (
                  <View style={{ position: 'absolute', top: -3, right: 2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <T w="bold" size={9.5} color="#fff" align="center">{t.badge}</T>
                  </View>
                )}
              </View>
              <T w={a ? 'bold' : 'semi'} size={10.5} color={a ? C.dark : C.sub} align="center">{t.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
