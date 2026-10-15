// Push registration only. No token is stored: the database has no push-token table yet
// (see mobile/README.md for the table + policy Maurice would need to add).
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  // Loaded lazily so the web build never evaluates expo-notifications (it warns on web).
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#22C55E',
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null; // set after `eas init`
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data; // intentionally kept in memory only
}
