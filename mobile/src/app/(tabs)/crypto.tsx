// Port of src/pages/WalletPage.tsx (Crypto Wallet) + read-only WalletConnect section.
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AssetLogo } from '@/components/AssetLogo';
import { Sparkline } from '@/components/Chart';
import { CryptoTradeModal, type TradeType } from '@/components/CryptoTradeModal';
import { Badge, Box, Btn, Field, type IconName, k, Segmented, Sheet } from '@/components/kit';
import { ListPage } from '@/components/ListPage';
import { PriceChart } from '@/components/PriceChart';
import { PriceTick } from '@/components/PriceTick';
import { WalletConnectCard } from '@/components/WalletConnectCard';
import { ExoWalletEntry } from '@/wallet/mpc/Entry';
import { CRYPTO_LIST } from '@/constants/cryptoList';
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMarketData } from '@/hooks/useMarketData';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';

const TOP_COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];
type Coin = (typeof CRYPTO_LIST)[number];
function spark(code: string, change: number, values?: number[]) {
  if (values && values.length > 1) return values;
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const dir = change >= 0 ? 1 : -1;
  return Array.from({ length: 7 }, (_, i) => 100 + dir * i * 2 + Math.sin(seed + i * 0.8) * 1.5);
}
const fmt = (p: number) => `$${p > 1 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toFixed(6)}`;

const CoinRow = memo(function CoinRow({ coin, price, change, values, isFav, onFav, onSelect }: { coin: Coin; price: number; change: number; values?: number[]; isFav: boolean; onFav: (c: string) => void; onSelect: (c: string) => void }) {
  const up = change >= 0;
  return (
    <Pressable onPress={() => onSelect(coin.code)} accessibilityRole="button" style={({ pressed }) => [k.card, { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 }, pressed && { opacity: 0.8 }]}>
      <Pressable accessibilityLabel="Watchlist" hitSlop={8} onPress={() => { haptic.tap(); onFav(coin.code); }}>
        <Ionicons name={isFav ? 'star' : 'star-outline'} size={16} color={isFav ? '#F59E0B' : C.muted} />
      </Pressable>
      <AssetLogo symbol={coin.code} category="crypto" size={32} />
      <View style={{ flex: 1 }}>
        <Text style={[k.text, { fontSize: 14, fontWeight: '600' }]} numberOfLines={1}>{coin.name}</Text>
        <Text style={k.muted}>{coin.code}</Text>
      </View>
      <Sparkline values={spark(coin.code, change, values)} width={56} height={28} color={up ? '#22c55e' : '#ef4444'} />
      <View style={{ alignItems: 'flex-end', minWidth: 84 }}>
        <PriceTick value={price} text={fmt(price)} style={{ ...k.text, ...k.mono, fontSize: 14 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? C.green : C.red} />
          <Text style={{ color: up ? C.green : C.red, fontSize: 12 }}>{up ? '+' : ''}{change.toFixed(2)}%</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.muted} />
    </Pressable>
  );
});

