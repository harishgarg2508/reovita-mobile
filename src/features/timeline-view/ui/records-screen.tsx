import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@shared/ui/skeleton';
import { ConfirmDialog } from '@shared/ui';
import { useDeleteReport } from '@entities/report';
import { usePalette, type Palette } from '@shared/ui/theme';

import { downloadReportFile, downloadReportZip } from '../model/download-report-file';
import { useRecords, type RecordItem } from '../model/use-records';

// Records: every uploaded report, newest first. Each card shows the file, its status, the collection date,
// whether it was interpreted, and the lab. View Details opens the results used from that report.
export function RecordsScreen() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const records = useRecords();
  const items = records.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <Text style={styles.title}>Records</Text>
      <Text style={styles.subtitle}>Your uploaded reports and the results taken from each one.</Text>

      {records.isPending ? (
        <View style={styles.loading}>
          <Skeleton height={180} />
          <Skeleton height={180} />
        </View>
      ) : records.isError ? (
        <Text style={styles.empty}>Could not load your records. Reopen this tab to try again.</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No records yet. Upload a lab report to see it here.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + 110 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (records.hasNextPage && !records.isFetchingNextPage) void records.fetchNextPage();
          }}
          ListFooterComponent={records.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={styles.footer} /> : undefined}
          renderItem={({ item }) => <RecordCard record={item} styles={styles} p={p} />}
        />
      )}
    </View>
  );
}

