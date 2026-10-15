// Virtualised page: header + content scroll with the rows (FlashList recycles off-screen rows).
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/kit';
import { C } from '@/lib/theme';

export function ListPage<T>({ title, sub, right, top, data, renderItem, keyExtractor, empty, footer, back = true, bottomPad = 32 }: {
  back?: boolean; bottomPad?: number; title: string; sub?: string; right?: ReactNode; top?: ReactNode; data: readonly T[]; renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, i: number) => string; empty?: ReactElement | null; footer?: ReactElement | null;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: insets.bottom + bottomPad }}
        ListHeaderComponent={<View><PageHeader title={title} sub={sub} right={right} back={back} />{top}</View>}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
      />
    </View>
  );
}
