// Exo's own native stack: full screen, no ExoSky tab bar. Entered from ExoSky; back returns to it.
import { Stack } from 'expo-router';

import { C } from '@/lib/theme';

export default function ExoLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
