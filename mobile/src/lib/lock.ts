import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'exo.appLock';
export async function isLockEnabled() {
  if (Platform.OS === 'web') return false;
  return (await SecureStore.getItemAsync(KEY)) === '1';
}
export async function setLockEnabled(on: boolean) {
  if (on) {
    const ok = await unlock();
    if (!ok) return false;
    await SecureStore.setItemAsync(KEY, '1');
  } else await SecureStore.deleteItemAsync(KEY);
  return true;
}
export async function biometricLabel(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face ID' : 'Fingerprint';
}
export async function unlock() {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'ExoSky' });
  return r.success;
}
