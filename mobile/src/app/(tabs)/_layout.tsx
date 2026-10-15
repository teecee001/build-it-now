import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';

type Icon = ComponentProps<typeof Ionicons>['name'];
const tab = (title: string, icon: Icon) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} color={color} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.tap() }}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        // Explicit line height: with the default 10px label and lineHeight "normal" the
        // label box was exactly 10px with overflow hidden, clipping descenders (y, p, g).
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '500', flexShrink: 0 },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={tab('Account', 'grid-outline')} />
      <Tabs.Screen name="crypto" options={tab('Crypto', 'wallet-outline')} />
      <Tabs.Screen name="send" options={tab('Send', 'paper-plane-outline')} />
      <Tabs.Screen name="activity" options={tab('Activity', 'pulse-outline')} />
      <Tabs.Screen name="menu" options={tab('Menu', 'menu-outline')} />
    </Tabs>
  );
}
