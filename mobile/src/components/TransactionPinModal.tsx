// Port of src/components/TransactionPinModal.tsx.
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Btn, IconDot, k, Sheet } from '@/components/kit';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';

export function TransactionPinModal({ open, onVerified, onCancel, verifyPin, amount }: { open: boolean; onVerified: () => void; onCancel: () => void; verifyPin: (pin: string) => boolean; amount: number }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (pin.length < 4) return;
    if (verifyPin(pin)) { setPin(''); setError(''); haptic.success(); onVerified(); }
    else { haptic.error(); setError('Incorrect PIN. Try again.'); setPin(''); }
  };
  return (
    <Sheet open={open} onClose={() => { setPin(''); setError(''); onCancel(); }} title="Transaction PIN">
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconDot name="key-outline" color={C.green} bg={C.green + '1A'} />
        <Text style={[k.muted, { textAlign: 'center' }]}>Enter your PIN to authorize this <Text style={k.text}>${amount.toFixed(2)}</Text> transaction</Text>
      </View>
      <TextInput
        autoFocus secureTextEntry keyboardType="number-pad" maxLength={6}
        placeholder="Enter 4-6 digit PIN" placeholderTextColor={C.muted}
        value={pin} onChangeText={(t) => { setPin(t.replace(/\D/g, '')); setError(''); }} onSubmitEditing={submit}
        style={{ color: C.text, backgroundColor: '#1C1C1F', borderRadius: 12, padding: 14, fontSize: 20, textAlign: 'center', letterSpacing: 8, marginBottom: 8 }}
      />
      {!!error && <Text accessibilityRole="alert" style={{ color: C.red, textAlign: 'center', marginBottom: 8 }}>{error}</Text>}
      <Btn label="Confirm Transaction" disabled={pin.length < 4} onPress={submit} />
    </Sheet>
  );
}
