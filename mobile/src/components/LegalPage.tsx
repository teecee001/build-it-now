import { Text, View } from 'react-native';

import { Box, k, Page } from '@/components/kit';
import { C } from '@/lib/theme';

export function LegalPage({ title, updated, lead, leadRest, sections }: { title: string; updated: string; lead: string; leadRest: string; sections: { title: string; content: string | null; list?: string[] }[] }) {
  return (
    <Page title={title} sub={updated}>
      <Box i={1} tint={C.green}>
        <Text style={[k.text, { fontSize: 13, lineHeight: 19 }]}>
          <Text style={{ fontWeight: '700' }}>{lead}</Text> {leadRest}
        </Text>
      </Box>
      {sections.map((s) => (
        <View key={s.title} style={{ marginBottom: 18 }}>
          <Text style={[k.h3, { marginBottom: 6 }]}>{s.title}</Text>
          {s.content ? <Text style={[k.muted, { lineHeight: 20 }]}>{s.content}</Text> : null}
          {s.list?.map((item, i) => (
            <Text key={i} style={[k.muted, { lineHeight: 20 }]}>•  {item}</Text>
          ))}
        </View>
      ))}
    </Page>
  );
}
