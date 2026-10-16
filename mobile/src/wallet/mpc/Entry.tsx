// Entry to Exo Wallet from the Crypto tab. Renders nothing unless EXPO_PUBLIC_MPC_WALLET=1.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { k } from '@/components/kit';
import { C } from '@/lib/theme';

import { mpcConfig } from './config';

export function ExoWalletEntry() {
  if (!mpcConfig().enabled) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Exo Wallet, testnet" onPress={() => router.push('/wallet')} style={[k.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <Ionicons name="shield-checkmark-outline" size={22} color={C.green} />
      <View style={{ flex: 1 }}>
        <Text style={k.h2}>Exo Wallet</Text>
        <Text style={k.muted}>Your own wallet, no seed phrase. Testnet.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}
