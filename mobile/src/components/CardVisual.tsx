// Native rendering of the web card designs (src/pages/CardPage.tsx CARD_DESIGNS): same gradients via SVG.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { CardData } from '@/hooks/useCard';

type Glow = { x: number; y: number; r: number; color: string; a: number };
export const CARD_DESIGNS: { id: string; name: string; from: string; to: string; glows: Glow[]; border: string }[] = [
  { id: 'classic-dark', name: 'Classic Dark', from: 'hsl(240, 6%, 14%)', to: 'hsl(240, 6%, 8%)', glows: [{ x: 30, y: 70, r: 50, color: 'hsl(220, 80%, 55%)', a: 0.3 }], border: 'hsl(240, 4%, 22%)' },
  { id: 'midnight-blue', name: 'Midnight Blue', from: 'hsl(220, 50%, 15%)', to: 'hsl(230, 60%, 8%)', glows: [{ x: 70, y: 30, r: 60, color: 'hsl(210, 90%, 50%)', a: 0.4 }], border: 'hsl(220, 40%, 25%)' },
  { id: 'emerald', name: 'Emerald', from: 'hsl(160, 30%, 12%)', to: 'hsl(150, 40%, 6%)', glows: [{ x: 20, y: 80, r: 50, color: 'hsl(142, 71%, 45%)', a: 0.4 }, { x: 80, y: 20, r: 50, color: 'hsl(160, 60%, 40%)', a: 0.2 }], border: 'hsl(150, 30%, 20%)' },
  { id: 'rose-gold', name: 'Rose Gold', from: 'hsl(350, 20%, 16%)', to: 'hsl(340, 15%, 8%)', glows: [{ x: 60, y: 40, r: 55, color: 'hsl(350, 60%, 55%)', a: 0.3 }], border: 'hsl(350, 20%, 25%)' },
  { id: 'arctic', name: 'Arctic', from: 'hsl(200, 20%, 18%)', to: 'hsl(210, 25%, 10%)', glows: [{ x: 40, y: 60, r: 50, color: 'hsl(195, 80%, 60%)', a: 0.3 }, { x: 80, y: 20, r: 50, color: 'hsl(180, 50%, 50%)', a: 0.15 }], border: 'hsl(200, 20%, 28%)' },
  { id: 'sunset', name: 'Sunset', from: 'hsl(25, 40%, 14%)', to: 'hsl(15, 30%, 7%)', glows: [{ x: 30, y: 70, r: 55, color: 'hsl(30, 80%, 50%)', a: 0.35 }, { x: 80, y: 30, r: 50, color: 'hsl(350, 60%, 50%)', a: 0.2 }], border: 'hsl(25, 30%, 22%)' },
  { id: 'purple-haze', name: 'Purple Haze', from: 'hsl(270, 30%, 15%)', to: 'hsl(280, 25%, 7%)', glows: [{ x: 50, y: 50, r: 55, color: 'hsl(270, 70%, 55%)', a: 0.35 }], border: 'hsl(270, 25%, 23%)' },
  { id: 'stealth', name: 'Stealth', from: 'hsl(0, 0%, 10%)', to: 'hsl(0, 0%, 4%)', glows: [{ x: 50, y: 50, r: 60, color: 'hsl(0, 0%, 30%)', a: 0.15 }], border: 'hsl(0, 0%, 16%)' },
];
export const getCardDesign = (id?: string) => CARD_DESIGNS.find((d) => d.id === id) || CARD_DESIGNS[0];

export function DesignBg({ design, id }: { design: (typeof CARD_DESIGNS)[number]; id: string }) {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 63">
      <Defs>
        <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={design.from} />
          <Stop offset="1" stopColor={design.to} />
        </LinearGradient>
        {design.glows.map((g, i) => (
          <RadialGradient key={i} id={`${id}-g${i}`} cx={`${g.x}%`} cy={`${g.y}%`} r={`${g.r}%`}>
            <Stop offset="0" stopColor={g.color} stopOpacity={g.a} />
            <Stop offset="1" stopColor={g.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x="0" y="0" width="100" height="63" fill={`url(#${id}-bg)`} />
      {design.glows.map((_, i) => <Rect key={i} x="0" y="0" width="100" height="63" fill={`url(#${id}-g${i})`} />)}
    </Svg>
  );
}

export function CardVisual({ c, compact = false }: { c: CardData; compact?: boolean }) {
  const expiry = `${String(c.expiry_month).padStart(2, '0')}/${String(c.expiry_year).slice(-2)}`;
  const isVirtual = c.card_format === 'virtual';
  const design = getCardDesign(c.card_design || 'classic-dark');
  return (
    <View style={{ aspectRatio: 1.586, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: design.border, padding: 18, justifyContent: 'space-between' }}>
      <DesignBg design={design} id={`c${c.id.slice(0, 8)}`} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Ξ╳</Text>
          </View>
          <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 2, fontSize: 12 }}>Ξ╳OSKY</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {c.is_frozen && <Ionicons name="snow" size={14} color="#93C5FD" />}
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{isVirtual ? 'VIRTUAL' : 'METAL'}</Text>
        </View>
      </View>
      {!compact && (isVirtual ? <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: '90deg' }] }} /> : <View style={{ width: 36, height: 26, borderRadius: 5, backgroundColor: '#D4AF37', opacity: 0.8 }} />)}
      <View>
        <Text style={{ color: '#fff', fontSize: compact ? 16 : 20, letterSpacing: 3, fontVariant: ['tabular-nums'] }}>•••• {c.card_number_last4}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{c.card_name || (isVirtual ? 'Virtual' : 'Physical')}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{expiry}</Text>
          <Text style={{ color: '#fff', fontStyle: 'italic', fontWeight: '800', fontSize: 16 }}>VISA</Text>
        </View>
      </View>
    </View>
  );
}
