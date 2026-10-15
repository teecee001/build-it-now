import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '@/integrations/supabase/types';

// Same public project URL + publishable (anon) key the web app ships in
// src/integrations/supabase/client.ts. These are public by design; no secrets here.
export const SUPABASE_URL = 'https://vxcxwmhesgpncbkhwsej.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ceCUc9fqMwACxBU43yg43Q_nmKqkbmt';

// The auth session lives in the iOS Keychain / Android Keystore via expo-secure-store.
// SecureStore values are size-limited, so the session JSON is split into chunks.
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const n = await SecureStore.getItemAsync(`${key}.n`);
    if (!n) return null;
    let out = '';
    for (let i = 0; i < Number(n); i++) out += (await SecureStore.getItemAsync(`${key}.${i}`)) ?? '';
    return out;
  },
  async setItem(key: string, value: string) {
    const parts = Math.ceil(value.length / CHUNK) || 1;
    for (let i = 0; i < parts; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${key}.n`, String(parts));
  },
  async removeItem(key: string) {
    const n = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

const sanitize = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');
const storage =
  Platform.OS === 'web'
    ? undefined // web preview: supabase-js default (localStorage)
    : {
        getItem: (k: string) => secureStorage.getItem(sanitize(k)),
        setItem: (k: string, v: string) => secureStorage.setItem(sanitize(k), v),
        removeItem: (k: string) => secureStorage.removeItem(sanitize(k)),
      };

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
