import { Text } from 'react-native';

import { Box, k, Page } from '@/components/kit';

export default function KYC() {
  return (
    <Page title="Identity verification" sub="Not available yet">
      <Box i={1}>
        <Text style={k.h3}>Identity verification is not available yet</Text>
        <Text style={[k.muted, { marginTop: 8, lineHeight: 20 }]}>
          ExoSky does not collect a Social Security number, a government ID, or a selfie, and it does not submit a review.
          Your account is not identity-verified.
        </Text>
      </Box>
    </Page>
  );
}
