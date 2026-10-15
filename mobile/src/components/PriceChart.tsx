// Native replacement for src/components/TradingViewChart.tsx: same CoinGecko endpoints and
// fallback series, drawn with react-native-svg (area or candlestick).
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { AreaChart } from '@/components/Chart';
import { COINGECKO_IDS } from '@/constants/cryptoIds';
import { C } from '@/lib/theme';

type Candle = [number, number, number, number, number];

export function PriceChart({ code, height = 280, days = 30, type = 'area' }: { code: string; height?: number; days?: number; type?: 'area' | 'candlestick' }) {
  const [line, setLine] = useState<number[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [w, setW] = useState(0);
  useEffect(() => {
    let off = false;
    const geckoId = COINGECKO_IDS[code];
    (async () => {
      try {
        if (type === 'candlestick') {
          const res = await fetch(`https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`);
          if (!res.ok) throw new Error('fetch failed');
          const raw: Candle[] = await res.json();
          if (!off) setCandles(raw);
        } else {
          const res = await fetch(`https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`);
          if (!res.ok) throw new Error('fetch failed');
          const json = await res.json();
          const seen = new Set<number>();
          const out: number[] = [];
          for (const [ts, price] of json.prices as [number, number][]) {
            const d = Math.floor(ts / 86400000);
            if (!seen.has(d)) { seen.add(d); out.push(price); }
          }
          if (!off) setLine(out);
        }
      } catch {
        const base = code === 'BTC' ? 67000 : code === 'ETH' ? 1900 : 100;
        const seed = code.charCodeAt(0) + code.charCodeAt(1);
        if (!off) {
          setCandles([]);
          setLine(Array.from({ length: days }, (_, i) => base * (1 + Math.sin(seed + i * 0.3) * 0.05 + (i / days) * 0.03)));
        }
      }
    })();
    return () => { off = true; };
  }, [code, days, type]);

  if (type === 'candlestick' && candles.length) {
    const hi = Math.max(...candles.map((c) => c[2]));
    const lo = Math.min(...candles.map((c) => c[3]));
    const y = (v: number) => ((hi - v) / (hi - lo || 1)) * (height - 8) + 4;
    const step = w / candles.length;
    return (
      <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Svg width={w} height={height}>
            {candles.map(([t, o, h, l, c], i) => {
              const up = c >= o;
              const col = up ? '#22c55e' : '#ef4444';
              const x = i * step + step / 2;
              return (
                <G key={t}>
                  <Line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth={1} />
                  <Rect x={x - Math.max(1, step * 0.3)} width={Math.max(2, step * 0.6)} y={y(Math.max(o, c))} height={Math.max(1, Math.abs(y(o) - y(c)))} fill={col} />
                </G>
              );
            })}
          </Svg>
        )}
      </View>
    );
  }
  const up = line.length >= 2 && line[line.length - 1] >= line[0];
  return line.length ? <AreaChart values={line} height={height} color={up ? '#22c55e' : '#ef4444'} /> : <View style={{ height, backgroundColor: C.card }} />;
}
