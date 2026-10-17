// Port of src/pages/KYCVerification.tsx (same flow: the web simulates ID/selfie capture and
// only writes profiles.full_name on submit).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Box, Btn, Field, k, Page } from '@/components/kit';
import { SuccessCheck } from '@/components/SuccessCheck';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

type Step = 'info' | 'id' | 'selfie' | 'review' | 'complete';
const steps: { key: Step; label: string }[] = [
  { key: 'info', label: 'Personal Info' },
  { key: 'id', label: 'Government ID' },
  { key: 'selfie', label: 'Selfie' },
  { key: 'review', label: 'Review' },
];
const formatSSN = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
};

function Tap({ done, icon, doneText, text, onPress }: { done: boolean; icon: 'cloud-upload-outline' | 'camera-outline'; doneText: string; text: string; onPress: () => void }) {
  return (
  <Pressable onPress={onPress} accessibilityRole="button" style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: done ? C.green : C.border, borderRadius: 14, padding: 32, alignItems: 'center', gap: 8, marginTop: 12 }}>
    <Ionicons name={done ? 'checkmark-circle' : icon} size={36} color={done ? C.green : C.muted} />
    <Text style={k.text}>{done ? doneText : text}</Text>
  </Pressable>
);
}

export default function KYCVerification() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [ssn, setSSN] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [idUploaded, setIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const currentIndex = steps.findIndex((s) => s.key === step);

  const handleSubmitInfo = () => {
    if (!fullName || !dob || !ssn || !address || !city || !state || !zip) { toast.error('Please fill in all fields'); return; }
    if (ssn.replace(/\D/g, '').length !== 9) { toast.error('Please enter a valid 9-digit SSN'); return; }
    setStep('id');
  };
  const handleIDUpload = () => { haptic.success(); setIdUploaded(true); toast.success('ID document uploaded'); setTimeout(() => setStep('selfie'), 500); };
  const handleSelfieCapture = () => { haptic.success(); setSelfieUploaded(true); toast.success('Selfie captured'); setTimeout(() => setStep('review'), 500); };
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (user) await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
      await new Promise((r) => setTimeout(r, 2000));
      setStep('complete');
      toast.success('Verification submitted successfully!');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'complete') {
    return (
      <Page title="Verify Your Identity">
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
          <SuccessCheck size={80} />
          <Text style={k.h2}>Verification Submitted!</Text>
          <Text style={[k.muted, { textAlign: 'center' }]}>We&apos;re reviewing your documents. This typically takes 1–2 business days. You&apos;ll be notified once approved.</Text>
          <Btn label="Go to Dashboard" icon="arrow-forward" onPress={() => router.replace('/')} />
        </View>
      </Page>
    );
  }


  return (
    <Page title="Verify Your Identity" sub="Required by federal law to access financial services">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        {steps.map((s, i) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= currentIndex ? C.green : '#1C1C1F' }}>
              {i < currentIndex ? <Ionicons name="checkmark" size={14} color={C.bg} /> : <Text style={{ color: i <= currentIndex ? C.bg : C.muted, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>}
            </View>
            {i < steps.length - 1 && <View style={{ flex: 1, height: 2, marginHorizontal: 4, backgroundColor: i < currentIndex ? C.green : C.border }} />}
          </View>
        ))}
      </View>
      <View style={[k.rowB, { marginBottom: 12 }]}>
        {steps.map((s) => <Text key={s.key} style={[k.muted, { fontSize: 10 }]}>{s.label}</Text>)}
      </View>
      <Box i={1} tint="#F59E0B" style={{ flexDirection: 'row', gap: 8 }}>
        <Ionicons name="warning-outline" size={16} color="#F59E0B" />
        <Text style={[k.muted, { flex: 1, fontSize: 12 }]}>Required under the USA PATRIOT Act and Bank Secrecy Act. Your information is encrypted and stored securely.</Text>
      </Box>
      <Animated.View key={step} entering={FadeInRight.duration(220)} exiting={FadeOutLeft.duration(160)}>
        {step === 'info' && (
          <Box i={0}>
            <Text style={[k.h3, { marginBottom: 10 }]}>Personal Information</Text>
            <Field label="Legal Full Name" value={fullName} onChangeText={setFullName} placeholder="As shown on your ID" />
            <Field label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
            <Field label="Social Security Number" value={ssn} onChangeText={(v) => setSSN(formatSSN(v))} placeholder="XXX-XX-XXXX" maxLength={11} keyboardType="number-pad" secureTextEntry={false} />
            <Field label="Street Address" value={address} onChangeText={setAddress} placeholder="123 Main St" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 2 }}><Field label="City" value={city} onChangeText={setCity} /></View>
              <View style={{ flex: 1 }}><Field label="State" value={state} onChangeText={setState} maxLength={2} placeholder="CA" autoCapitalize="characters" /></View>
              <View style={{ flex: 1 }}><Field label="ZIP" value={zip} onChangeText={setZip} maxLength={5} keyboardType="number-pad" /></View>
            </View>
            <Btn label="Continue" icon="arrow-forward" onPress={handleSubmitInfo} />
          </Box>
        )}
        {step === 'id' && (
          <Box i={0}>
            <Text style={k.h3}>Upload Government-Issued ID</Text>
            <Text style={[k.muted, { marginTop: 4 }]}>Driver&apos;s license, passport, or state ID. Both front and back required for licenses.</Text>
            <Tap done={idUploaded} icon="cloud-upload-outline" doneText="Document uploaded" text="Tap to upload or take a photo" onPress={handleIDUpload} />
          </Box>
        )}
        {step === 'selfie' && (
          <Box i={0}>
            <Text style={k.h3}>Take a Selfie</Text>
            <Text style={[k.muted, { marginTop: 4 }]}>We&apos;ll match your selfie to your ID document to verify your identity.</Text>
            <Tap done={selfieUploaded} icon="camera-outline" doneText="Selfie captured" text="Tap to take a selfie" onPress={handleSelfieCapture} />
          </Box>
        )}
        {step === 'review' && (
          <Box i={0}>
            <Text style={[k.h3, { marginBottom: 10 }]}>Review &amp; Submit</Text>
            {[
              ['Name', fullName],
              ['Date of Birth', dob],
              ['SSN', `***-**-${ssn.slice(-4)}`],
              ['Address', `${address}, ${city}, ${state} ${zip}`],
              ['Government ID', '✓ Uploaded'],
              ['Selfie', '✓ Captured'],
            ].map(([l, v]) => (
              <View key={l} style={[k.rowB, { paddingVertical: 6 }]}>
                <Text style={k.muted}>{l}</Text>
                <Text style={[k.text, { fontSize: 13, flexShrink: 1, textAlign: 'right' }]}>{v}</Text>
              </View>
            ))}
            <Text style={[k.muted, { fontSize: 12, marginVertical: 12 }]}>
              By submitting, you certify that the information provided is accurate and authorize Ξ╳oSky to verify your identity in accordance with our{' '}
              <Text style={{ color: C.green }} onPress={() => router.push('/privacy')}>Privacy Policy</Text>.
            </Text>
            <Btn label="Submit Verification" icon="shield-checkmark-outline" onPress={handleFinalSubmit} busy={isSubmitting} />
          </Box>
        )}
      </Animated.View>
    </Page>
  );
}
