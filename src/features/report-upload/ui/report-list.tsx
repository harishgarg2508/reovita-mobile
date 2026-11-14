import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { useDeleteReport, type ReportListItem } from '@entities/report';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { ConfirmDialog } from '@shared/ui';
import { usePalette } from '@shared/ui/theme';

// The subject's reports, newest first. Only this list scrolls. The next page loads when the user
// reaches the end of the list.
export function ReportList({
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
  footer,
}: {
  footer?: React.ReactNode;
  items: ReportListItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
}) {
  const p = usePalette();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // The report whose "more actions" menu is open.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const router = useRouter();
  const remove = useDeleteReport();
  return (
    <View style={{ flex: 1 }}>
    <FlatList
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (hasMore && !loadingMore) onLoadMore();
      }}
      data={items}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color="#1F6F3F" style={styles.footer} /> : footer ? <>{footer}</> : undefined
      }
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: p.card, borderColor: p.border }]}>
          <Pressable accessibilityRole="button" onPress={() => onOpen(item.id)} style={styles.rowOpen}>
            <Text style={[styles.label, { color: p.text }]}>Report</Text>
            <Text style={[styles.date, { color: p.muted }]}>{formatDate(item.created_at)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More actions"
            onPress={() => setMenuFor(item.id)}
            hitSlop={8}
            style={styles.trash}>
            <Ionicons name="ellipsis-horizontal" size={20} color={p.muted} />
          </Pressable>
        </View>
      )}
    />
      <BottomSheet visible={menuFor !== null} onClose={() => setMenuFor(null)}>
        <View style={styles.menu}>
          {/* Header: the report the actions below apply to. */}
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { color: p.textStrong }]}>Report</Text>
            <Text selectable style={[styles.menuId, { color: p.muted }]}>
              {menuFor ?? ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const id = menuFor;
              setMenuFor(null);
              if (id) router.push({ pathname: '/(app)/reports/[id]', params: { id } });
            }}
            style={styles.menuItem}>
            <Ionicons name="eye-outline" size={20} color={p.textStrong} />
            <Text style={[styles.menuText, { color: p.textStrong }]}>View</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const id = menuFor;
              setMenuFor(null);
              if (id) router.push({ pathname: '/(app)/reports/audit/[id]', params: { id } });
            }}
            style={styles.menuItem}>
            <Ionicons name="list-outline" size={20} color={p.textStrong} />
            <Text style={[styles.menuText, { color: p.textStrong }]}>Audit logs</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const id = menuFor;
              setMenuFor(null);
              if (id) setPendingDelete(id);
            }}
            style={styles.menuItem}>
            <Ionicons name="trash-outline" size={20} color="#C22F43" />
            <Text style={[styles.menuText, { color: '#C22F43' }]}>Delete</Text>
          </Pressable>
        </View>
      </BottomSheet>
      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this report?"
        message="This action cannot be undone. The report, its values and its file will be removed."
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(pendingDelete, { onSettled: () => setPendingDelete(null) });
        }}
        onCancel={() => setPendingDelete(null)}
      />
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
  list: { flex: 1 },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#7545ED' },
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
  rowOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trash: { marginLeft: 12, padding: 4 },
  menu: { gap: 4, paddingBottom: 8 },
  menuHeader: { gap: 2, paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ECEAEF' },
  menuTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  menuId: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 8 },
  menuText: { fontFamily: 'Poppins_500Medium', fontSize: 16 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#242032' },
  date: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#655F74' },
  footer: { paddingVertical: 12 },
});
