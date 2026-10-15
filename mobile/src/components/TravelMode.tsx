// Port of src/components/TravelMode.tsx (same ipapi.co lookup and wallet add/switch).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Badge, Box, Btn, IconDot, k } from '@/components/kit';
import { COUNTRY_NAMES, COUNTRY_TO_CURRENCY } from '@/constants/countryToCurrency';
import { CURRENCIES } from '@/constants/currencies';
import { useActiveCurrency } from '@/hooks/useActiveCurrency';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

type Loc = { countryCode: string; countryName: string; localCurrency: string; city?: string };
const info = (c: string) => CURRENCIES.find((x) => x.code === c);

export function TravelMode() {
  const { activeCurrency, setActiveCurrency, wallets } = useActiveCurrency();
  const { addCurrency } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();
  const [isOpen, setIsOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [location, setLocation] = useState<Loc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = useCallback(async () => {
    setDetecting(true);
    setError(null);
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Location detection failed');
      const data = await res.json();
      const cc = data.country_code || data.country;
      setLocation({ countryCode: cc, countryName: COUNTRY_NAMES[cc] || data.country_name || cc, localCurrency: COUNTRY_TO_CURRENCY[cc] || data.currency, city: data.city });
    } catch {
      setError('Could not detect your location. Please check your connection.');
    } finally {
      setDetecting(false);
    }
  }, []);

  const hasLocalWallet = !!location && wallets.some((w) => w.currency === location.localCurrency);
  const isAlreadyActive = !!location && activeCurrency === location.localCurrency;
  const switchToLocal = async () => {
    if (!location || addCurrency.isPending) return;
    if (!hasLocalWallet) {
      try {
        await addCurrency.mutateAsync(location.localCurrency);
        toast.success(`${location.localCurrency} wallet created`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
        return;
      }
    }
    setActiveCurrency(location.localCurrency);
    haptic.success();
    toast.success(`Switched to ${location.localCurrency} for spending in ${location.countryName}`);
  };
  const switchBack = () => { setActiveCurrency('USD'); toast.success('Switched back to USD'); };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); setIsOpen(!isOpen); if (!isOpen && !location) void detectLocation(); }}>
        <Box i={9} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconDot name="airplane-outline" color={C.green} bg={C.green + '1A'} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Text style={k.h3}>Travel Mode</Text>
              {isAlreadyActive && <Badge label="Active" />}
            </View>
            <Text style={k.muted}>{location ? `${location.city ? location.city + ', ' : ''}${location.countryName}` : 'Detect local currency & rates'}</Text>
          </View>
          <Ionicons name="navigate-outline" size={16} color={C.muted} />
        </Box>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(160)}>
          <Box i={0}>
            <View style={[k.rowB, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="airplane-outline" size={16} color={C.green} /><Text style={k.h3}>Travel Mode</Text></View>
              <Pressable accessibilityLabel="Close" onPress={() => setIsOpen(false)} hitSlop={10}><Ionicons name="close" size={18} color={C.muted} /></Pressable>
            </View>
            {detecting && <Text style={k.muted}>Detecting your location...</Text>}
            {error && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.red }}>{error}</Text>
                <Btn small variant="outline" label="Try Again" onPress={detectLocation} />
              </View>
            )}
            {location && !detecting && (
              <>
                <View style={{ backgroundColor: '#1C1C1F', borderRadius: 12, padding: 12, marginBottom: 10, gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Ionicons name="location-outline" size={16} color={C.green} />
                    <View style={{ flex: 1 }}>
                      <Text style={k.h3}>{location.city ? `${location.city}, ` : ''}{location.countryName}</Text>
                      <Text style={k.muted}>Local currency: <Text style={k.text}>{info(location.localCurrency)?.symbol || ''} {location.localCurrency}</Text> — {info(location.localCurrency)?.name}</Text>
                    </View>
                  </View>
                  {isAlreadyActive ? (
                    <View style={k.rowB}>
                      <Badge label={`Spending in ${location.localCurrency}`} icon="sparkles" />
                      <Btn small variant="secondary" label="Switch to USD" onPress={switchBack} />
                    </View>
                  ) : (
                    <Btn small icon="swap-horizontal" label={hasLocalWallet ? `Switch to ${location.localCurrency}` : `Add & Switch to ${location.localCurrency}`} busy={addCurrency.isPending} onPress={switchToLocal} />
                  )}
                </View>
                <Text style={[k.caption, { marginBottom: 6 }]}>Quick Reference — {activeCurrency} to {location.localCurrency}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {[10, 50, 100, 500].map((amt) => {
                    const conv = (amt / (rates[activeCurrency] || 1)) * (rates[location.localCurrency] || 1);
                    return (
                      <View key={amt} style={{ width: '48%', backgroundColor: '#1C1C1F', borderRadius: 10, padding: 10 }}>
                        <Text style={k.muted}>{info(activeCurrency)?.symbol || ''}{amt.toLocaleString()} {activeCurrency}</Text>
                        <Text style={[k.text, { fontWeight: '700' }]}>{info(location.localCurrency)?.symbol || ''}{conv.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: conv > 100 ? 0 : 2 })}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={[k.rowB, { marginBottom: 8 }]}>
                  <Text style={k.muted}>Live Exchange Rate</Text>
                  <Text style={k.text}>1 {activeCurrency} = {((rates[location.localCurrency] || 1) / (rates[activeCurrency] || 1)).toLocaleString('en-US', { maximumFractionDigits: 4 })} {location.localCurrency}</Text>
                </View>
                <Btn small variant="secondary" icon="globe-outline" label="Re-detect Location" onPress={detectLocation} />
              </>
            )}
          </Box>
        </Animated.View>
      )}
    </>
  );
}
