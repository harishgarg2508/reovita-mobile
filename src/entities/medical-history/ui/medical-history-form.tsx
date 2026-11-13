import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type CSSProperties } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isApiError } from '@shared/api';
import { usePalette, type Palette } from '@shared/ui/theme';

import {
  createMedicalHistory,
  deleteMedicalHistoryFile,
  updateMedicalHistory,
  uploadMedicalHistoryFile,
  type MedicalHistoryEntry,
  type MedicalHistoryFile,
  type MedicalHistoryFileKind,
} from '../model/medical-history.api';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Local calendar date as YYYY-MM-DD (no UTC shift).
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Local clock time as HH:MM.
function clockOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// A YYYY-MM-DD string as a local Date, for the picker.
function dateFrom(iso: string): Date {
  return DATE.test(iso) ? new Date(`${iso}T00:00:00`) : new Date();
}

// An HH:MM string as a Date on today, for the picker.
function timeFrom(hhmm: string): Date {
  const d = new Date();
  if (TIME.test(hhmm)) {
    const [h, m] = hhmm.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

function displayDate(iso: string): string {
  const date = dateFrom(iso);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A file chosen for this entry. It is uploaded when the entry is saved.
interface PendingFile {
  uri: string;
  name: string;
  type: string;
  kind: MedicalHistoryFileKind;
}

// The form to add or edit one medical history event. Date and time use the device pickers.
// Time, medicines and files are optional. The Cancel and Save actions sit in a bar pinned to the bottom.
export function MedicalHistoryForm({
  initialDate,
  onClose,
  entry,
}: {
  initialDate: string;
  onClose: () => void;
  // When given, the form edits this entry instead of adding a new one.
  entry?: MedicalHistoryEntry;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const queryClient = useQueryClient();
  // Set once the entry exists on the server, so a failed file upload does not create the entry twice.
  const [entryId, setEntryId] = useState<string | null>(entry?.id ?? null);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [date, setDate] = useState(entry?.occurred_on ?? initialDate);
  const [time, setTime] = useState(entry?.occurred_time ?? '');
  const initialMedicines = entry && entry.medicines.length > 0 ? entry.medicines.map((m) => ({ name: m.name, dose: m.dose ?? '' })) : [{ name: '', dose: '' }];
  const [medicines, setMedicines] = useState<{ name: string; dose: string }[]>(initialMedicines);
  const [files, setFiles] = useState<MedicalHistoryFile[]>(entry?.files ?? []);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [saving, setSaving] = useState(false);
  // Required fields that are still empty, shown with a red border.
  const [invalid, setInvalid] = useState<{ title?: boolean; date?: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') setShowDate(false);
    if (event.type === 'set' && selected) setDate(isoOf(selected));
  }

  function onTimeChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') setShowTime(false);
    if (event.type === 'set' && selected) setTime(clockOf(selected));
  }

  async function pickFile(kind: MedicalHistoryFileKind) {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || picked.assets.length === 0) return;
    const asset = picked.assets[0];
    setPending((all) => [...all, { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream', kind }]);
  }

  // Puts the text fields back to what was saved (or blank for a new entry). Files already saved are kept,
  // because they are removed on the server as soon as they are deleted; queued files are dropped.
  function resetFields() {
    setTitle(entry?.title ?? '');
    setDate(entry?.occurred_on ?? initialDate);
    setTime(entry?.occurred_time ?? '');
    setMedicines(initialMedicines);
    setPending([]);
    setInvalid({});
    setError(null);
  }

  async function removeSavedFile(file: MedicalHistoryFile) {
    if (!entryId) return;
    setError(null);
    try {
      await deleteMedicalHistoryFile(entryId, file.id);
      setFiles((all) => all.filter((f) => f.id !== file.id));
      void queryClient.invalidateQueries({ queryKey: ['medical-histories'] });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not remove this file. Try again.');
    }
  }

  async function save() {
    setError(null);
    // Required fields are outlined in red instead of a message at the bottom.
    const missing = { title: !title.trim(), date: !DATE.test(date) };
    setInvalid(missing);
    if (missing.title || missing.date) return;
    const body = {
      title: title.trim(),
      occurred_on: date,
      occurred_time: time || null,
      medicines: medicines.filter((m) => m.name.trim()).map((m) => ({ name: m.name.trim(), dose: m.dose.trim() || null })),
    };
    setSaving(true);
    try {
      const saved = entryId ? await updateMedicalHistory(entryId, body) : await createMedicalHistory(body);
      setEntryId(saved.id);
      void queryClient.invalidateQueries({ queryKey: ['medical-histories'] });
      for (const file of pending) {
        const uploaded = await uploadMedicalHistoryFile(saved.id, file, file.kind);
        setPending((all) => all.filter((f) => f !== file));
        setFiles((all) => [...all, uploaded]);
      }
      void queryClient.invalidateQueries({ queryKey: ['medical-histories'] });
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save this entry. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.dialog} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.dialogContent}>
        <View style={styles.dialogHead}>
          <Text style={styles.dialogTitle}>{entry ? 'Edit medical history' : 'Add medical history'}</Text>
          <View style={styles.headActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reset fields" onPress={resetFields} hitSlop={8}>
              <Text style={styles.closeText}>Reset</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              if (invalid.title) setInvalid((s) => ({ ...s, title: false }));
            }}
            placeholder="Fever"
            placeholderTextColor={p.muted}
            style={[styles.input, invalid.title && styles.inputError]}
          />

          <Text style={styles.label}>Date</Text>
          {Platform.OS === 'web' ? (
            // The browser's own date input. The native picker below is only available on the phone.
            <input
              type="date"
              aria-label="Date"
              value={date}
              max={isoOf(new Date())}
              onChange={(e) => setDate(e.target.value)}
              onClick={openWebPicker}
              style={webField(p, invalid.date)}
            />
          ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose date" onPress={() => setShowDate((open) => !open)} style={[styles.input, styles.row, invalid.date && styles.inputError]}>
            <Text style={styles.valueText}>{displayDate(date)}</Text>
            <Ionicons name="calendar-outline" size={18} color={p.accent} />
          </Pressable>
          )}
          {Platform.OS !== 'web' && showDate ? (
            <DateTimePicker
              value={dateFrom(date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          ) : null}

          <View style={styles.labelRow}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.optional}>Optional</Text>
          </View>
          {Platform.OS === 'web' ? (
            <input type="time" aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} onClick={openWebPicker} style={webField(p, false)} />
          ) : (
          <View style={[styles.input, styles.row]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose time" onPress={() => setShowTime((open) => !open)} style={styles.rowGrow}>
              <Text style={time ? styles.valueText : styles.placeholderText}>{time || 'Add a time'}</Text>
            </Pressable>
            {time ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear time" onPress={() => setTime('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={p.muted} />
              </Pressable>
            ) : (
              <Ionicons name="time-outline" size={18} color={p.accent} />
            )}
          </View>
          )}
          {Platform.OS !== 'web' && showTime ? (
            <DateTimePicker value={timeFrom(time)} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} />
          ) : null}

          <View style={styles.labelRow}>
            <Text style={styles.label}>Medicines</Text>
            <Text style={styles.optional}>Optional</Text>
          </View>
          {medicines.map((m, i) => (
            <View key={i} style={styles.medRow}>
              <TextInput
                value={m.name}
                onChangeText={(v) => setMedicines((all) => all.map((x, j) => (j === i ? { ...x, name: v } : x)))}
                placeholder="Name"
                placeholderTextColor={p.muted}
                style={[styles.input, styles.flex]}
              />
              <TextInput
                value={m.dose}
                onChangeText={(v) => setMedicines((all) => all.map((x, j) => (j === i ? { ...x, dose: v } : x)))}
                placeholder="Dose"
                placeholderTextColor={p.muted}
                style={[styles.input, styles.doseInput]}
              />
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setMedicines((all) => [...all, { name: '', dose: '' }])} style={styles.linkBtn}>
            <Text style={styles.linkText}>+ Add another medicine</Text>
          </Pressable>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Reports and prescriptions</Text>
            <Text style={styles.optional}>Optional</Text>
          </View>
          {files.map((file) => (
            <View key={file.id} style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={18} color={p.accent} />
              <Text style={[styles.fileName, styles.flex]} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.kindPill}>{file.kind === 'report' ? 'Report' : 'Medicine'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${file.name}`} onPress={() => void removeSavedFile(file)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={p.red} />
              </Pressable>
            </View>
          ))}
          {pending.map((file, i) => (
            <View key={`${file.uri}-${i}`} style={styles.fileRow}>
              <Ionicons name="cloud-upload-outline" size={18} color={p.accent} />
              <Text style={[styles.fileName, styles.flex]} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.kindPill}>{file.kind === 'report' ? 'Report' : 'Medicine'}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${file.name}`}
                onPress={() => setPending((all) => all.filter((f) => f !== file))}
                hitSlop={8}>
                <Ionicons name="close" size={16} color={p.muted} />
              </Pressable>
            </View>
          ))}
          <View style={styles.fileButtons}>
            <Pressable accessibilityRole="button" onPress={() => void pickFile('report')} style={styles.fileBtn}>
              <Ionicons name="document-attach-outline" size={16} color={p.accent} />
              <Text style={styles.fileBtnText}>Add report</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void pickFile('medicine')} style={styles.fileBtn}>
              <Ionicons name="medkit-outline" size={16} color={p.accent} />
              <Text style={styles.fileBtnText}>Add prescription</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>PDF, JPEG or PNG, up to 20 MB each. Files are uploaded when you save.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={styles.saveBtn}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save entry'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Opens the browser's calendar or clock when the field itself is clicked, not only its icon.
// showPicker is supported in current Chromium, Edge, Firefox and Safari; older browsers keep the icon behaviour.
function openWebPicker(e: { currentTarget: HTMLInputElement }) {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    // Some browsers only allow this after a user gesture; the icon still opens the picker.
  }
}

// Plain browser input styled like the app's inputs. Used on web, where the native date and time pickers do not exist.
function webField(p: Palette, invalid: boolean | undefined): CSSProperties {
  return {
    height: 44,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 12,
    border: `${invalid ? 1.5 : 1}px solid ${invalid ? p.red : p.border}`,
    background: p.surface,
    padding: '0 12px',
    fontSize: 15,
    color: p.textStrong,
    fontFamily: 'inherit',
  };
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    dialog: { flex: 1, backgroundColor: p.bg },
    scroll: { flex: 1 },
    dialogContent: { padding: 18, gap: 14 },
    dialogHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    dialogTitle: { fontSize: 22, fontWeight: '800', color: p.textStrong },
    closeText: { fontSize: 14, fontWeight: '700', color: p.accent },
    form: { backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: 14, gap: 8 },
    label: { fontSize: 12.5, color: p.muted },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    optional: {
      fontSize: 10.5,
      fontWeight: '700',
      color: p.muted,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 8,
      overflow: 'hidden',
    },
    input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, paddingHorizontal: 12, fontSize: 15, color: p.textStrong },
    inputError: { borderColor: p.red, borderWidth: 1.5 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowGrow: { flex: 1, justifyContent: 'center' },
    valueText: { fontSize: 15, color: p.textStrong },
    placeholderText: { fontSize: 15, color: p.muted },
    medRow: { flexDirection: 'row', gap: 8 },
    flex: { flex: 1 },
    doseInput: { width: 96 },
    linkBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    linkText: { fontSize: 13, fontWeight: '700', color: p.accent },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
    fileName: { fontSize: 13.5, color: p.textStrong },
    kindPill: { fontSize: 11, fontWeight: '700', color: p.accent, backgroundColor: p.accentSoft, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden' },
    fileButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
    fileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: p.accent },
    fileBtnText: { fontSize: 13, fontWeight: '700', color: p.accent },
    hint: { fontSize: 12, color: p.muted },
    error: { fontSize: 13, color: p.red },
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: p.border,
      backgroundColor: p.card,
    },
    cancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: p.textStrong },
    saveBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });
}
