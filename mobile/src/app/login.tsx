import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExoMark } from '@/components/ExoMark';
import { ui } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      haptic.error();
      setError(/confirm/i.test(err.message) ? 'Confirm your email to continue' : 'Wrong email or password. Try again or create an account.');
    } else haptic.success();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 }}>
      <Animated.View entering={enter(0)} style={{ alignItems: 'center', marginBottom: 28 }}>
        <ExoMark size={56} />
        <Text style={[ui.muted, { marginTop: 12, fontSize: 15 }]}>Welcome back. Sign in to continue.</Text>
      </Animated.View>
      <Animated.View entering={enter(2)}>
        {error ? (
          <View style={ui.banner} accessibilityRole="alert">
            <Text style={ui.bannerT}>{error}</Text>
          </View>
        ) : null}
        <TextInput style={ui.input} placeholder="Email" placeholderTextColor={C.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={ui.input} placeholder="Password" placeholderTextColor={C.muted} secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        <Pressable accessibilityRole="button" onPress={submit} disabled={busy || !email || !password} style={[ui.btn, { marginTop: 6, opacity: busy || !email || !password ? 0.6 : 1 }]}>
          {busy ? <ActivityIndicator color={C.bg} /> : <Text style={ui.btnT}>Sign in</Text>}
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
