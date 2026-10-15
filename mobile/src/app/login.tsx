// Port of src/pages/Auth.tsx: sign in, sign up (demo account), Google, password reset, resend.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ExoMark } from '@/components/ExoMark';
import { ui } from '@/components/ui';
import { authRedirect, useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

export default function Auth() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const norm = () => email.trim().toLowerCase();

  const handleForgotPassword = async () => {
    if (!norm()) { toast.error('Enter your email first'); return; }
    if (isResetting) return;
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(norm(), { redirectTo: authRedirect() });
    if (error) toast.error(error.message);
    else toast.success('Password reset link sent. Check your inbox and spam.');
    setIsResetting(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (isSignUp) {
      if (!fullName.trim()) { toast.error('Please enter your name'); setIsSubmitting(false); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); setIsSubmitting(false); return; }
      try { await supabase.rpc('join_waitlist', { p_email: norm() }); } catch { /* non-blocking */ }
      const { error } = await signUp(norm(), password, fullName.trim(), authRedirect());
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          toast.error('This email already has an account. Sign in instead.');
          setIsSignUp(false);
        } else toast.error(error.message);
        haptic.error();
      } else setPendingConfirm(true);
    } else {
      const { error } = await signIn(norm(), password);
      if (error) {
        haptic.error();
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('email not confirmed')) {
          setPendingConfirm(true);
          toast.message('Confirm your email to continue', { description: 'Check your inbox (and spam) for the link from ExoSky.' });
        } else if (msg.includes('invalid login')) toast.error('Wrong email or password. Try again or create an account.');
        else toast.error(error.message);
      } else haptic.success();
    }
    setIsSubmitting(false);
  };

  const handleResend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: norm(), options: { emailRedirectTo: authRedirect() } });
    if (error) toast.error(error.message);
    else toast.success('Confirmation email sent. Check inbox and spam.');
    setIsSubmitting(false);
  };

  if (pendingConfirm) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 }}>
        <Animated.View entering={FadeIn.duration(250)} style={{ alignItems: 'center' }}>
          <ExoMark size={48} />
          <View style={[ui.card, { marginTop: 20, alignItems: 'center', alignSelf: 'stretch' }]}>
            <Ionicons name="mail-outline" size={28} color={C.green} />
            <Text style={[ui.h2, { marginTop: 8 }]}>Check your email</Text>
            <Text style={[ui.muted, { textAlign: 'center', marginTop: 6 }]}>We sent a confirmation link to <Text style={{ color: C.text }}>{email}</Text>.</Text>
            <Text style={[ui.muted, { textAlign: 'center', marginTop: 6, marginBottom: 14 }]}>Open the link to activate your demo account. Check spam if you don’t see it.</Text>
            <Pressable accessibilityRole="button" onPress={handleResend} disabled={isSubmitting} style={[ui.btn, { alignSelf: 'stretch' }]}>
              {isSubmitting ? <ActivityIndicator color={C.bg} /> : <Text style={ui.btnT}>Resend email</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setPendingConfirm(false); setIsSignUp(false); }} style={[ui.btn, { alignSelf: 'stretch', marginTop: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border }]}>
              <Text style={[ui.btnT, { color: C.text }]}>Back to Sign In</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  const disabled = isSubmitting || !email || !password || (isSignUp && !fullName);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={enter(0)} style={{ alignItems: 'center', marginBottom: 24 }}>
          <ExoMark size={56} />
          <Text style={[ui.muted, { marginTop: 12, fontSize: 15, textAlign: 'center' }]}>{isSignUp ? 'Create your demo account. Paper balances, live markets.' : 'Welcome back. Sign in to continue.'}</Text>
        </Animated.View>
        <Animated.View entering={enter(2)}>
          <Pressable accessibilityRole="button" onPress={async () => { const { error } = await signInWithGoogle(); if (error) toast.error(error.message); }} style={[ui.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border, flexDirection: 'row', gap: 8 }]}>
            <Ionicons name="logo-google" size={16} color={C.text} />
            <Text style={[ui.btnT, { color: C.text }]}>Continue with Google</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} /><Text style={ui.muted}>or email</Text><View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>
          {isSignUp && <TextInput style={ui.input} placeholder="Full name" placeholderTextColor={C.muted} autoComplete="name" value={fullName} onChangeText={setFullName} />}
          <TextInput style={ui.input} placeholder="Email" placeholderTextColor={C.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={ui.input} placeholder={isSignUp ? 'Password (min 6 characters)' : 'Password'} placeholderTextColor={C.muted} secureTextEntry autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} onSubmitEditing={handleSubmit} />
          {!isSignUp && (
            <Pressable onPress={handleForgotPassword} disabled={isResetting} style={{ alignSelf: 'flex-end', marginBottom: 8 }} hitSlop={8}>
              <Text style={{ color: C.green, fontSize: 13 }}>{isResetting ? 'Sending...' : 'Forgot password?'}</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={handleSubmit} disabled={disabled} style={[ui.btn, { marginTop: 6, opacity: disabled ? 0.6 : 1 }]}>
            {isSubmitting ? <ActivityIndicator color={C.bg} /> : <Text style={ui.btnT}>{isSignUp ? 'Create demo account' : 'Sign in'}</Text>}
          </Pressable>
          {isSignUp && <Text style={[ui.muted, { textAlign: 'center', marginTop: 10, fontSize: 12 }]}>Demo mode. Paper balances, no real money.</Text>}
          <Text style={[ui.muted, { textAlign: 'center', marginTop: 16 }]}>
            {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
            <Text style={{ color: C.green, fontWeight: '600' }} onPress={() => { haptic.tap(); setIsSignUp(!isSignUp); setPendingConfirm(false); }}>{isSignUp ? 'Sign in' : 'Create account'}</Text>
          </Text>
          <Text style={[ui.muted, { textAlign: 'center', marginTop: 18, fontSize: 12 }]}>
            <Text onPress={() => router.push('/terms')}>Terms</Text> · <Text onPress={() => router.push('/privacy')}>Privacy</Text> · <Text onPress={() => router.push('/compliance')}>Disclosures</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
