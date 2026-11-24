import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type CSSProperties } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isApiError } from '@shared/api';
import { Gap, Rule, Type, usePalette, type Palette } from '@shared/ui/theme';

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

// What a field may hold. The same limits are checked here before anything is sent.
const TITLE_MIN = 2;
const TITLE_MAX = 80;
const NAME_MAX = 80;
const DOSE_MAX = 30;
const MAX_MEDICINES = 10;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const EARLIEST_YEAR = 1900;

// The message under each field that failed. A field with no message is fine.
interface FieldErrors {
  title?: string;
  date?: string;
  time?: string;
  medicines?: string;
}

// Checks the whole entry. A date is a real calendar day, not before 1900 and not in the future; a time is a real clock time, and not in the future when the
// date is today; a medicine has a name when it has a dose, and a name appears once.
function checkEntry(input: { title: string; date: string; time: string; medicines: { name: string; dose: string }[] }, now: Date): FieldErrors {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  if (title.length < TITLE_MIN) errors.title = `Give the entry a title of at least ${TITLE_MIN} characters.`;
  else if (title.length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;

  const today = isoOf(now);
  if (!DATE.test(input.date) || Number.isNaN(dateFrom(input.date).getTime()) || isoOf(dateFrom(input.date)) !== input.date) errors.date = 'Choose a real date.';
  else if (Number(input.date.slice(0, 4)) < EARLIEST_YEAR) errors.date = `The date cannot be before ${EARLIEST_YEAR}.`;
  else if (input.date > today) errors.date = 'The date cannot be in the future.';

  if (input.time) {
    if (!TIME.test(input.time)) errors.time = 'Enter the time as hours and minutes.';
    else if (input.date === today && input.time > clockOf(now)) errors.time = 'The time cannot be in the future.';
  }

  const named = input.medicines.filter((m) => m.name.trim());
  if (input.medicines.some((m) => !m.name.trim() && m.dose.trim())) errors.medicines = 'A dose needs the name of the medicine.';
  else if (new Set(named.map((m) => m.name.trim().toLowerCase())).size !== named.length) errors.medicines = 'Each medicine is listed once.';
  else if (named.length > MAX_MEDICINES) errors.medicines = `Add up to ${MAX_MEDICINES} medicines.`;
  return errors;
}

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
  const initialMedicines = entry && (entry.medicines ?? []).length > 0 ? (entry.medicines ?? []).map((m) => ({ name: m.name, dose: m.dose ?? '' })) : [{ name: '', dose: '' }];
  const [medicines, setMedicines] = useState<{ name: string; dose: string }[]>(initialMedicines);
  const [files, setFiles] = useState<MedicalHistoryFile[]>(entry?.files ?? []);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [saving, setSaving] = useState(false);
  // The fields that failed a check, each with its message under it and a red border.
  const [invalid, setInvalid] = useState<FieldErrors>({});
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
    const type = asset.mimeType ?? 'application/octet-stream';
    if (!FILE_TYPES.includes(type)) {
      setError('Only PDF, JPEG or PNG files can be added.');
      return;
    }
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      setError('That file is over 20 MB. Choose a smaller one.');
      return;
    }
    if (files.length + pending.length >= MAX_FILES) {
      setError(`Add up to ${MAX_FILES} files to one entry.`);
      return;
    }
    if (pending.some((f) => f.name === asset.name) || files.some((f) => f.name === asset.name)) {
      setError('A file with that name is already added.');
      return;
    }
    setPending((all) => [...all, { uri: asset.uri, name: asset.name, type, kind }]);
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
    // Each failed field gets a red border and its message under it.
    const problems = checkEntry({ title, date, time, medicines }, new Date());
    setInvalid(problems);
    if (Object.keys(problems).length > 0) return;
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
          <Text style={styles.dialogTitle}>{entry ? 'Edit health log entry' : 'Add health log entry'}</Text>
          <View style={styles.headActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reset fields" onPress={resetFields} hitSlop={8}>
              <Text style={styles.closeText}>Reset</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>What happened</Text>
          <View>
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v.slice(0, TITLE_MAX));
                if (invalid.title) setInvalid((s) => ({ ...s, title: undefined }));
              }}
              maxLength={TITLE_MAX}
              multiline
              textAlignVertical="top"
              placeholder="Write in your own words, for example a check-up, a fever, or how the visit went."
              placeholderTextColor={p.muted}
              accessibilityLabel="What happened"
              style={[styles.input, styles.freeText, invalid.title ? styles.inputError : null]}
            />
            <Text accessibilityLabel={`${title.length} of ${TITLE_MAX} characters`} style={styles.counter}>
              {title.length}/{TITLE_MAX}
            </Text>
          </View>
          <FieldMessage text={invalid.title} styles={styles} />

          <Text style={styles.label}>Date</Text>
          {Platform.OS === 'web' ? (
            // The browser's own date input. The native picker below is only available on the phone.
            <input
              type="date"
              aria-label="Date"
              value={date}
              max={isoOf(new Date())}
              min={`${EARLIEST_YEAR}-01-01`}
              onChange={(e) => {
                setDate(e.target.value);
                if (invalid.date) setInvalid((s) => ({ ...s, date: undefined }));
              }}
              onClick={openWebPicker}
              style={webField(p, !!invalid.date)}
            />
          ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose date" onPress={() => setShowDate((open) => !open)} style={[styles.input, styles.row, invalid.date ? styles.inputError : null]}>
            <Text style={styles.valueText}>{displayDate(date)}</Text>
            <Ionicons name="calendar-outline" size={18} color={p.accent} />
          </Pressable>
          )}
          <FieldMessage text={invalid.date} styles={styles} />
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
            <Text style={styles.optional}>optional</Text>
          </View>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              aria-label="Time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                if (invalid.time) setInvalid((s) => ({ ...s, time: undefined }));
              }}
              onClick={openWebPicker}
              style={webField(p, !!invalid.time)}
            />
          ) : (
          <View style={[styles.input, styles.row, invalid.time ? styles.inputError : null]}>
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
          <FieldMessage text={invalid.time} styles={styles} />
          {Platform.OS !== 'web' && showTime ? (
            <DateTimePicker value={timeFrom(time)} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} />
          ) : null}

          <View style={styles.labelRow}>
            <Text style={styles.label}>Medicines</Text>
            <Text style={styles.optional}>optional</Text>
          </View>
          {medicines.map((m, i) => (
            <View key={i} style={styles.medRow}>
              <TextInput
                value={m.name}
                onChangeText={(v) => {
                  setMedicines((all) => all.map((x, j) => (j === i ? { ...x, name: v.slice(0, NAME_MAX) } : x)));
                  if (invalid.medicines) setInvalid((s) => ({ ...s, medicines: undefined }));
                }}
                maxLength={NAME_MAX}
                placeholder="Name"
                placeholderTextColor={p.muted}
                style={[styles.input, styles.flex]}
              />
              <TextInput
                value={m.dose}
                onChangeText={(v) => {
                  setMedicines((all) => all.map((x, j) => (j === i ? { ...x, dose: v.slice(0, DOSE_MAX) } : x)));
                  if (invalid.medicines) setInvalid((s) => ({ ...s, medicines: undefined }));
                }}
                maxLength={DOSE_MAX}
                placeholder="Dose"
                placeholderTextColor={p.muted}
                style={[styles.input, styles.doseInput]}
              />
            </View>
          ))}
          <FieldMessage text={invalid.medicines} styles={styles} />
          {medicines.length < MAX_MEDICINES ? (
            <Pressable accessibilityRole="button" onPress={() => setMedicines((all) => [...all, { name: '', dose: '' }])} style={styles.linkBtn}>
              <Text style={styles.linkText}>Add another medicine</Text>
            </Pressable>
          ) : null}

          <View style={styles.labelRow}>
            <Text style={styles.label}>Reports and prescriptions</Text>
            <Text style={styles.optional}>optional</Text>
          </View>
          {files.map((file) => (
            <View key={file.id} style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={18} color={p.accent} />
              <Text style={[styles.fileName, styles.flex]} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.kindPill}>{file.kind === 'report' ? 'Report' : 'Prescription'}</Text>
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
              <Text style={styles.kindPill}>{file.kind === 'report' ? 'Report' : 'Prescription'}</Text>
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
          <Text style={styles.hint}>PDF, JPEG or PNG, up to 20 MB each and {MAX_FILES} files. Files are uploaded when you save.</Text>

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

// The reason a field failed, under it. Nothing shows when the field is fine.
function FieldMessage({ text, styles }: { text?: string; styles: ReturnType<typeof makeStyles> }) {
  return text ? (
    <Text accessibilityRole="alert" style={styles.fieldError}>
      {text}
    </Text>
  ) : null;
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
    height: 50,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 14,
    border: `${invalid ? 1.5 : 1}px solid ${invalid ? p.red : p.border}`,
    background: p.bg,
    padding: '0 14px',
    fontSize: 15,
    color: p.textStrong,
    fontFamily: 'inherit',
  };
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    dialog: { flex: 1, backgroundColor: p.bg },
    scroll: { flex: 1 },
    dialogContent: { padding: Gap.edge, gap: Gap.group },
    dialogHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    dialogTitle: { ...Type.display, fontSize: 26, lineHeight: 32, color: p.textStrong },
    closeText: { ...Type.label, color: p.accent },
    // The form is the page: no frame around it. Fields are spaced, and each label sits over its field.
    form: { gap: 6 },
    label: { ...Type.label, color: p.textStrong },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: Gap.inner },
    optional: { ...Type.small, color: p.muted },
    freeText: { height: 120, paddingTop: 12, paddingBottom: 28, lineHeight: 21 },
    counter: { position: 'absolute', right: 12, bottom: 8, ...Type.small, color: p.muted },
    input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.bg, paddingHorizontal: 14, ...Type.body, color: p.textStrong },
    inputError: { borderColor: p.red, borderWidth: 1.5 },
    fieldError: { ...Type.small, color: p.red },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowGrow: { flex: 1, justifyContent: 'center' },
    valueText: { ...Type.body, color: p.textStrong },
    placeholderText: { ...Type.body, color: p.muted },
    medRow: { flexDirection: 'row', gap: 8 },
    flex: { flex: 1 },
    doseInput: { width: 104 },
    linkBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
    linkText: { ...Type.label, color: p.accent },
    // A file is a row on a rule, with its kind as plain text.
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: Rule, borderBottomColor: p.border },
    fileName: { ...Type.body, color: p.textStrong },
    kindPill: { ...Type.small, color: p.muted },
    fileButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
    fileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: p.accent },
    fileBtnText: { ...Type.label, color: p.accent },
    hint: { ...Type.small, color: p.muted, marginTop: 4 },
    error: { ...Type.small, color: p.red },
    footer: { flexDirection: 'row', gap: 10, paddingHorizontal: Gap.edge, paddingTop: 12, borderTopWidth: Rule, borderTopColor: p.border, backgroundColor: p.bg },
    cancelBtn: { flex: 1, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    cancelText: { ...Type.bodyStrong, color: p.accent },
    saveBtn: { flex: 1, height: 52, borderRadius: 26, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    saveText: { ...Type.bodyStrong, color: '#FFFFFF' },
  });
}
