// Small synchronous key/value store for device-local secrets (card PIN hash, lockout).
// Native: iOS Keychain / Android Keystore via expo-secure-store. Web: localStorage (as the web app).
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureKV = {
  get(key: string): string | null {
    try {
      return Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItem(safeKey(key));
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
      else SecureStore.setItem(safeKey(key), value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
      else void SecureStore.deleteItemAsync(safeKey(key));
    } catch {
      /* ignore */
    }
  },
};
