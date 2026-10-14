import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text } from 'react-native';

import { Card, Screen, ui } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/haptics';
import { biometricLabel, isLockEnabled, setLockEnabled } from '@/lib/lock';
import { C } from '@/lib/theme';
import { openWeb } from '@/lib/web';

// Same labels, grouping and routes as the web app menu (src/components/layout/AppLayout.tsx).
const SECTIONS: { title: string; items: { label: string; path: string }[] }[] = [
  { title: 'Money', items: [
    { label: 'QR Pay', path: '/qr' }, { label: 'Deposit', path: '/deposit' }, { label: 'Savings', path: '/savings' },
    { label: 'Card', path: '/card' }, { label: 'Bills', path: '/bills' },
  ] },
  { title: 'Invest', items: [
    { label: 'Stocks', path: '/stocks' }, { label: 'Markets', path: '/markets' }, { label: 'Forecasts', path: '/forecasts' },
  ] },
  { title: 'More', items: [
    { label: 'Rewards', path: '/rewards' }, { label: 'Refer & Earn', path: '/referrals' }, { label: 'Pro', path: '/premium' },
    { label: 'Settings', path: '/settings' },
  ] },
];

function Row({ label, onPress, right }: { label: string; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
      <Text style={ui.text}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color={C.muted} />}
    </Pressable>
  );
}

export default function Menu() {
  const { signOut } = useAuth();
  const [bio, setBio] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  useEffect(() => {
    biometricLabel().then(setBio);
    isLockEnabled().then(setLock);
  }, []);
  const go = (path: string) => { haptic.tap(); openWeb(path); };

  return (
    <Screen>
      <Card i={0}>
        <Row label="Exo" onPress={() => { haptic.tap(); router.push('/exo'); }} />
      </Card>
      {SECTIONS.map((sec, i) => (
        <Card key={sec.title} i={i + 1}>
          <Text style={s.sec}>{sec.title}</Text>
          {sec.items.map((it) => <Row key={it.path} label={it.label} onPress={() => go(it.path)} />)}
        </Card>
      ))}
      {bio && (
        <Card i={5}>
          <Row
            label={bio}
            right={
              <Switch
                value={lock}
                trackColor={{ true: C.green, false: C.border }}
                onValueChange={async (v) => { if (await setLockEnabled(v)) { haptic.success(); setLock(v); } }}
              />
            }
          />
        </Card>
      )}
      <Card i={6}>
        <Row label="Sign Out" onPress={() => { haptic.light(); signOut(); }} right={<Ionicons name="log-out-outline" size={18} color={C.muted} />} />
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  sec: { color: C.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
});
