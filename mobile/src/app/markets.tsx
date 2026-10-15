// Port of src/pages/Markets.tsx. Rows are virtualised (FlashList); charts are native SVG.
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AssetLogo } from '@/components/AssetLogo';
import { Sparkline } from '@/components/Chart';
import { ConversionHistory, CurrencyConverter } from '@/components/CurrencyConverter';
import { FearGreedSection } from '@/components/FearGreedGauge';
import { FeatureGate } from '@/components/FeatureGate';
import { Badge, Box, Btn, Field, type IconName, k, Sheet } from '@/components/kit';
import { ListPage } from '@/components/ListPage';
import { PriceChart } from '@/components/PriceChart';
import { CRYPTO_LIST } from '@/constants/cryptoList';
import { COMMODITIES, FOREX_PAIRS, INDICES } from '@/constants/marketAssets';
import { STOCK_LIST } from '@/constants/stockList';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMarketData } from '@/hooks/useMarketData';
import { useStockPrices } from '@/hooks/useStockPrices';
import { C } from '@/lib/theme';
import type { ConversionResult } from '@/types';

function seedHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}
function syntheticSpark(symbol: string, price: number, changePct: number): number[] {
  const seed = seedHash(symbol);
  const n = 16;
  const end = Math.max(price, 1e-8);
  const visualPct = Math.abs(changePct) < 0.5 ? (changePct >= 0 ? 1.8 : -1.8) : changePct;
  const start = end / (1 + visualPct / 100);
  return Array.from({ length: n }, (_, j) => {
    const base = start + (end - start) * (j / (n - 1));
    return base * (1 + Math.sin(seed * 0.13 + j * 0.72) * 0.035 + Math.cos(seed * 0.07 + j * 0.41) * 0.02);
  });
}
type MarketCategory = 'crypto' | 'stocks' | 'forex' | 'commodities' | 'indices';
type RowItem = { symbol: string; name: string; price: number; change: number; tag: string; spark: number[] };
const CATEGORY_META: Record<MarketCategory, { icon: IconName; label: string; color: string }> = {
  crypto: { icon: 'logo-bitcoin', label: 'Crypto', color: '#F59E0B' },
  stocks: { icon: 'briefcase-outline', label: 'Stocks', color: C.green },
  forex: { icon: 'globe-outline', label: 'Forex', color: C.green },
  commodities: { icon: 'diamond-outline', label: 'Commodities', color: '#FBBF24' },
  indices: { icon: 'bar-chart-outline', label: 'Indices', color: '#34D399' },
};
function liveForexPrice(symbol: string, rates: Record<string, number>): number | null {
  const [base, quote] = symbol.split('/');
  if (!base || !quote) return null;
  if (quote === 'USD' && rates[base]) return 1 / rates[base];
  if (base === 'USD' && rates[quote]) return rates[quote];
  if (rates[base] && rates[quote]) return rates[quote] / rates[base];
  return null;
}
const fmtPct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}%` : '—');
function formatPrice(price: number, category: MarketCategory) {
  if (!price || !Number.isFinite(price)) return '—';
  if (category === 'forex') return price >= 20 ? price.toFixed(2) : price >= 1 ? price.toFixed(4) : price.toFixed(5);
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(6)}`;
}

export default function Markets() {
  return (
    <FeatureGate feature="features_forex" featureLabel="Markets">
      <MarketsContent />
    </FeatureGate>
  );
}

