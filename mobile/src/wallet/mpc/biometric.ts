import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricResult = { ok: true } | { ok: false; reason: 'cancelled' | 'unavailable' | 'failed' };

/** One biometric check for every money movement: P2P fiat sends and crypto (testnet) sends. */
export async function confirmWithBiometrics(prompt: string): Promise<BiometricResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unavailable' };
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return { ok: false, reason: 'unavailable' };
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: 'Cancel', disableDeviceFallback: false });
    if (r.success) return { ok: true };
    return { ok: false, reason: r.error === 'user_cancel' || r.error === 'system_cancel' || r.error === 'app_cancel' ? 'cancelled' : 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
