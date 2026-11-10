import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from 'react-native';

import type { ReportListItem } from '@entities/report';

// The subject's reports, newest first. Only this list scrolls. The next page loads when the user
// reaches the end of the list.
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
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (hasMore && !loadingMore) onLoadMore();
      }}
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#7545ED" style={styles.footer} /> : undefined}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(item.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.label}>Report</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </Pressable>
      )}
    />
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { gap: 10, paddingBottom: 16 },
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
  footer: { paddingVertical: 12 },
});