const Row = memo(function Row({ item, category, onPress }: { item: RowItem; category: MarketCategory; onPress: (s: string) => void }) {
  const up = item.change >= 0;
  return (
    <Pressable onPress={() => onPress(item.symbol)} accessibilityRole="button" style={({ pressed }) => [k.card, { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 }, pressed && { opacity: 0.8 }]}>
      <AssetLogo symbol={item.symbol} category={category} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={[k.text, { fontSize: 14, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Text style={k.muted}>{item.symbol}</Text>
          {item.tag ? <Badge label={item.tag} color={C.muted} /> : null}
        </View>
      </View>
      {item.spark.length ? <Sparkline values={item.spark} width={56} height={28} color={up ? '#22c55e' : '#ef4444'} /> : null}
      <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
        <Text style={[k.text, k.mono, { fontSize: 14 }]}>{formatPrice(item.price, category)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? C.green : C.red} />
          <Text style={{ color: up ? C.green : C.red, fontSize: 12 }}>{up ? '+' : ''}{fmtPct(item.change)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.muted} />
    </Pressable>
  );
});

function MarketsContent() {
  const [history, setHistory] = useState<ConversionResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('crypto');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ symbol: string; category: MarketCategory } | null>(null);
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
  const [chartDays, setChartDays] = useState(30);
  const [tick, setTick] = useState(0);
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    const a = setInterval(() => { setTick((t) => t + 1); setSecondsAgo(0); }, 30000);
    const b = setInterval(() => setSecondsAgo((s) => Math.min(s + 1, 30)), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const { rates, cryptoChanges } = useExchangeRates();
  const { getPrice: legacyPrice, getChange: legacyChange, getSpark: legacySpark, isLive: legacyLive } = useStockPrices();
  const md = useMarketData('all');
  const stocksLive = md.stocksLive || legacyLive;

  const items: RowItem[] = useMemo(() => {
    const q = search.toLowerCase();
    const cryptoPrice = (c: string) => md.getCrypto(c)?.price || (rates[c] ? 1 / rates[c] : 0);
    const cryptoChange = (c: string) => md.getCrypto(c)?.changePct ?? cryptoChanges[c] ?? 0;
    switch (activeCategory) {
      case 'crypto':
        return CRYPTO_LIST.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)).slice(0, 50).map((c) => {
          const price = cryptoPrice(c.code);
          const change = cryptoChange(c.code);
          const live = md.getCrypto(c.code)?.spark;
          return { symbol: c.code, name: c.name, price, change, tag: '', spark: live && live.length > 1 ? live : price > 0 ? syntheticSpark(c.code, price, change) : [] };
        }).filter((r) => r.price > 0);
      case 'stocks':
        if (!stocksLive) return [];
        return STOCK_LIST.filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)).slice(0, 40).map((s) => {
          const price = md.getStock(s.ticker)?.price ?? legacyPrice(s.ticker);
          const change = md.getStock(s.ticker)?.changePct ?? legacyChange(s.ticker);
          const ms = md.getStock(s.ticker)?.spark;
          const spark = ms && ms.length > 1 ? ms : legacySpark(s.ticker);
          return { symbol: s.ticker, name: s.name, price, change, tag: s.sector, spark: spark.length > 1 ? spark : syntheticSpark(s.ticker, price, change) };
        }).filter((s) => s.price > 0);
      case 'forex':
        return FOREX_PAIRS.filter((f) => f.name.toLowerCase().includes(q) || f.symbol.toLowerCase().includes(q)).map((f) => {
          const mq = md.getForex(f.symbol);
          const live = mq?.price ?? liveForexPrice(f.symbol, rates);
          const price = live ?? f.price;
          const change = mq?.changePct ?? f.change;
          return { symbol: f.symbol, name: f.name, price, change, tag: live != null ? 'Live' : '', spark: mq?.spark && mq.spark.length > 1 ? mq.spark : syntheticSpark(f.symbol, price, change) };
        });
      case 'commodities':
        return COMMODITIES.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)).map((c) => {
          const mq = md.getCommodity(c.symbol);
          const price = mq?.price ?? c.price;
          const change = mq?.changePct ?? c.change;
          return { symbol: c.symbol, name: c.name, price, change, tag: mq ? 'Live' : '', spark: mq?.spark && mq.spark.length > 1 ? mq.spark : syntheticSpark(c.symbol, price, change) };
        });
      case 'indices':
        return INDICES.filter((i) => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q)).map((i) => {
          const mq = md.getIndex(i.symbol);
          const price = mq?.price ?? i.price;
          const change = mq?.changePct ?? i.change;
          return { symbol: i.symbol, name: i.name, price, change, tag: mq ? 'Live' : '', spark: mq?.spark && mq.spark.length > 1 ? mq.spark : syntheticSpark(i.symbol, price, change) };
        });
      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, search, rates, cryptoChanges, stocksLive, tick, md.data]);

  const onConvert = useCallback((r: ConversionResult) => setHistory((p) => [r, ...p].slice(0, 20)), []);
  const onRow = useCallback((symbol: string) => setSelected({ symbol, category: activeCategory }), [activeCategory]);
  const info = selected ? items.find((i) => i.symbol === selected.symbol) : null;

  const top = (
    <>
      <FearGreedSection show={activeCategory === 'crypto'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {(Object.keys(CATEGORY_META) as MarketCategory[]).map((cat) => {
          const m = CATEGORY_META[cat];
          const active = activeCategory === cat;
          return (
            <Pressable key={cat} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => { setActiveCategory(cat); setSelected(null); setSearch(''); }} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? C.text : C.card, borderWidth: 1, borderColor: active ? C.text : C.border }}>
              <Ionicons name={m.icon} size={14} color={active ? C.bg : m.color} />
              <Text style={{ color: active ? C.bg : C.text, fontSize: 13, fontWeight: '600' }}>{m.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Field placeholder={`Search ${activeCategory}...`} value={search} onChangeText={setSearch} autoCapitalize="none" />
      {activeCategory === 'stocks' && !stocksLive && (
        <Box i={1} style={{ alignItems: 'center', gap: 4 }}>
          <Ionicons name="briefcase-outline" size={24} color={C.muted} />
          <Text style={k.text}>Stocks feed coming online</Text>
          <Text style={k.muted}>Live prices load via edge function. No mock prices.</Text>
        </Box>
      )}
      {(activeCategory === 'commodities' || activeCategory === 'indices') && !(activeCategory === 'commodities' ? md.commoditiesLive : md.indicesLive) && (
        <Text style={[k.muted, { fontSize: 12, marginBottom: 8 }]}>Loading live feed… reference levels shown until data arrives.</Text>
      )}
    </>
  );

  return (
    <>
      <ListPage
        title="Markets"
        sub="Crypto, stocks, forex, commodities & indices — all in one place"
        right={<Badge label={secondsAgo < 3 ? 'Live' : `${secondsAgo}s ago`} />}
        top={top}
        data={items}
        keyExtractor={(i) => i.symbol}
        renderItem={({ item }) => <Row item={item} category={activeCategory} onPress={onRow} />}
        empty={activeCategory !== 'stocks' ? <Text style={[k.muted, { textAlign: 'center', padding: 24 }]}>No results</Text> : null}
        footer={<View style={{ marginTop: 8 }}><CurrencyConverter onConvert={onConvert} /><ConversionHistory history={history} /></View>}
      />
      <Sheet open={!!(selected && info)} onClose={() => setSelected(null)} title={info?.name}>
        {selected && info && (
          <>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <AssetLogo symbol={selected.symbol} category={selected.category} size={40} />
              <Text style={k.muted}>{selected.symbol}</Text>
              <Badge label={selected.category} color={C.muted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <Text style={[k.title, k.mono]}>{formatPrice(info.price, selected.category)}</Text>
              <Text style={{ color: info.change >= 0 ? C.green : C.red }}>{info.change >= 0 ? '+' : ''}{fmtPct(info.change)}</Text>
            </View>
            {selected.category === 'crypto' && (
              <>
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
                <PriceChart code={selected.symbol} height={240} days={chartDays} type={chartType} />
              </>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
