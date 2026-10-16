import { Platform } from 'react-native';

import type { BackupMethod } from './types';

export const BACKUP_LABEL: Record<BackupMethod, string> = { icloud: 'iCloud', 'google-drive': 'Google Drive', password: 'Recovery password' };
/** iCloud on iOS, Google Drive on Android, a recovery password everywhere. */
export const backupOptions = (os: string = Platform.OS): BackupMethod[] => (os === 'ios' ? ['icloud', 'password'] : ['google-drive', 'password']);
