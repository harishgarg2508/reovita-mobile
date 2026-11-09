import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReportListItem } from '@entities/report';

// The subject's reports, newest first. Each row opens the report.
export function ReportList({
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
}: {
  items: ReportListItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => onOpen(item.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.label}>Report</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </Pressable>
      ))}

      {hasMore ? (
        <Pressable accessibilityRole="button" disabled={loadingMore} onPress={onLoadMore} style={styles.more}>
          <Text style={styles.moreText}>{loadingMore ? 'Loading...' : 'Load more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEAEF',
    backgroundColor: '#FFFFFF',
  },
  pressed: { opacity: 0.85 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#242032' },
  date: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#655F74' },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#7545ED' },
});
