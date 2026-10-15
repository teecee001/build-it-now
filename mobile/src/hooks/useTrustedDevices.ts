// Port of src/hooks/useTrustedDevices.ts (same keys). Device id lives in secureKV on native.
import * as Application from 'expo-application';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { secureKV } from '@/lib/secureKV';

const DEVICES_KEY = 'x_money_trusted_devices';
const CURRENT_DEVICE_KEY = 'x_money_device_id';
export interface TrustedDevice { id: string; name: string; browser: string; os: string; addedAt: string; lastUsed: string }

const genId = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
const detectBrowser = () => (Platform.OS === 'web' ? 'Browser' : Application.applicationName || 'App');
const detectOS = () => ({ ios: 'iOS', android: 'Android', web: 'Web' } as Record<string, string>)[Platform.OS] ?? 'Unknown';
function currentId() {
  let id = secureKV.get(CURRENT_DEVICE_KEY);
  if (!id) { id = genId(); secureKV.set(CURRENT_DEVICE_KEY, id); }
  return id;
}
function stored(): TrustedDevice[] { try { return JSON.parse(secureKV.get(DEVICES_KEY) || '[]'); } catch { return []; } }
const save = (d: TrustedDevice[]) => secureKV.set(DEVICES_KEY, JSON.stringify(d));

export function useTrustedDevices() {
  const [currentDeviceId] = useState(currentId);
  // Touch lastUsed for this device once, at mount (initializer instead of a setState effect).
  const [devices, setDevices] = useState<TrustedDevice[]>(() => {
    const d = stored();
    if (!d.some((x) => x.id === currentDeviceId)) return d;
    const u = d.map((x) => (x.id === currentDeviceId ? { ...x, lastUsed: new Date().toISOString() } : x));
    save(u);
    return u;
  });
  const isCurrentDeviceTrusted = devices.some((d) => d.id === currentDeviceId);
  const trustCurrentDevice = useCallback((name?: string) => {
    const now = new Date().toISOString();
    const device: TrustedDevice = { id: currentDeviceId, name: name || `${detectBrowser()} on ${detectOS()}`, browser: detectBrowser(), os: detectOS(), addedAt: now, lastUsed: now };
    const u = [...devices.filter((d) => d.id !== currentDeviceId), device];
    save(u); setDevices(u);
  }, [devices, currentDeviceId]);
  const removeDevice = useCallback((id: string) => { const u = devices.filter((d) => d.id !== id); save(u); setDevices(u); }, [devices]);
  return { devices, currentDeviceId, isCurrentDeviceTrusted, trustCurrentDevice, removeDevice };
}
