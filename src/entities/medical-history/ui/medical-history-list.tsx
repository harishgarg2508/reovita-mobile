import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';

import { entryStamp, type MedicalHistoryEntry } from '../model/medical-history.api';
import { useMedicalHistories } from '../model/use-medical-histories';

// The latest medical history entry, the earlier ones, and the add button. Add and edit open their own page.
export function MedicalHistoryList() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const { list, remove } = useMedicalHistories();

  const entries = list.data ?? [];
  const latest = entries[0] ?? null;
  const earlier = entries.slice(1);
  const todayIso = new Date().toISOString().slice(0, 10);

  // Deleting is permanent, so the entry is only removed after the user confirms.
  const [pendingDelete, setPendingDelete] = useState<MedicalHistoryEntry | null>(null);
  const confirmDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  };

  const openEdit = (entry: MedicalHistoryEntry) => router.push({ pathname: '/(app)/medical-history-entry', params: { id: entry.id } });
  const openAdd = () => router.push({ pathname: '/(app)/medical-history-entry', params: { date: todayIso } });

  return (
    <View style={styles.wrap}>
      {latest ? (
        <EntryCard entry={latest} label="Latest" styles={styles} defaultOpen onEdit={() => openEdit(latest)} onDelete={() => setPendingDelete(latest)} />
      ) : null}
      {!latest && !list.isPending ? <Text style={styles.empty}>No medical history entries yet.</Text> : null}

      {earlier.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sub}>Earlier</Text>
          {earlier.map((entry) => (
            <EntryCard key={entry.id} entry={entry} styles={styles} onEdit={() => openEdit(entry)} onDelete={() => setPendingDelete(entry)} />
          ))}
        </View>
      ) : null}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this entry?"
        message="This medical history entry will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <Pressable accessibilityRole="button" onPress={openAdd} style={styles.addBtn}>
        <Ionicons name="add-circle-outline" size={18} color={p.accent} />
        <Text style={styles.addText}>Add medical history</Text>
      </Pressable>
    </View>
  );
}

function EntryCard({
  entry,
  label,
  styles,
  onEdit,
  onDelete,
  defaultOpen = false,
}: {
  entry: MedicalHistoryEntry;
  label?: string;
  styles: Styles;
  onEdit: () => void;
  onDelete: () => void;
  defaultOpen?: boolean;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{entry.title}</Text>
        {label ? <Text style={styles.badge}>{label}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Hide details' : 'View details'} onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Ionicons name={open ? 'eye-off-outline' : 'eye-outline'} size={18} color={p.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit entry" onPress={onEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={17} color={p.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete entry" onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color="#C22F43" />
        </Pressable>
      </View>
      <Text style={styles.cardDate}>
        {formatDate(entry.occurred_on)}
        {entry.occurred_time ? ` · ${entry.occurred_time}` : ''}
      </Text>
      <Text style={styles.cardDate}>{entryStamp(entry)}</Text>
      {entry.files.length > 0 ? (
        <View style={styles.fileChips}>
          {entry.files.map((file) => (
            <View key={file.id} style={styles.fileChip}>
              <Ionicons name={file.kind === 'report' ? 'document-text-outline' : 'medkit-outline'} size={13} color={p.accent} />
              <Text style={styles.fileChipText} numberOfLines={1}>
                {file.kind === 'report' ? 'Report' : 'Prescription'} · {file.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {open ? (
        entry.medicines.length > 0 ? (
          entry.medicines.map((m, i) => (
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
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: p.textStrong },
    badge: { fontSize: 11, fontWeight: '700', color: p.accent, backgroundColor: p.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    cardDate: { fontSize: 12.5, color: p.muted },
    medLine: { fontSize: 13, color: p.text },
    fileChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    fileChip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
    fileChipText: { fontSize: 11.5, color: p.text, flexShrink: 1 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: p.accent, paddingHorizontal: 14 },
    addText: { fontSize: 14, fontWeight: '700', color: p.accent },
  });
}
