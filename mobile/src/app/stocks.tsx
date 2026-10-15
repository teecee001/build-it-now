// Port of src/pages/StocksPage.tsx. The market list is virtualised (FlashList).
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Sparkline } from '@/components/Chart';
import { FeatureGate } from '@/components/FeatureGate';
import { Badge, Box, Btn, Field, k, Segmented, SECONDARY, Sheet } from '@/components/kit';
import { ListPage } from '@/components/ListPage';
import { StockTradeModal } from '@/components/StockTradeModal';
import { STOCK_LIST, TRENDING_STOCKS } from '@/constants/stockList';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { useStockHoldings } from '@/hooks/useStockHoldings';
import { useStockPrices } from '@/hooks/useStockPrices';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';

type Stock = (typeof STOCK_LIST)[number];
function sparkline(ticker: string) {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => 100 + Math.sin(seed + i * 0.8) * 15 + Math.cos(seed * 0.3 + i) * 8);
}

export default function StocksPage() {
  return (
    <FeatureGate feature="features_stocks" featureLabel="Stocks">
      <StocksContent />
    </FeatureGate>
  );
}

const StockRow = memo(function StockRow({ stock, price, change, isFav, onFav, onSelect }: { stock: Stock; price: number; change: number; isFav: boolean; onFav: (t: string) => void; onSelect: (t: string) => void }) {
  const up = change >= 0;
  const pts = sparkline(stock.ticker);
  return (
    <Pressable onPress={() => onSelect(stock.ticker)} accessibilityRole="button" style={({ pressed }) => [k.card, { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 }, pressed && { opacity: 0.8 }]}>
      <Pressable accessibilityLabel="Watchlist" hitSlop={8} onPress={() => { haptic.tap(); onFav(stock.ticker); }}>
        <Ionicons name={isFav ? 'star' : 'star-outline'} size={16} color={isFav ? '#F59E0B' : C.muted} />
      </Pressable>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: SECONDARY, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.text, fontSize: 10, fontWeight: '700' }}>{stock.ticker.slice(0, 3)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[k.text, { fontSize: 14, fontWeight: '600' }]} numberOfLines={1}>{stock.name}</Text>
        <Text style={k.muted}>{stock.ticker}</Text>
      </View>
      <Sparkline values={pts} width={56} height={28} color={pts[6] >= pts[0] ? '#22c55e' : '#ef4444'} />
      <View style={{ alignItems: 'flex-end', minWidth: 72 }}>
        <Text style={[k.text, k.mono, { fontSize: 14 }]}>${price.toFixed(2)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? C.green : C.red} />
          <Text style={{ color: up ? C.green : C.red, fontSize: 12 }}>{up ? '+' : ''}{change}%</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.muted} />
    </Pressable>
  );
});

