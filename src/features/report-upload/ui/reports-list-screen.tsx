import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReportList } from '@entities/report';
import { Skeleton } from '@shared/ui/skeleton';
import { usePalette } from '@shared/ui/theme';

import { ReportList } from './report-list';

// The reports list only: every report the subject has uploaded, newest first. No upload area here.
export function ReportsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const reports = useReportList();
  const items = reports.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: p.bg,
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Your Reports</Text>
      </View>

      {reports.isPending ? (
        <View style={styles.loading}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : reports.isError ? (
        <Text style={[styles.empty, { color: p.muted }]}>Could not load your reports. Try again.</Text>
      ) : items.length === 0 ? (
        <Text style={[styles.empty, { color: p.muted }]}>You have not uploaded any reports yet.</Text>
      ) : (
        <View style={styles.listFill}>
          <ReportList
            items={items}
            hasMore={reports.hasNextPage}
            loadingMore={reports.isFetchingNextPage}
            onLoadMore={() => void reports.fetchNextPage()}
            onOpen={(id) => router.push({ pathname: '/(app)/reports/[id]', params: { id } })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 26, fontWeight: '800' },
  loading: { gap: 10 },
  listFill: { flex: 1 },
  empty: { fontSize: 14, marginTop: 8 },
});
