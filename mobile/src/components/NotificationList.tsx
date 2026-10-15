// Port of src/components/NotificationList.tsx.
import { formatDistanceToNow } from 'date-fns';
import { Pressable, Text, View } from 'react-native';

import { IconDot, type IconName, k } from '@/components/kit';
import type { Notification } from '@/hooks/useNotifications';
import { formatAmountsInText } from '@/lib/formatCurrency';
import { formatAmount, formatHandleInText, getConversionDisplay } from '@/lib/formatTransaction';
import { C } from '@/lib/theme';

const NOTIF_ICONS: Record<string, IconName> = {
  deposit: 'arrow-down', send: 'arrow-up', receive: 'arrow-down', cashback: 'gift-outline', welcome_bonus: 'gift-outline',
  interest: 'trending-up', bill_payment: 'business-outline', conversion: 'swap-horizontal', purchase: 'card-outline',
};
export function notifIcon(n: Notification): IconName {
  const txType = (n.metadata as { tx_type?: string } | null)?.tx_type;
  return NOTIF_ICONS[txType || n.type] || 'information-circle-outline';
}
export function notifAmount(n: Notification): number | null {
  const raw = (n.metadata as { amount?: unknown } | null)?.amount;
  if (raw === undefined || raw === null || raw === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}
function notifAmountLabel(n: Notification): string | null {
  const meta = (n.metadata || {}) as Record<string, unknown>;
  const txType = String(meta.tx_type || n.type || '');
  if (txType === 'conversion' || txType === 'convert' || /convert/i.test(n.title || '')) {
    const conv = getConversionDisplay({ type: 'conversion', amount: Number(meta.amount ?? meta.from_amount ?? 0), description: n.message || n.title, metadata: meta });
    if (conv) return conv.amountText;
  }
  const amount = notifAmount(n);
  if (amount === null) return null;
  return `${amount >= 0 ? '+' : '-'}${formatAmount(amount, String(meta.currency || 'USD'))}`;
}

export function NotificationList({ items, onOpen, empty = "You're all caught up" }: { items: Notification[]; onOpen: (n: Notification) => void; empty?: string }) {
  if (items.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
        <IconDot name="notifications-outline" color={C.muted} />
        <Text style={k.text}>{empty}</Text>
        <Text style={k.muted}>Payments, rewards, and alerts will land here.</Text>
      </View>
    );
  }
  return (
    <View>
      {items.map((n) => {
        const amount = notifAmount(n);
        const label = notifAmountLabel(n);
        const isPositive = amount !== null && amount > 0;
        const isConvert = label?.includes('→') || /convert/i.test(n.title || '') || (n.metadata as { tx_type?: string } | null)?.tx_type === 'conversion';
        return (
          <Pressable key={n.id} onPress={() => onOpen(n)} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border }, pressed && { opacity: 0.7 }]}>
            <IconDot size={36} name={notifIcon(n)} color={isPositive ? C.green : C.text} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[k.text, { fontSize: 14, fontWeight: n.is_read ? '400' : '600', flexShrink: 1 }]} numberOfLines={1}>{n.title}</Text>
                {!n.is_read && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />}
              </View>
              <Text style={[k.muted, { fontSize: 12 }]} numberOfLines={2}>{formatHandleInText(formatAmountsInText(n.message))}</Text>
              <Text style={[k.muted, { fontSize: 11, marginTop: 2 }]}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</Text>
            </View>
            {label ? <Text style={[k.mono, { fontSize: 13, color: isConvert ? C.text : isPositive ? C.green : C.text }]}>{label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