function StocksContent() {
  const { getWallet } = useMultiCurrencyWallet();
  const { holdingsMap, isLoading: holdingsLoading } = useStockHoldings();
  const { getPrice, getChange } = useStockPrices();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'trending' | 'watchlist'>('all');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['AAPL', 'TSLA', 'NVDA']));
  const [tradeModal, setTradeModal] = useState<{ type: 'buy' | 'sell'; ticker: string } | null>(null);

  const toggleFav = useCallback((ticker: string) => setFavorites((prev) => { const n = new Set(prev); if (n.has(ticker)) n.delete(ticker); else n.add(ticker); return n; }), []);
  const usdBalance = getWallet('USD')?.balance ?? 0;
  const portfolioValue = Object.entries(holdingsMap).reduce((s, [t, h]) => s + h.shares * getPrice(t), 0);
  const totalPnL = Object.entries(holdingsMap).reduce((s, [t, h]) => s + h.shares * (getPrice(t) - h.avgPrice), 0);
  const openTrade = (type: 'buy' | 'sell', ticker: string) => { setTradeModal({ type, ticker }); setSelectedStock(null); };
  const holdingTickers = Object.keys(holdingsMap).filter((t) => holdingsMap[t].shares > 0);

  const data = useMemo(() => {
    const q = search.toLowerCase();
    const match = (s: Stock) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q);
    if (tab === 'trending') return TRENDING_STOCKS.map((t) => STOCK_LIST.find((s) => s.ticker === t)).filter((s): s is Stock => !!s && match(s));
    if (tab === 'watchlist') return Array.from(favorites).map((t) => STOCK_LIST.find((s) => s.ticker === t)).filter((s): s is Stock => !!s && match(s));
    return STOCK_LIST.filter(match).slice(0, 30);
  }, [search, tab, favorites]);

  const sel = selectedStock;
  const selInfo = sel ? STOCK_LIST.find((s) => s.ticker === sel) : null;

  const top = (
    <>
      <Box i={1}>
        <Text style={k.muted}>Stock Portfolio</Text>
        <Text style={[k.title, k.mono]}>${portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          <Text style={{ color: totalPnL >= 0 ? C.green : C.red, fontWeight: '600' }}>{totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}</Text>
          <Text style={k.muted}>Total P&amp;L</Text>
        </View>
        <Text style={[k.muted, { marginTop: 4 }]}>Buying Power: ${usdBalance.toFixed(2)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Btn label="Buy" icon="arrow-down" style={{ flex: 1 }} onPress={() => openTrade('buy', selectedStock || 'AAPL')} />
          <Btn label="Sell" icon="arrow-up" variant="danger" style={{ flex: 1 }} onPress={() => openTrade('sell', selectedStock || 'AAPL')} />
        </View>
      </Box>
      <View style={[k.rowB, { marginVertical: 8 }]}>
        <Text style={k.h3}>Your Positions</Text>
        <Ionicons name="pie-chart-outline" size={16} color={C.muted} />
      </View>
      {holdingTickers.length === 0 && !holdingsLoading && <Box i={2}><Text style={[k.muted, { textAlign: 'center' }]}>No stock positions yet. Buy your first share!</Text></Box>}
      {holdingTickers.map((t, i) => {
        const h = holdingsMap[t];
        const price = getPrice(t);
        const pnl = h.shares * (price - h.avgPrice);
        const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
        return (
          <Pressable key={t} onPress={() => setSelectedStock(t)}>
            <Box i={2 + i} style={k.rowB}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: SECONDARY, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.text, fontSize: 10, fontWeight: '700' }}>{t.slice(0, 3)}</Text></View>
                <View>
                  <Text style={k.h3}>{STOCK_LIST.find((s) => s.ticker === t)?.name ?? t}</Text>
                  <Text style={k.muted}>{h.shares.toFixed(4)} shares</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[k.text, k.mono]}>${(h.shares * price).toFixed(2)}</Text>
                <Text style={{ color: pnl >= 0 ? C.green : C.red, fontSize: 12 }}>{pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</Text>
              </View>
            </Box>
          </Pressable>
        );
      })}
      <View style={{ marginVertical: 10 }}>
        <Segmented options={[{ value: 'all', label: 'All Stocks' }, { value: 'trending', label: 'Popular' }, { value: 'watchlist', label: 'Watchlist' }]} value={tab} onChange={(v) => setTab(v as typeof tab)} />
      </View>
      <Field placeholder="Search stocks..." value={search} onChangeText={setSearch} autoCapitalize="none" />
    </>
  );

  return (
    <>
      <ListPage
        title="Stocks"
        right={<Badge label="Live" />}
        top={top}
        data={data}
        keyExtractor={(s) => s.ticker}
        renderItem={({ item }) => <StockRow stock={item} price={getPrice(item.ticker)} change={getChange(item.ticker)} isFav={favorites.has(item.ticker)} onFav={toggleFav} onSelect={setSelectedStock} />}
        empty={tab === 'watchlist' && favorites.size === 0 ? <Text style={[k.muted, { textAlign: 'center', padding: 24 }]}>Tap ★ to add stocks to your watchlist</Text> : null}
      />
      <Sheet open={!!sel && !tradeModal} onClose={() => setSelectedStock(null)} title={selInfo?.name}>
        {sel && (
          <>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <Text style={k.muted}>{sel}</Text>
              {selInfo?.sector ? <Badge label={selInfo.sector} color={C.muted} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <Text style={[k.title, k.mono]}>${getPrice(sel).toFixed(2)}</Text>
              <Text style={{ color: getChange(sel) >= 0 ? C.green : C.red }}>{getChange(sel) >= 0 ? '+' : ''}{getChange(sel)}%</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Open', value: `$${(getPrice(sel) * 0.998).toFixed(2)}` },
                { label: 'High', value: `$${(getPrice(sel) * 1.015).toFixed(2)}` },
                { label: 'Low', value: `$${(getPrice(sel) * 0.985).toFixed(2)}` },
                { label: 'Vol', value: `${((Math.abs(sel.charCodeAt(0) * 123456) % 50) + 5).toFixed(1)}M` },
                { label: 'Mkt Cap', value: `$${(getPrice(sel) * ((Math.abs(sel.charCodeAt(0) * 7) % 20) + 1)).toFixed(0)}B` },
                { label: 'P/E', value: (15 + (sel.charCodeAt(0) % 25)).toFixed(1) },
              ].map((st) => (
                <View key={st.label} style={{ width: '31%', backgroundColor: SECONDARY, borderRadius: 10, padding: 8 }}>
                  <Text style={[k.muted, { fontSize: 11 }]}>{st.label}</Text>
                  <Text style={[k.text, { fontSize: 13, fontWeight: '600' }]}>{st.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Btn label="Buy" icon="arrow-down" style={{ flex: 1 }} onPress={() => openTrade('buy', sel)} />
              <Btn label="Sell" icon="arrow-up" variant="danger" style={{ flex: 1 }} onPress={() => openTrade('sell', sel)} />
            </View>
            {holdingsMap[sel] && holdingsMap[sel].shares > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={k.h3}>Your Position</Text>
                <View style={k.rowB}><Text style={k.muted}>Shares</Text><Text style={k.text}>{holdingsMap[sel].shares.toFixed(4)}</Text></View>
                <View style={k.rowB}><Text style={k.muted}>Market Value</Text><Text style={k.text}>${(holdingsMap[sel].shares * getPrice(sel)).toFixed(2)}</Text></View>
                <View style={k.rowB}><Text style={k.muted}>Avg Cost</Text><Text style={k.text}>${holdingsMap[sel].avgPrice.toFixed(2)}</Text></View>
                {(() => {
                  const pnl = holdingsMap[sel].shares * (getPrice(sel) - holdingsMap[sel].avgPrice);
                  return <View style={k.rowB}><Text style={k.muted}>P&amp;L</Text><Text style={{ color: pnl >= 0 ? C.green : C.red }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</Text></View>;
                })()}
              </View>
            )}
          </>
        )}
      </Sheet>
      {tradeModal && <StockTradeModal type={tradeModal.type} ticker={tradeModal.ticker} price={getPrice(tradeModal.ticker)} onClose={() => setTradeModal(null)} />}
    </>
  );
}