function RecordCard({ record, styles, p }: { record: RecordItem; styles: Styles; p: Palette }) {
  const [open, setOpen] = useState(false);
  const file = record.files[0];
  const isPdf = file?.mime_type === 'application/pdf';
  const processed = statusTone(record.status);
  const [downloading, setDownloading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useDeleteReport();

  // One file downloads straight away. Several files open the picker, which offers each file and a zip of all of them.
  function onDownload() {
    if (!file) return;
    if (record.files.length > 1) {
      setPickerOpen(true);
      return;
    }
    void runDownload(() => downloadReportFile(record.id, file.position, file.mime_type, fileNameFor(record.id, file.position, file.mime_type)));
  }

  async function runDownload(task: () => Promise<void>) {
    setDownloading(true);
    try {
      await task();
    } catch {
      Alert.alert('Download failed', 'The file could not be downloaded. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={styles.card}>
      {/* More: opens a menu with Delete. Delete asks for confirmation first. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        onPress={() => setMenuOpen((v) => !v)}
        hitSlop={8}
        style={styles.moreBtn}>
        <Ionicons name="ellipsis-horizontal" size={20} color={p.muted} />
      </Pressable>
      {menuOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete report"
          onPress={() => {
            setMenuOpen(false);
            setConfirmDelete(true);
          }}
          style={[styles.menu, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="trash-outline" size={16} color="#C22F43" />
          <Text style={styles.menuText}>Delete report</Text>
        </Pressable>
      ) : null}
      <View style={styles.head}>
        <View style={styles.fileTile}>
          <View style={styles.fileBadge}>
            <Text style={styles.fileBadgeText}>{isPdf ? 'PDF' : 'IMG'}</Text>
          </View>
          <View style={styles.checkBadge}>
            <Ionicons name={processed.icon} size={11} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.headText}>
          <Text style={styles.cardTitle}>{file ? (isPdf ? 'PDF Report' : 'Image Report') : 'No file'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={p.muted} />
            <Text style={styles.meta}>
              {formatDate(record.created_at)}
              {file ? ` · ${formatSize(file.size_bytes)}` : ''}
              {file?.page_count ? ` · ${file.page_count} page${file.page_count === 1 ? '' : 's'}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this report?"
        message="This action cannot be undone. The report, its values and its file will be removed."
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={() => remove.mutate(record.id, { onSettled: () => setConfirmDelete(false) })}
        onCancel={() => setConfirmDelete(false)}
      />

      <View style={styles.grid}>
        <View style={styles.gridCell}>
          <Text style={styles.label}>Report Status</Text>
          <View style={[styles.chip, { backgroundColor: processed.bg }]}>
            <Ionicons name={processed.icon} size={13} color={processed.fg} />
            <Text style={[styles.chipText, { color: processed.fg }]}>{processed.label}</Text>
          </View>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.label}>Collected On</Text>
          <View style={styles.valueRow}>
            <Ionicons name="calendar-outline" size={14} color={p.accent} />
            <Text style={styles.value}>{record.collected_on ? formatDate(record.collected_on) : '—'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridCell}>
          <Text style={styles.label}>Interpreted</Text>
          <View style={[styles.chip, { backgroundColor: record.has_interpretation ? p.accentSoft : p.surface }]}>
            <Ionicons name="sparkles" size={13} color={record.has_interpretation ? p.accent : p.muted} />
            <Text style={[styles.chipText, { color: record.has_interpretation ? p.accent : p.muted }]}>
              {record.has_interpretation ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.label}>Lab ID</Text>
          <View style={styles.valueRow}>
            <Ionicons name="flask-outline" size={14} color={p.accent} />
            <Text style={styles.value}>{record.lab_id ?? '—'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Hide details' : 'View details'}
          onPress={() => setOpen((v) => !v)}
          style={styles.detailsBtn}>
          <Ionicons name="eye-outline" size={18} color={p.accent} />
          <Text style={styles.detailsText}>{open ? 'Hide Details' : 'View Details'}</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download the uploaded file"
          disabled={!file || downloading}
          onPress={onDownload}
          style={styles.downloadBtn}>
          {downloading ? (
            <ActivityIndicator color={p.accent} />
          ) : (
            <Ionicons name="download-outline" size={20} color={p.accent} />
          )}
        </Pressable>
      </View>

      {open ? (
        <View style={styles.obsWrap}>
          {record.observations.length === 0 ? (
            <Text style={styles.meta}>No results were read from this report.</Text>
          ) : (
            record.observations.map((o) => (
              <View key={`${o.biomarker_code}-${o.collected_on}`} style={styles.obsRow}>
                <Text style={[styles.obsName, styles.flex]}>{o.name}</Text>
                <Text style={styles.obsValue}>
                  {o.value} {o.unit}
                </Text>
                <Text style={styles.obsRange}>
                  {o.ref_low !== null && o.ref_high !== null ? `${o.ref_low}-${o.ref_high}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      <Modal visible={pickerOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Download report files</Text>
            <Text style={styles.meta}>Choose one file, or download them all in one zip.</Text>
            {record.files.map((f) => {
              const kind = f.mime_type === 'application/pdf' ? 'PDF' : f.mime_type === 'image/png' ? 'PNG' : 'JPG';
              return (
                <Pressable
                  key={f.position}
                  accessibilityRole="button"
                  accessibilityLabel={`Download file ${f.position}`}
                  onPress={() => {
                    setPickerOpen(false);
                    void runDownload(() => downloadReportFile(record.id, f.position, f.mime_type, fileNameFor(record.id, f.position, f.mime_type)));
                  }}
                  style={styles.sheetRow}>
                  <View style={styles.fileTileSmall}>
                    <Text style={styles.fileBadgeText}>{kind}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>File {f.position}</Text>
                    <Text style={styles.meta}>
                      {formatSize(f.size_bytes)}
                      {f.page_count ? ` · ${f.page_count} page${f.page_count === 1 ? '' : 's'}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={p.accent} />
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPickerOpen(false);
                void runDownload(() => downloadReportZip(record.id));
              }}
              style={styles.zipBtn}>
              <Ionicons name="archive-outline" size={18} color="#FFFFFF" />
              <Text style={styles.zipBtnText}>Download all (ZIP)</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// File name shown when saving, e.g. report-4c98ef8d-1.pdf
function fileNameFor(reportId: string, position: number, mimeType: string): string {
  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  return `report-${reportId.slice(0, 8)}-${position}.${ext}`;
}

// Status text and colours for the chip. Matched on the stored status so the labels stay readable.
function statusTone(status: string): { label: string; icon: keyof typeof Ionicons.glyphMap; fg: string; bg: string } {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('interpret')) return { label: 'Processed', icon: 'checkmark-circle', fg: '#1F7A3E', bg: '#E3F6E9' };
  if (s.includes('await') || s.includes('confirm')) return { label: 'Ready to review', icon: 'time-outline', fg: '#7545ED', bg: '#EFEAFD' };
  if (s.includes('retake')) return { label: 'Retake needed', icon: 'refresh-outline', fg: '#B26A00', bg: '#FFF4E0' };
  if (s.includes('fail')) return { label: 'Failed', icon: 'close-circle', fg: '#C22F43', bg: '#FDECEE' };
  return { label: 'Processing', icon: 'hourglass-outline', fg: '#655F74', bg: '#F1EFF5' };
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg, paddingHorizontal: 20, gap: 6 },
    title: { fontSize: 28, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted, marginBottom: 10 },
    flex: { flex: 1 },
    loading: { gap: 12 },
    empty: { fontSize: 14, color: p.muted, marginTop: 12 },
    list: { gap: 14 },
    footer: { paddingVertical: 12 },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 14, position: 'relative' },
    moreBtn: { position: 'absolute', top: 12, right: 12, zIndex: 2, padding: 4 },
    menu: { position: 'absolute', top: 40, right: 12, zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    menuText: { fontSize: 14, fontWeight: '600', color: '#C22F43' },
    head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    fileTile: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: p.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileBadge: { backgroundColor: '#1F7A3E', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    fileBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
    checkBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#1F7A3E',
      borderWidth: 2,
      borderColor: p.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: { flex: 1, gap: 4 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: p.textStrong },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { fontSize: 12.5, color: p.muted },
    grid: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: p.border, paddingTop: 12 },
    gridCell: { flex: 1, gap: 6 },
    label: { fontSize: 12.5, color: p.muted },
    chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    chipText: { fontSize: 13, fontWeight: '700' },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    value: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      height: 50,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: p.accent,
      backgroundColor: p.accentSoft,
      overflow: 'hidden',
    },
    sheetBackdrop: { flex: 1, backgroundColor: p.bg, justifyContent: 'flex-end' },
    sheet: { backgroundColor: p.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: p.textStrong },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: p.border },
    fileTileSmall: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F7A3E', alignItems: 'center', justifyContent: 'center' },
    zipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, backgroundColor: p.accent, marginTop: 4 },
    zipBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    detailsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    actionDivider: { width: 1, backgroundColor: p.accent, opacity: 0.4 },
    downloadBtn: { width: 64, alignItems: 'center', justifyContent: 'center' },
    detailsText: { fontSize: 14.5, fontWeight: '700', color: p.accent },
    obsWrap: { borderTopWidth: 1, borderTopColor: p.border, paddingTop: 10, gap: 8 },
    obsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    obsName: { fontSize: 13, color: p.textStrong },
    obsValue: { fontSize: 13, fontWeight: '700', color: p.textStrong },
    obsRange: { fontSize: 12, color: p.muted, minWidth: 64, textAlign: 'right' },
  });
}
