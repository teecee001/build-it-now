// Port of src/components/BetaFeedback.tsx (same beta_feedback insert). page_url = native route.
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Badge, Btn, Page, Segmented } from '@/components/kit';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';

type FeedbackType = 'feedback' | 'bug';

export default function BetaFeedback() {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>('feedback');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!message.trim() || !user || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('beta_feedback').insert({ user_id: user.id, type, message: message.trim(), page_url: '/app/feedback' });
    setSubmitting(false);
    if (error) toast.error('Failed to send. Please try again.');
    else {
      haptic.success();
      toast.success(type === 'bug' ? 'Bug report sent — thank you!' : 'Feedback sent — thank you!');
      setMessage('');
      if (router.canGoBack()) router.back();
    }
  };
  return (
    <Page title="Beta Feedback" sub="Help us improve Ξ╳oSky" right={<Badge label="BETA" color={C.muted} />}>
      <View style={{ marginBottom: 12 }}>
        <Segmented options={[{ value: 'feedback', label: 'Feedback' }, { value: 'bug', label: 'Report Bug' }]} value={type} onChange={(v) => setType(v as FeedbackType)} />
      </View>
      <TextInput
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder={type === 'bug' ? 'Describe the bug — what happened and what you expected...' : 'What would you like to see improved?'}
        placeholderTextColor={C.muted}
        style={{ minHeight: 140, color: C.text, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, textAlignVertical: 'top', fontSize: 15, marginBottom: 12 }}
      />
      <Btn label={submitting ? 'Sending...' : 'Send'} icon="send" busy={submitting} disabled={!message.trim()} onPress={handleSubmit} />
    </Page>
  );
}
