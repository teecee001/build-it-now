// Port of src/pages/Premium.tsx. Stripe checkout / portal open in the system browser
// (payment pages, as on the web); the plan status refreshes when the app returns.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { AppState, Text, View } from 'react-native';

import { FeatureGate } from '@/components/FeatureGate';
import { AMBER, Badge, Box, Btn, IconDot, k, Loading, Page, type IconName } from '@/components/kit';
import { useSubscription } from '@/hooks/useSubscription';
import { C } from '@/lib/theme';

const FEATURE_ICONS: IconName[] = ['trending-up', 'flash-outline', 'headset-outline', 'rocket-outline', 'card-outline', 'star-outline'];

export default function Premium() {
  return (
    <FeatureGate feature="features_premium" featureLabel="Premium">
      <PremiumContent />
    </FeatureGate>
  );
}

function PremiumContent() {
  const { isSubscribed, subscriptionEnd, isLoading, isCheckoutLoading, startCheckout, openPortal, checkSubscription, tiers } = useSubscription();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') checkSubscription(); });
    return () => sub.remove();
  }, [checkSubscription]);
  if (isLoading) return <Loading />;

  return (
    <Page title="Ξ╳oSky Pro" sub={isSubscribed ? "You're on the Pro plan" : 'Unlock premium features'} right={isSubscribed ? <Badge label="Active" color={AMBER} /> : undefined}>
      {isSubscribed && (
        <Box i={1} tint={AMBER}>
          <View style={[k.rowB, { marginBottom: 8 }]}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Ionicons name="diamond-outline" size={18} color={AMBER} />
              <Text style={k.h3}>Pro Plan</Text>
            </View>
            <Badge label="Active" icon="checkmark-circle" />
          </View>
          {subscriptionEnd && (
            <Text style={[k.muted, { marginBottom: 10 }]}>
              Renews on {new Date(subscriptionEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
          <Btn small variant="outline" icon="settings-outline" label="Manage Subscription" onPress={openPortal} style={{ alignSelf: 'flex-start' }} />
        </Box>
      )}
      <Box i={2} style={isSubscribed ? { borderColor: AMBER + '33' } : undefined}>
        {isSubscribed && <View style={{ position: 'absolute', top: 12, right: 12 }}><Badge label="Your Plan" color={AMBER} /></View>}
        <Text style={[k.h2, { fontSize: 18 }]}>{tiers.pro.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, marginBottom: 16 }}>
          <Text style={[k.mono, { color: C.text, fontSize: 30 }]}>${tiers.pro.price}</Text>
          <Text style={k.muted}>/month</Text>
        </View>
        {tiers.pro.features.map((feature, i) => (
          <View key={feature} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <IconDot name={FEATURE_ICONS[i] || 'checkmark-circle'} size={28} color={C.green} bg={C.green + '1A'} />
            <Text style={[k.text, { fontSize: 14 }]}>{feature}</Text>
          </View>
        ))}
        {!isSubscribed && <Btn label="Upgrade to Pro" icon="diamond-outline" onPress={() => startCheckout('pro')} busy={isCheckoutLoading} style={{ marginTop: 8 }} />}
      </Box>
      {!isSubscribed && (
        <Box i={3}>
          <Text style={k.h3}>Free Plan</Text>
          <Text style={[k.muted, { marginBottom: 10 }]}>What you currently have</Text>
          {['6% APY on Savings', 'Standard transfer speeds', 'Email support', 'Basic transaction limits', 'Standard debit card'].map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle-outline" size={14} color={C.muted} />
              <Text style={k.muted}>{f}</Text>
            </View>
          ))}
        </Box>
      )}
      <Box i={4} style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <Ionicons name="shield-checkmark-outline" size={16} color={C.muted} />
        <Text style={[k.muted, { fontSize: 11, flex: 1, lineHeight: 16 }]}>Payments are securely processed by Stripe. Cancel anytime from your subscription settings. No hidden fees.</Text>
      </Box>
    </Page>
  );
}
