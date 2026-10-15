import { Text, View } from 'react-native';

import { Box, IconDot, type IconName, k, Page } from '@/components/kit';
import { COMPLIANCE_BADGES, COMPLIANCE_SECTIONS } from '@/constants/legal';
import { C } from '@/lib/theme';

const ICONS: Record<string, IconName> = {
  Building2: 'business-outline', Shield: 'shield-outline', Globe: 'globe-outline', Scale: 'scale-outline',
  MapPin: 'location-outline', FileCheck: 'document-text-outline', Ban: 'ban-outline', Eye: 'eye-outline',
};

export default function ComplianceDisclosures() {
  return (
    <Page title="Compliance & Disclosures" sub="Regulatory information and financial disclosures · Global operations">
      <Box i={1} tint={C.green}>
        <Text style={[k.text, { fontSize: 13, lineHeight: 19 }]}>
          <Text style={{ fontWeight: '700' }}>Regulatory Notice:</Text> Ξ╳oSky operates in 90+ countries with strict compliance to local financial regulations. Feature availability, transaction limits, and reporting requirements vary by jurisdiction. Your verified country determines which services and protections apply to your account.
        </Text>
      </Box>
      {COMPLIANCE_BADGES.map((b, i) => (
        <Box key={b.title} i={2 + i} style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
          <IconDot size={36} name={ICONS[b.icon] ?? 'shield-outline'} color={C.green} bg={C.green + '1A'} />
          <View style={{ flex: 1 }}>
            <Text style={k.h3}>{b.title}</Text>
            <Text style={[k.muted, { fontSize: 12 }]}>{b.desc}</Text>
          </View>
        </Box>
      ))}
      {COMPLIANCE_SECTIONS.map((s) => (
        <View key={s.title} style={{ marginVertical: 10 }}>
          <Text style={[k.h3, { marginBottom: 6 }]}>{s.title}</Text>
          <Text style={[k.muted, { lineHeight: 20 }]}>{s.content}</Text>
        </View>
      ))}
    </Page>
  );
}
