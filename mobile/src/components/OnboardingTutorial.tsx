// Port of src/components/OnboardingTutorial.tsx: same scenes, storage keys, account metadata and
// reset event. Scene visuals are a native icon stage (the web's per-scene DOM mockups are not ported).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, IconName, k } from '@/components/kit';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { C } from '@/lib/theme';

const STORAGE_KEY = 'exosky-onboarding-complete';
const METADATA_KEY = 'onboarding_complete';
const listeners = new Set<() => void>();

type Scene = { id: string; icon: IconName; title: string; subtitle: string; description: string; tip: string; route: Href; accentColor: string; duration: number };
export const SCENES: Scene[] = [
  { id: 'intro', icon: 'wallet-outline', title: 'Your Wallet', subtitle: 'Everything starts here', description: 'View balances across multiple currencies, track spending, and manage all your money in one unified dashboard.', tip: 'Tap your balance to toggle visibility for privacy.', route: '/', accentColor: '142 71% 45%', duration: 5000 },
  { id: 'deposit', icon: 'business-outline', title: 'Direct Deposit', subtitle: 'Get paid faster', description: 'Set up direct deposit with your unique routing and account numbers. Funds arrive instantly — no waiting.', tip: 'Share your deposit details with your employer to get started.', route: '/deposit', accentColor: '217 91% 60%', duration: 4500 },
  { id: 'card', icon: 'card-outline', title: 'ExoSky Card', subtitle: 'Premium metal design', description: 'Your sleek metal card for everyday spending. Earn 1% cashback on everything, freeze instantly, and control limits.', tip: 'Freeze or unfreeze your card in one tap from the Card page.', route: '/card', accentColor: '280 73% 58%', duration: 5000 },
  { id: 'send', icon: 'paper-plane-outline', title: 'Send Money', subtitle: 'Instant & free', description: 'Send money to anyone worldwide using their handle, email, or QR code — with zero fees and instant delivery.', tip: 'Use QR Pay for quick in-person payments.', route: '/send', accentColor: '25 95% 53%', duration: 4500 },
  { id: 'markets', icon: 'trending-up-outline', title: 'Markets', subtitle: 'Crypto & stocks', description: 'Trade Bitcoin, Ethereum, Tesla, Apple and 100+ assets with real-time charts, alerts, and fractional shares.', tip: 'Set price alerts to never miss an opportunity.', route: '/markets', accentColor: '190 90% 50%', duration: 5000 },
  { id: 'savings', icon: 'wallet-outline', title: 'Savings', subtitle: '6% APY — no lock-ups', description: 'Grow your money with industry-leading 6% annual yield. Deposit and withdraw anytime — your money stays liquid.', tip: 'Check the dashboard to see your monthly earnings projection.', route: '/savings', accentColor: '142 71% 45%', duration: 4500 },
  { id: 'ai', icon: 'sparkles-outline', title: 'Exo', subtitle: 'Exo Intelligence', description: 'Get personalized insights, spending analysis, and smart recommendations. Available 24/7.', tip: 'Ask Exo about your spending patterns for tailored advice.', route: '/exo', accentColor: '330 81% 60%', duration: 5000 },
];
const hsl = (a: string, alpha = 1) => { const [h, s, l] = a.split(' '); return `hsla(${h}, ${s}, ${l}, ${alpha})`; };
const safeGet = (key: string) => { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } };
const safeSet = (key: string, v: string) => { try { globalThis.localStorage?.setItem(key, v); } catch { /* ignore */ } };

export function resetOnboarding(userId?: string) {
  try {
    const ls = globalThis.localStorage;
    if (userId) ls?.removeItem(`${STORAGE_KEY}:${userId}`);
    else {
      ls?.removeItem(STORAGE_KEY);
      for (let i = (ls?.length ?? 0) - 1; i >= 0; i--) { const key = ls!.key(i); if (key?.startsWith(`${STORAGE_KEY}:`)) ls!.removeItem(key); }
    }
  } catch { /* ignore */ }
  void supabase.auth.updateUser({ data: { [METADATA_KEY]: false } });
  listeners.forEach((l) => l());
}

function Stage({ scene }: { scene: Scene }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = 0; p.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true); }, [scene.id, p]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.12 }], opacity: 0.35 + p.value * 0.4 }));
  return (
    <Animated.View key={scene.id} entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ alignItems: 'center', justifyContent: 'center', height: 220 }}>
      <Animated.View style={[{ position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: hsl(scene.accentColor, 0.5) }, ring]} />
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: hsl(scene.accentColor, 0.15), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={scene.icon} size={44} color={hsl(scene.accentColor)} />
      </View>
    </Animated.View>
  );
}

