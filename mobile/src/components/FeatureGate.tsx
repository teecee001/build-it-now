// Port of the web FeatureGate: features are gated by the verified country (geo-verify).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Box, Btn, k } from '@/components/kit';
import { type Country, useGeoVerification } from '@/hooks/useGeoVerification';
import { C } from '@/lib/theme';

export function FeatureGate({ feature, featureLabel, children }: { feature: keyof Country; featureLabel: string; children: ReactNode }) {
  const { isFeatureAvailable, geoStatus } = useGeoVerification();
  if (isFeatureAvailable(feature)) return <>{children}</>;
  const countryName = geoStatus?.country?.name || 'your country';
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 16 }}>
      <Box style={{ alignItems: 'center', padding: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="shield-outline" size={32} color={C.red} />
        </View>
        <Text style={[k.h2, { fontSize: 20, marginBottom: 8 }]}>{featureLabel} Not Available</Text>
        <Text style={[k.muted, { textAlign: 'center' }]}>
          This feature is not available in <Text style={{ color: C.text, fontWeight: '600' }}>{countryName}</Text> due to local regulations.
        </Text>
        <Text style={[k.muted, { marginVertical: 12 }]}>Region: {geoStatus?.country?.region || 'Unknown'}</Text>
        <Text style={[k.muted, { fontSize: 12, marginBottom: 20 }]}>
          Feature availability is determined by your verified location and local regulatory requirements. If you believe this is an error, please contact support.
        </Text>
        <Btn label="Back to Dashboard" icon="arrow-back" onPress={() => router.navigate('/')} style={{ alignSelf: 'stretch' }} />
      </Box>
    </View>
  );
}
