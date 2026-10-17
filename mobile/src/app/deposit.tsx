import { Text } from 'react-native';

import { Box, k, Page } from '@/components/kit';

export default function Deposit() {
  return (
    <Page title="Add money" sub="Bank deposits are not connected">
      <Box i={1}>
        <Text style={k.h3}>No deposit instructions</Text>
        <Text style={[k.muted, { marginTop: 8, lineHeight: 20 }]}>
          ExoSky cannot accept bank transfers, debit-card funding, or direct deposit yet.
          There is no routing number and no account number. Nothing on this screen adds money to your wallet.
        </Text>
      </Box>
    </Page>
  );
}