export default function WalletPage() {
  const { rates, isLive, cryptoChanges } = useExchangeRates();
  const md = useMarketData('crypto');
  const { getWallet } = useMultiCurrencyWallet();
  const { holdingsMap, isLoading: holdingsLoading } = useCryptoHoldings();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'trending' | 'watchlist'>('all');
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['BTC', 'ETH', 'SOL']));
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
  const [chartDays, setChartDays] = useState(30);
  const [tradeModal, setTradeModal] = useState<{ type: TradeType; code: string } | null>(null);

  const toggleFav = useCallback((c: string) => setFavorites((p) => { const n = new Set(p); if (n.has(c)) n.delete(c); else n.add(c); return n; }), []);
  const getPrice = useCallback((code: string) => { const q = md.getCrypto(code); if (q?.price) return q.price; return rates[code] ? 1 / rates[code] : 0; }, [md, rates]);
  const getChange = (code: string) => { const v = md.getCrypto(code)?.changePct ?? cryptoChanges[code] ?? 0; return Number.isFinite(v) ? parseFloat(v.toFixed(2)) : 0; };
  const getSpark = (code: string) => md.getCrypto(code)?.spark;
  const portfolioValue = Object.entries(holdingsMap).reduce((s, [c, a]) => s + a * getPrice(c), 0);
  const usdBalance = getWallet('USD')?.balance ?? 0;
  const openTrade = (type: TradeType, code: string) => { haptic.tap(); setTradeModal({ type, code }); setSelectedCoin(null); };
  const holdingCodes = Object.keys(holdingsMap).filter((c) => holdingsMap[c] > 0);

  const data = useMemo(() => {
    const q = search.toLowerCase();
    const m = (c: Coin) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    if (tab === 'trending') return TOP_COINS.map((c) => CRYPTO_LIST.find((x) => x.code === c)).filter((c): c is Coin => !!c && m(c));
    if (tab === 'watchlist') return Array.from(favorites).map((c) => CRYPTO_LIST.find((x) => x.code === c)).filter((c): c is Coin => !!c && m(c));
    return CRYPTO_LIST.filter(m).slice(0, 30);
  }, [search, tab, favorites]);

  const actions: { icon: IconName; label: string; color: string; type: TradeType }[] = [
    { icon: 'arrow-down', label: 'Buy', color: C.green, type: 'buy' },
    { icon: 'arrow-up', label: 'Sell', color: C.red, type: 'sell' },
    { icon: 'swap-horizontal', label: 'Swap', color: C.green, type: 'swap' },
    { icon: 'arrow-up', label: 'Send', color: '#F59E0B', type: 'send' },
  ];

  const top = (
    <>
      <Box i={1}>
        <Text style={k.muted}>Portfolio Value</Text>
        <Text style={[k.title, k.mono]}>${portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
        <Text style={[k.muted, { marginTop: 2 }]}>USD Balance: ${usdBalance.toFixed(2)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {actions.map((a) => (
            <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => openTrade(a.type, selectedCoin || 'BTC')} style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: a.color + '1A' }, pressed && { transform: [{ scale: 0.96 }] }]}>
              <Ionicons name={a.icon} size={18} color={a.color} />
              <Text style={{ color: a.color, fontSize: 12, fontWeight: '600' }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </Box>
      <ExoWalletEntry />
      <WalletConnectCard />
      <View style={[k.rowB, { marginVertical: 8 }]}>
        <Text style={k.h3}>Holdings</Text>
        <Ionicons name="pie-chart-outline" size={16} color={C.muted} />
      </View>
      {holdingCodes.length === 0 && !holdingsLoading && <Box i={3}><Text style={[k.muted, { textAlign: 'center' }]}>No crypto holdings yet. Buy your first coin!</Text></Box>}
      {holdingCodes.map((code, i) => {
        const amt = holdingsMap[code];
        const value = amt * getPrice(code);
        const pct = portfolioValue > 0 ? (value / portfolioValue) * 100 : 0;
        return (
          <Pressable key={code} onPress={() => setSelectedCoin(code)}>
            <Box i={3 + i} style={[k.rowB, { padding: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
                <AssetLogo symbol={code} category="crypto" size={32} />
                <View>
                  <Text style={k.h3}>{CRYPTO_LIST.find((c) => c.code === code)?.name ?? code}</Text>
                  <Text style={k.muted}>{amt.toFixed(6)} {code}</Text>
                </View>
              </View>
              <Sparkline values={spark(code, getChange(code), getSpark(code))} width={56} height={28} color={getChange(code) >= 0 ? '#22c55e' : '#ef4444'} />
              <View style={{ alignItems: 'flex-end', minWidth: 72 }}>
                <Text style={[k.text, k.mono]}>${value.toFixed(2)}</Text>
                <Text style={k.muted}>{pct.toFixed(1)}%</Text>
              </View>
            </Box>
          </Pressable>
        );
      })}
      <View style={{ marginVertical: 10 }}>
        <Segmented options={[{ value: 'all', label: 'All Assets' }, { value: 'trending', label: 'Trending' }, { value: 'watchlist', label: 'Watchlist' }]} value={tab} onChange={(v) => setTab(v as typeof tab)} />
      </View>
      <Field placeholder="Search coins..." value={search} onChangeText={setSearch} autoCapitalize="none" />
    </>
  );

  const sel = selectedCoin;
  return (
    <>
      <ListPage
        back={false}
        bottomPad={24}
        title="Crypto Wallet"
        right={<Badge label={isLive ? 'Live' : 'Demo'} color={isLive ? C.green : C.muted} />}
        top={top}
        data={data}
        keyExtractor={(c) => c.code}
        renderItem={({ item }) => <CoinRow coin={item} price={getPrice(item.code)} change={getChange(item.code)} values={getSpark(item.code)} isFav={favorites.has(item.code)} onFav={toggleFav} onSelect={setSelectedCoin} />}
        empty={tab === 'watchlist' && favorites.size === 0 ? <Text style={[k.muted, { textAlign: 'center', padding: 24 }]}>Tap the ★ to add coins to your watchlist</Text> : null}
      />
      <Sheet open={!!sel && !tradeModal} onClose={() => setSelectedCoin(null)} title={sel ? CRYPTO_LIST.find((c) => c.code === sel)?.name : undefined}>
        {sel && (
          <>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <AssetLogo symbol={sel} category="crypto" size={40} />
              <Text style={k.muted}>{sel}</Text>
            </View>
            <Text style={[k.title, k.mono, { marginBottom: 10 }]}>{fmt(getPrice(sel))}</Text>
            <View style={[k.rowB, { marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[{ d: 1, l: '24H' }, { d: 7, l: '7D' }, { d: 30, l: '30D' }, { d: 90, l: '90D' }, { d: 365, l: '1Y' }].map((p) => (
                  <Btn key={p.d} small label={p.l} variant={chartDays === p.d ? 'primary' : 'secondary'} onPress={() => setChartDays(p.d)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable accessibilityLabel="Area" onPress={() => setChartType('area')} style={{ padding: 6, borderRadius: 8, backgroundColor: chartType === 'area' ? C.text : 'transparent' }}><Ionicons name="analytics-outline" size={16} color={chartType === 'area' ? C.bg : C.muted} /></Pressable>
                <Pressable accessibilityLabel="Candlestick" onPress={() => setChartType('candlestick')} style={{ padding: 6, borderRadius: 8, backgroundColor: chartType === 'candlestick' ? C.text : 'transparent' }}><Ionicons name="stats-chart-outline" size={16} color={chartType === 'candlestick' ? C.bg : C.muted} /></Pressable>
              </View>
            </View>
            <PriceChart code={sel} height={220} days={chartDays} type={chartType} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Btn small label="Buy" icon="arrow-down" style={{ flex: 1 }} onPress={() => openTrade('buy', sel)} />
              <Btn small variant="outline" label="Sell" icon="arrow-up" style={{ flex: 1 }} onPress={() => openTrade('sell', sel)} />
              <Btn small variant="outline" label="Swap" icon="swap-horizontal" style={{ flex: 1 }} onPress={() => openTrade('swap', sel)} />
            </View>
            {holdingsMap[sel] > 0 && (
              <View style={[k.rowB, { marginTop: 12, backgroundColor: '#1C1C1F', borderRadius: 12, padding: 12 }]}>
                <View>
                  <Text style={k.muted}>Your Holdings</Text>
                  <Text style={k.text}>{holdingsMap[sel].toFixed(6)} {sel}</Text>
                </View>
                <Text style={[k.h3, k.mono]}>${(holdingsMap[sel] * getPrice(sel)).toFixed(2)}</Text>
              </View>
            )}
          </>
        )}
      </Sheet>
      {tradeModal && <CryptoTradeModal type={tradeModal.type} code={tradeModal.code} price={getPrice(tradeModal.code)} getPrice={getPrice} onClose={() => setTradeModal(null)} />}
    </>
  );
}
