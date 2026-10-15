// Lightweight SVG charts (no web chart library). The reveal is a clip that grows on the UI
// thread via Reanimated, the native counterpart of the web ChartReveal.
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';

import { DECELERATE } from '@/lib/motion';
import { C } from '@/lib/theme';

function paths(values: number[], w: number, h: number, pad = 4) {
  if (values.length < 2 || w <= 0) return { line: '', area: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, pad + (1 - (v - min) / span) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${w},${h} L0,${h} Z` };
}

export function AreaChart({ values, height = 180, color = C.green, labels }: { values: number[]; height?: number; color?: string; labels?: { left?: string; right?: string; top?: string; bottom?: string } }) {
  const [w, setW] = useState(0);
  const reveal = useSharedValue(0);
  const key = values.length + ':' + (values[values.length - 1] ?? 0);
  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 700, easing: DECELERATE, reduceMotion: ReduceMotion.System });
  }, [key, reveal]);
  const clip = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));
  const { line, area } = paths(values, w, height);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: height + (labels ? 16 : 0) }}>
      <Animated.View style={[{ height, overflow: 'hidden' }, clip]}>
        {w > 0 && (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.05" stopColor={color} stopOpacity={0.3} />
                <Stop offset="0.95" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke={C.border} strokeDasharray="3 3" />
            ))}
            <Path d={area} fill="url(#g)" />
            <Path d={line} stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        )}
      </Animated.View>
      {labels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: C.muted, fontSize: 10 }}>{labels.left}</Text>
          <Text style={{ color: C.muted, fontSize: 10 }}>{labels.right}</Text>
        </View>
      )}
    </View>
  );
}

export function Sparkline({ values, width = 64, height = 24, color }: { values: number[]; width?: number; height?: number; color?: string }) {
  const up = values.length > 1 && values[values.length - 1] >= values[0];
  const { line } = paths(values, width, height, 2);
  if (!line) return <View style={{ width, height }} />;
  return (
    <Svg width={width} height={height}>
      <Path d={line} stroke={color ?? (up ? C.green : C.red)} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

/** Donut chart (web: recharts Pie innerRadius 30 / outerRadius 55). Scales in on the UI thread. */
export function Donut({ data, colors, size = 120 }: { data: number[]; colors: string[]; size?: number }) {
  const s = useSharedValue(0.6);
  useEffect(() => {
    s.value = withTiming(1, { duration: 500, easing: DECELERATE, reduceMotion: ReduceMotion.System });
  }, [s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * -90}deg` }], opacity: s.value }));
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const r = (size * 0.77) / 2 - (size * 0.23) / 2;
  const sw = size * 0.23;
  const circ = 2 * Math.PI * r;
  const offsets = data.reduce<number[]>((a, v, i) => [...a, i === 0 ? 0 : a[i - 1] + (data[i - 1] / total) * circ], []);
  return (
    <Animated.View style={[{ width: size, height: size }, st]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {data.map((v, i) => {
          const len = (v / total) * circ;
          return <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={colors[i % colors.length]} strokeWidth={sw} fill="none" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offsets[i]} />;
        })}
      </Svg>
    </Animated.View>
  );
}

/** Grouped bar chart (web: recharts BarChart with two series). Grows from the baseline on the UI thread. */
export function Bars({ rows, series, height = 180 }: { rows: { name: string; [k: string]: number | string }[]; series: { key: string; color: string; name: string }[]; height?: number }) {
  const [w, setW] = useState(0);
  const g = useSharedValue(0);
  useEffect(() => {
    g.value = 0;
    g.value = withTiming(1, { duration: 600, easing: DECELERATE, reduceMotion: ReduceMotion.System });
  }, [rows, g]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - g.value) * (height - 20) / 2 }, { scaleY: Math.max(g.value, 0.001) }] }));
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)));
  const plotH = height - 20;
  const slot = rows.length ? w / rows.length : 0;
  const bw = Math.max(4, Math.min(24, (slot - 16) / series.length - 4));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <>
          <Animated.View style={st}>
            <Svg width={w} height={plotH}>
              {[0.25, 0.5, 0.75].map((f) => <Line key={f} x1={0} x2={w} y1={plotH * f} y2={plotH * f} stroke={C.border} strokeDasharray="3 3" />)}
              {rows.map((r, i) =>
                series.map((s, j) => {
                  const v = Number(r[s.key]) || 0;
                  const h = (v / max) * (plotH - 4);
                  const x = i * slot + (slot - series.length * (bw + 4)) / 2 + j * (bw + 4);
                  return <Rect key={`${i}-${s.key}`} x={x} y={plotH - h} width={bw} height={h} rx={3} fill={s.color} />;
                })
              )}
            </Svg>
          </Animated.View>
          <View style={{ flexDirection: 'row' }}>
            {rows.map((r) => <Text key={r.name} style={{ width: slot, textAlign: 'center', color: C.muted, fontSize: 10, marginTop: 4 }}>{r.name}</Text>)}
          </View>
        </>
      )}
    </View>
  );
}
