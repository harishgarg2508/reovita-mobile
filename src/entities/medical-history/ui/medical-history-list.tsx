import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@shared/ui';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { Skeleton } from '@shared/ui/skeleton';
import { usePalette, type Palette } from '@shared/ui/theme';

import { entryStamp, openMedicalHistoryFile, type MedicalHistoryEntry, type MedicalHistoryFile } from '../model/medical-history.api';
import { useMedicalHistories } from '../model/use-medical-histories';
import { MEDICAL_HISTORY_PAGE_SIZE, useMedicalHistoryPages } from '../model/use-medical-history-pages';

// The latest medical history entry, the earlier ones, and the add button. Add and edit open their own page.
export function MedicalHistoryList() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const { remove } = useMedicalHistories();
  // The entries come one page at a time from the server; "Show more" asks for the next ten.
  const pages = useMedicalHistoryPages(MEDICAL_HISTORY_PAGE_SIZE);
  const list = pages;
  const entries = uniqueById(pages.data?.pages.flat() ?? []);
  const latest = entries[0] ?? null;
  const earlier = entries.slice(1);

  // Deleting is permanent, so the entry is only removed after the user confirms.
  const [pendingDelete, setPendingDelete] = useState<MedicalHistoryEntry | null>(null);
  const confirmDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  };

  const openEdit = (entry: MedicalHistoryEntry) => router.push({ pathname: '/(app)/medical-history-entry', params: { id: entry.id } });
  // The add icon on an entry opens a new entry on that entry's date.
  const openAddOn = (date: string) => router.push({ pathname: '/(app)/medical-history-entry', params: { date } });

  return (
    <View style={styles.wrap}>
      {list.isPending ? (
        <View style={styles.wrap}>
          <Skeleton height={96} />
          <Skeleton height={96} />
        </View>
      ) : null}
      {latest ? (
        <EntryCard entry={latest} label="Latest" styles={styles} defaultOpen onAdd={() => openAddOn(latest.occurred_on)} onEdit={() => openEdit(latest)} onDelete={() => setPendingDelete(latest)} />
      ) : null}
      {!latest && !list.isPending ? <Text style={styles.empty}>No health log entries yet.</Text> : null}

      {earlier.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sub}>Earlier</Text>
          {earlier.map((entry) => (
            <EntryCard key={entry.id} entry={entry} styles={styles} onAdd={() => openAddOn(entry.occurred_on)} onEdit={() => openEdit(entry)} onDelete={() => setPendingDelete(entry)} />
          ))}
        </View>
      ) : null}

      {pages.hasNextPage ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Show more entries" disabled={pages.isFetchingNextPage} onPress={() => void pages.fetchNextPage()} style={styles.addBtn}>
          <Text style={styles.addText}>{pages.isFetchingNextPage ? 'Loading…' : 'Show more'}</Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this entry?"
        message="This health log entry will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

    </View>
  );
}

// One action in the entry's drawer: an icon and its label, a full-width row.
function ActionRow({ icon, label, danger = false, styles, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; styles: Styles; onPress: () => void }) {
  const p = usePalette();
  const color = danger ? '#C22F43' : p.accent;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.sheetRow}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.sheetRowText, { color: danger ? '#C22F43' : p.textStrong }]}>{label}</Text>
    </Pressable>
  );
}

// Each entry once: a page that repeats an entry would otherwise show it twice.
function uniqueById(items: MedicalHistoryEntry[]): MedicalHistoryEntry[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

function EntryCard({
  entry,
  label,
  styles,
  onAdd,
  onEdit,
  onDelete,
  defaultOpen = false,
}: {
  entry: MedicalHistoryEntry;
  label?: string;
  styles: Styles;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  defaultOpen?: boolean;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(defaultOpen);
  const [actionsOpen, setActionsOpen] = useState(false);

  async function viewFile(entryId: string, file: MedicalHistoryFile) {
    try {
      await openMedicalHistoryFile(entryId, file);
    } catch {
      Alert.alert('Could not open this file', 'Check your connection and try again.');
    }
  }
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{entry.title}</Text>
        {label ? <Text style={styles.badge}>{label}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="More actions for this entry" onPress={() => setActionsOpen(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={p.accent} />
        </Pressable>
      </View>
      {/* The actions for this entry, in a drawer that slides up from the bottom. */}
      <BottomSheet visible={actionsOpen} onClose={() => setActionsOpen(false)}>
        <Text style={styles.sheetTitle}>{entry.title}</Text>
        <ActionRow icon={open ? 'eye-off-outline' : 'eye-outline'} label={open ? 'Hide details' : 'View details'} styles={styles} onPress={() => { setActionsOpen(false); setOpen((v) => !v); }} />
        <ActionRow icon="add-circle-outline" label="Add an entry on this date" styles={styles} onPress={() => { setActionsOpen(false); onAdd(); }} />
        <ActionRow icon="create-outline" label="Edit entry" styles={styles} onPress={() => { setActionsOpen(false); onEdit(); }} />
        <ActionRow icon="trash-outline" label="Delete entry" danger styles={styles} onPress={() => { setActionsOpen(false); onDelete(); }} />
      </BottomSheet>
      <Text style={styles.cardDate}>
        {formatDate(entry.occurred_on)}
        {entry.occurred_time ? ` · ${entry.occurred_time}` : ''}
      </Text>
      <Text style={styles.cardDate}>{entryStamp(entry)}</Text>
      {(entry.files ?? []).length > 0 ? (
        <View style={styles.fileList}>
          {(entry.files ?? []).map((file) => (
            <View key={file.id} style={styles.fileItem}>
              <Ionicons name={file.kind === 'report' ? 'document-text-outline' : 'medkit-outline'} size={16} color={p.accent} />
              <View style={styles.fileText}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileKind}>{file.kind === 'report' ? 'Report' : 'Prescription'}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${file.name}`} onPress={() => void viewFile(entry.id, file)} hitSlop={8}>
                <Ionicons name="eye-outline" size={18} color={p.accent} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {open ? (
        (entry.medicines ?? []).length > 0 ? (
          (entry.medicines ?? []).map((m, i) => (
            <Text key={`${m.name}-${i}`} style={styles.medLine}>
              {m.name}
              {m.dose ? ` · ${m.dose}` : ''}
            </Text>
          ))
        ) : (
          <Text style={styles.medLine}>No medicines recorded</Text>
        )
      ) : null}
    </View>
  );
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: 10, marginTop: 8 },
    sub: { fontSize: 13, fontWeight: '700', color: p.muted },
    empty: { fontSize: 13, color: p.muted },
    list: { gap: 8 },
    card: { backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: 14, gap: 4 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sheetTitle: { fontSize: 15, fontWeight: '700', color: p.textStrong, paddingBottom: 8 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border },
    sheetRowText: { fontSize: 15, fontWeight: '600' },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: p.textStrong },
    badge: { fontSize: 11, fontWeight: '700', color: p.accent, backgroundColor: p.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    cardDate: { fontSize: 12.5, color: p.muted },
    medLine: { fontSize: 13, color: p.text },
    fileList: { gap: 6, marginTop: 4 },
    fileItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface },
    fileText: { flex: 1 },
    fileName: { fontSize: 13, fontWeight: '600', color: p.textStrong },
    fileKind: { fontSize: 11.5, color: p.muted },
    fileChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    fileChip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
    fileChipText: { fontSize: 11.5, color: p.text, flexShrink: 1 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: p.accent, paddingHorizontal: 14 },
    addText: { fontSize: 14, fontWeight: '700', color: p.accent },
  });
}
