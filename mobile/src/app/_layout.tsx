import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppLock } from '@/components/AppLock';
import { Splash } from '@/components/Splash';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { isLockEnabled } from '@/lib/lock';
import { IS_IOS } from '@/lib/motion';
import { registerForPush } from '@/lib/push';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function Root() {
  const { session, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);

  // Opt-in biometric lock: on launch and whenever the app returns from background.
  useEffect(() => {
    if (!session) return;
    isLockEnabled().then(setLocked);
    registerForPush().catch(() => undefined);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') isLockEnabled().then((on) => on && setLocked(true));
    });
    return () => sub.remove();
  }, [session]);

  const onSplash = useCallback(() => setSplashDone(true), []);
  if (loading) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: IS_IOS ? 'default' : 'fade_from_bottom',
          animationDuration: 300,
        }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="exo" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      {session && locked && <AppLock onUnlocked={() => setLocked(false)} />}
      {!splashDone && <Splash onDone={onSplash} />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Root />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
