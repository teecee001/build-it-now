// Port of src/components/FearGreedGauge.tsx (full + compact) and FearGreedSection.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Box, k } from '@/components/kit';
import { fearGreedTone, useFearGreed } from '@/hooks/useFearGreed';
import { DECELERATE } from '@/lib/motion';
import { C } from '@/lib/theme';

const APath = Animated.createAnimatedComponent(Path);
function polar(cx: number, cy: number, r: number, a: number) {
  const rad = (a * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, r: number, s0: number, e0: number) {
  const s = polar(cx, cy, r, s0);
  const e = polar(cx, cy, r, e0);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${e0 - s0 <= 180 ? 0 : 1} 1 ${e.x} ${e.y}`;
}

function GaugeArc({ value, stroke }: { value: number; stroke: string }) {
  const cx = 100, cy = 100, r = 78;
  const endAngle = 180 - (value / 100) * 180;
  const needle = polar(cx, cy, r - 6, endAngle);
  const len = Math.PI * r * (value / 100);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withTiming(1, { duration: 700, easing: DECELERATE, reduceMotion: ReduceMotion.System });
  }, [value, p]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return (
    <Svg width={200} height={118} viewBox="0 0 200 118">
      <Defs>
        <LinearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
          <Stop offset="35%" stopColor="#f97316" stopOpacity={0.35} />
          <Stop offset="50%" stopColor="#eab308" stopOpacity={0.35} />
          <Stop offset="70%" stopColor="#84cc16" stopOpacity={0.35} />
          <Stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
        </LinearGradient>
      </Defs>
      <Path d={arcPath(cx, cy, r, 180, 0)} fill="none" stroke="url(#fg)" strokeWidth={14} strokeLinecap="round" />
      {value > 0 && <APath d={arcPath(cx, cy, r, 180, endAngle)} fill="none" stroke={stroke} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={ap} />}
      {[0, 25, 50, 75, 100].map((t) => {
        const a = 180 - (t / 100) * 180;
        const o = polar(cx, cy, r + 4, a);
        const i = polar(cx, cy, r - 18, a);
        return <Line key={t} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke={C.text} strokeOpacity={0.2} strokeWidth={1.5} />;
      })}
      <Circle cx={needle.x} cy={needle.y} r={5} fill={stroke} />
      <Circle cx={cx} cy={cy} r={4} fill={C.text} />
    </Svg>
  );
}

function HistoryBars({ history, height = 40 }: { history: { value: number }[]; height?: number }) {
  const slice = history.slice(-14);
  if (slice.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height }}>
      {slice.map((p, i) => (
        <View key={i} style={{ flex: 1, height: `${Math.max(12, p.value)}%`, backgroundColor: fearGreedTone(p.value).stroke, opacity: i === slice.length - 1 ? 1 : 0.45, borderRadius: 2 }} />
      ))}
    </View>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) return <Text style={[k.muted, { fontSize: 11 }]}>— 0 vs yesterday</Text>;
  const up = delta > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={11} color={up ? C.green : C.red} />
      <Text style={{ color: up ? C.green : C.red, fontSize: 11 }}>{up ? '+' : ''}{delta} vs yesterday</Text>
    </View>
  );
}

export function FearGreedGauge({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { data, isLoading, isError, isFetching, refetch } = useFearGreed();
  const tone = data ? fearGreedTone(data.current.value) : null;
  if (isLoading) return <Box i={1} style={{ height: variant === 'full' ? 220 : 72, opacity: 0.5 }}><View /></Box>;
  if (variant === 'compact') {
    if (isError || !data || !tone) return null;
    return (
      <Box i={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: tone.stroke, fontSize: 26, fontWeight: '700' }}>{data.current.value}</Text>
        <View style={{ flex: 1 }}>
          <Text style={k.muted}>Fear &amp; Greed</Text>
          <Text style={[k.h3, { color: tone.stroke }]}>{tone.label}</Text>
          <DeltaBadge delta={data.delta} />
        </View>
        <View style={{ width: 90 }}><HistoryBars history={data.history} height={32} /></View>
      </Box>
    );
  }
  if (isError || !data || !tone) {
    return (
      <Box i={1} style={k.rowB}>
        <Text style={k.muted}>Fear &amp; Greed temporarily unavailable.</Text>
        <Pressable accessibilityLabel="Refresh" onPress={() => refetch()}><Ionicons name="refresh" size={16} color={C.muted} /></Pressable>
      </Box>
    );
  }
  const updated = new Date(data.current.timestamp * 1000);
  return (
    <Box i={1}>
      <View style={k.rowB}>
        <View>
          <Text style={k.h3}>Crypto Fear &amp; Greed</Text>
          <Text style={[k.muted, { fontSize: 11 }]}>Market sentiment · alternative.me</Text>
        </View>
        <Pressable accessibilityLabel="Refresh" disabled={isFetching} onPress={() => refetch()} hitSlop={8}>
          <Ionicons name="refresh" size={16} color={C.muted} />
        </Pressable>
      </View>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <GaugeArc value={data.current.value} stroke={tone.stroke} />
        <View style={{ alignItems: 'center', marginTop: -46 }}>
          <Text style={{ color: tone.stroke, fontSize: 30, fontWeight: '700' }}>{data.current.value}</Text>
          <Text style={k.h3}>{tone.label}</Text>
          <DeltaBadge delta={data.delta} />
        </View>
      </View>
      <View style={[k.rowB, { marginTop: 10, marginBottom: 6 }]}>
        <Text style={[k.muted, { fontSize: 10 }]}>Extreme Fear</Text>
        <Text style={[k.muted, { fontSize: 10 }]}>Neutral</Text>
        <Text style={[k.muted, { fontSize: 10 }]}>Extreme Greed</Text>
      </View>
      <HistoryBars history={data.history} />
      <Text style={[k.muted, { fontSize: 11, marginTop: 6 }]}>14-day history · Updated {updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
    </Box>
  );
}

export function FearGreedSection({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View>
      <FearGreedGauge variant="full" />
      <Box i={2}>
        <Text style={k.h3}>How to read this</Text>
        <Text style={[k.muted, { fontSize: 12, marginTop: 4, lineHeight: 18 }]}>
          The index scores crypto market sentiment from 0 (extreme fear) to 100 (extreme greed) using volatility, volume, social buzz, dominance, and trends. Extreme readings often mark crowded positioning — useful context next to price, not a buy or sell signal.
        </Text>
        <Text style={[k.muted, { fontSize: 11, marginTop: 6 }]}>Source: alternative.me · Refreshes every few minutes</Text>
      </Box>
    </View>
  );
}
