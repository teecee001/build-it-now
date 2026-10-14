import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const prefs = {
  async get(k: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(k) ?? null;
    return SecureStore.getItemAsync(k);
  },
  async set(k: string, v: string) {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(k, v);
    else await SecureStore.setItemAsync(k, v);
  },
};
