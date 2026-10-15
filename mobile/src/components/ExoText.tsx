import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';

import { C } from '@/lib/theme';

/** Inline markdown: **bold** and [label](url) links (Exo's sources open in the in-app browser). */
function Inline({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
        if (link)
          return (
            <Text key={i} style={{ color: C.green, textDecorationLine: 'underline' }} onPress={() => { WebBrowser.openBrowserAsync(link[2]).catch(() => undefined); }}>
              {link[1]}
            </Text>
          );
        if (/^\*\*[^*]+\*\*$/.test(p)) return <Text key={i} style={{ fontWeight: '700', color }}>{p.slice(2, -2)}</Text>;
        return p;
      })}
    </>
  );
}

/** Minimal block markdown for Exo replies: headings, bullet/numbered lists, quotes, rules, paragraphs. */
export function Rich({ text, mine }: { text: string; mine: boolean }) {
  const color = mine ? C.bg : C.text;
  const base = { color, fontSize: 15, lineHeight: 21 } as const;
  if (mine) return <Text style={base}>{text}</Text>;
  return (
    <View style={{ gap: 6 }}>
      {text.split('\n').map((raw, i) => {
        const line = raw.replace(/\s+$/, '');
        if (!line.trim()) return null;
        if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) return <View key={i} style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />;
        const h = line.match(/^#{1,6}\s+(.*)$/);
        if (h) return <Text key={i} style={[base, { fontWeight: '700', fontSize: 16, marginTop: 4 }]}><Inline text={h[1].replace(/\*\*/g, '')} color={color} /></Text>;
        const li = line.match(/^(\s*)([*\-+]|\d+[.)])\s+(.*)$/);
        if (li) {
          const indent = Math.min(3, Math.floor(li[1].length / 2));
          const marker = /\d/.test(li[2]) ? li[2] : '•';
          return (
            <View key={i} style={{ flexDirection: 'row', paddingLeft: indent * 14 }}>
              <Text style={[base, { width: 22 }]}>{marker}</Text>
              <Text style={[base, { flex: 1 }]}><Inline text={li[3]} color={color} /></Text>
            </View>
          );
        }
        const q = line.match(/^>\s?(.*)$/);
        if (q) return <Text key={i} style={[base, { color: C.muted, borderLeftWidth: 2, borderLeftColor: C.border, paddingLeft: 8 }]}><Inline text={q[1]} color={C.muted} /></Text>;
        return <Text key={i} style={base}><Inline text={line} color={color} /></Text>;
      })}
    </View>
  );
}

