// One native confirm flow for every money movement (P2P fiat and crypto): review, then biometrics.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, Sheet } from '@/components/kit';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';

import { confirmWithBiometrics } from './biometric';

export type ConfirmSummary = { title: string; amount: string; to: string; network?: string; testnet?: boolean };
export type ConfirmOutcome = 'confirmed' | 'cancelled' | 'unavailable';

export function ConfirmSheet({ summary, onDone }: { summary: ConfirmSummary | null; onDone: (o: ConfirmOutcome) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setBusy(true);
    setError(null);
    const r = await confirmWithBiometrics(summary?.title ?? 'Confirm');
    setBusy(false);
    if (r.ok) { haptic.success(); onDone('confirmed'); }
    else if (r.reason === 'unavailable') onDone('unavailable');
    else if (r.reason === 'failed') setError("Couldn't verify it's you. Try again.");
  };
  return (
    <Sheet open={!!summary} onClose={() => onDone('cancelled')} title={summary?.title}>
      {summary && (
        <View accessibilityLabel="Review" style={{ gap: 12 }}>
          <Text style={{ color: C.text, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{summary.amount}</Text>
          <Row label="To" value={summary.to} />
          {summary.network ? <Row label="Network" value={summary.network} /> : null}
          {summary.testnet ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flask-outline" size={14} color={C.muted} />
              <Text style={{ color: C.muted, fontSize: 12 }}>Testnet. No real money moves.</Text>
            </View>
          ) : null}
          {error ? <Text accessibilityRole="alert" style={{ color: C.red, fontSize: 13 }}>{error}</Text> : null}
          <Btn label="Confirm with biometrics" icon="finger-print" busy={busy} onPress={confirm} />
          <Btn label="Cancel" variant="secondary" onPress={() => onDone('cancelled')} disabled={busy} />
        </View>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
      <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: C.text, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{value}</Text>
    </View>
  );
}

/** `const { ask, sheet } = useConfirmSheet()`: render {sheet}, then `await ask(summary)`. */
export function useConfirmSheet() {
  const [summary, setSummary] = useState<ConfirmSummary | null>(null);
  const resolver = useRef<((o: ConfirmOutcome) => void) | null>(null);
  const ask = useCallback((s: ConfirmSummary) => new Promise<ConfirmOutcome>((resolve) => { resolver.current = resolve; setSummary(s); }), []);
  const onDone = useCallback((o: ConfirmOutcome) => { setSummary(null); resolver.current?.(o); resolver.current = null; }, []);
  return { ask, sheet: <ConfirmSheet summary={summary} onDone={onDone} /> };
}
