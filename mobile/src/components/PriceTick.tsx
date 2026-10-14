import { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import { C } from '@/lib/theme';

/** Price with digit tint: digits that changed since the last poll flash green (up) or red (down). */
export function PriceTick({ value, text, style }: { value: number; text: string; style?: TextStyle }) {
  const prev = useRef<{ v: number; t: string } | null>(null);
  const [tint, setTint] = useState<{ from: number; color: string } | null>(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = { v: value, t: text };
    if (!p || p.v === value) return;
    let i = 0;
    while (i < text.length && text[i] === p.t[i]) i++;
    setTint({ from: i, color: value > p.v ? C.green : C.red });
    const id = setTimeout(() => setTint(null), 900);
    return () => clearTimeout(id);
  }, [value, text]);
  if (!tint) return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{text}</Text>;
  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {text.slice(0, tint.from)}
      <Text style={{ color: tint.color }}>{text.slice(tint.from)}</Text>
    </Text>
  );
}