export function OnboardingTutorial() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const start = useRef(0);
  const storageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;
  const completedInAccount = user?.user_metadata?.[METADATA_KEY] === true;
  const startTour = useCallback(() => { setCur(0); setProgress(0); setPlaying(true); setDone(false); setVisible(true); }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (completedInAccount) { safeSet(storageKey, 'true'); return; }
    if (safeGet(storageKey)) return;
    const t = setTimeout(() => { if (!safeGet(storageKey)) startTour(); }, 500);
    return () => clearTimeout(t);
  }, [user?.id, storageKey, completedInAccount, startTour]);
  useEffect(() => { listeners.add(startTour); return () => { listeners.delete(startTour); }; }, [startTour]);
  useEffect(() => {
    if (!visible || !playing) return;
    const scene = SCENES[cur];
    start.current = Date.now() - (progress / 100) * scene.duration;
    const id = setInterval(() => {
      const pct = Math.min(((Date.now() - start.current) / scene.duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        if (cur < SCENES.length - 1) { setCur((c) => c + 1); setProgress(0); start.current = Date.now(); }
        else { setPlaying(false); setDone(true); clearInterval(id); }
      }
    }, 50);
    return () => clearInterval(id);
  }, [visible, playing, cur]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    safeSet(storageKey, 'true');
    setVisible(false);
    if (user?.id && !completedInAccount) void supabase.auth.updateUser({ data: { [METADATA_KEY]: true } });
  };
  const replay = () => { setCur(0); setProgress(0); setPlaying(true); setDone(false); };
  const goTo = (i: number) => { setCur(i); setProgress(0); setPlaying(true); setDone(false); };
  if (!visible) return null;
  const scene = SCENES[cur];
  return (
    <Modal visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, padding: 20 }}>
        <View style={k.rowB}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="sparkles" size={14} color={C.green} /><Text style={k.h3}>Welcome</Text><Text style={k.muted}>{cur + 1}/{SCENES.length}</Text></View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable accessibilityLabel="Replay" onPress={replay} hitSlop={10}><Ionicons name="refresh" size={18} color={C.muted} /></Pressable>
            <Pressable accessibilityLabel="Close" onPress={close} hitSlop={10}><Ionicons name="close" size={20} color={C.muted} /></Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }}>
          {SCENES.map((s, i) => (
            <Pressable key={s.id} accessibilityLabel={s.title} onPress={() => goTo(i)} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' }}>
              <View style={{ height: 4, backgroundColor: hsl(i === cur ? scene.accentColor : s.accentColor), width: i < cur ? '100%' : i === cur ? `${progress}%` : '0%' }} />
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Stage scene={scene} />
          <Pressable accessibilityLabel={playing ? 'Pause' : 'Play'} onPress={() => setPlaying(!playing)} style={{ alignSelf: 'center', marginBottom: 16 }}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color={C.muted} />
          </Pressable>
          <Animated.View key={scene.id} entering={FadeInDown.duration(260)}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: hsl(scene.accentColor, 0.12), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
              <Ionicons name={scene.icon} size={12} color={hsl(scene.accentColor)} /><Text style={{ color: hsl(scene.accentColor), fontSize: 12, fontWeight: '600' }}>{scene.subtitle}</Text>
            </View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '700', marginBottom: 8 }}>{scene.title}</Text>
            <Text style={[k.text, { lineHeight: 21, marginBottom: 8 }]}>{scene.description}</Text>
            <Text style={k.muted}>Tip: {scene.tip}</Text>
          </Animated.View>
        </View>
        <View style={[k.rowB, { gap: 8 }]}>
          <Pressable onPress={() => { close(); router.navigate(scene.route); }} hitSlop={8}><Text style={{ color: hsl(scene.accentColor), fontWeight: '600' }}>Try it now →</Text></Pressable>
          {done ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small variant="outline" icon="refresh" label="Replay" onPress={replay} />
              <Btn small label="Get Started" onPress={close} />
            </View>
          ) : (
            <Btn small label={cur === SCENES.length - 1 ? 'Get Started' : 'Next'} onPress={() => (cur < SCENES.length - 1 ? goTo(cur + 1) : close())} />
          )}
        </View>
        {cur === 0 && !done && (
          <Pressable onPress={close} style={{ alignSelf: 'center', marginTop: 12 }}><Text style={k.muted}>Skip — I&apos;ll explore on my own</Text></Pressable>
        )}
      </SafeAreaView>
    </Modal>
  );
}
