// Port of src/pages/Notifications.tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Box, Btn, k, Page, Segmented } from '@/components/kit';
import { NotificationList } from '@/components/NotificationList';
import { type Notification, useNotifications } from '@/hooks/useNotifications';
import { C } from '@/lib/theme';

export default function Notifications() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const items = useMemo(() => (tab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications), [tab, notifications]);
  const open = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    router.push('/activity');
  };
  return (
    <Page
      title="Notifications"
      sub={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {unreadCount > 0 && <Btn small variant="outline" icon="checkmark-done" label="Mark read" onPress={() => markAllAsRead.mutate()} />}
          {notifications.length > 0 && <Btn small variant="secondary" icon="trash-outline" label="Clear" onPress={() => clearAll.mutate()} />}
        </View>
      }>
      <View style={{ marginBottom: 12 }}>
        <Segmented options={[{ value: 'all', label: `All (${notifications.length})` }, { value: 'unread', label: `Unread (${unreadCount})` }]} value={tab} onChange={(v) => setTab(v as 'all' | 'unread')} />
      </View>
      <Box i={1} style={{ paddingVertical: 4 }}>
        {isLoading ? <Text style={[k.muted, { padding: 24, textAlign: 'center' }]}>Loading…</Text> : <NotificationList items={items} onOpen={open} empty={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} />}
      </Box>
      {notifications.length === 0 && !isLoading && (
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="notifications-outline" size={12} color={C.muted} />
          <Text style={[k.muted, { fontSize: 12 }]}>Alerts for sends, bonuses, and conversions show up here.</Text>
        </View>
      )}
    </Page>
  );
}
