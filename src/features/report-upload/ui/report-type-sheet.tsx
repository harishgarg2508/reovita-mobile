import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ReportType } from '@entities/report';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { PremiumBadge, useSubscription } from '@entities/subscription';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

import { REPORT_TYPE_OPTIONS } from '../model/report-type-options';

const MAX_LABEL = 60;

// Asks what is being uploaded before the file is chosen. "Other" also takes a short name, so the document can be found later.
export function ReportTypeSheet({
  visible,
  onClose,
  onChoose,
}: {
  visible: boolean;
  onClose: () => void;
  onChoose: (type: ReportType, label: string) => void;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<ReportType | null>(null);
  // Every kind is shown, so a free account can see what Premium adds. The free plan uploads lab reports only: the other kinds carry a Premium pill, and
  // tapping one opens the plan screen instead of the file picker.
  const plan = useSubscription();
  const router = useRouter();
  const options = REPORT_TYPE_OPTIONS;
  const isLocked = (type: ReportType) => plan.locked && type !== 'blood_report';
  const [label, setLabel] = useState('');

  function reset() {
    setSelected(null);
    setLabel('');
  }

  function close() {
    reset();
    onClose();
  }

  function pick(type: ReportType) {
    if (isLocked(type)) {
      close();
      router.push('/(app)/subscription' as Href);
      return;
    }
    // The named types go straight to the file picker. "Other" first asks for its name.
    if (type === 'other') {
      setSelected('other');
      return;
    }
    reset();
    onChoose(type, '');
  }

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.wrap}>
        <Text style={styles.title}>What are you uploading?</Text>
        <Text style={styles.sub}>Each kind is kept in its own folder, so it is easy to find later.</Text>
        {options.map((option) => {
          const on = selected === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => pick(option.value)}
              style={[styles.row, on && styles.rowOn]}>
              <View style={styles.icon}>
                <Ionicons name={option.icon} size={22} color={colors.accent} />
              </View>
              <View style={styles.text}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{option.label}</Text>
                  {isLocked(option.value) ? <PremiumBadge /> : null}
                </View>
                <Text style={styles.hint}>{option.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        })}
        {selected === 'other' ? (
          <View style={styles.otherBox}>
            <TextInput
              value={label}
              onChangeText={(v) => setLabel(v.slice(0, MAX_LABEL))}
              placeholder="Name it, for example Vaccination card (optional)"
              placeholderTextColor={colors.placeholder}
              maxLength={MAX_LABEL}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const name = label.trim();
                reset();
                onChoose('other', name);
              }}
              style={styles.continue}>
              <Text style={styles.continueText}>Choose file</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
    wrap: { gap: 10, paddingBottom: 8 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    title: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.textStrong },
    sub: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 18, color: colors.muted, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    rowOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, gap: 1 },
    label: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: colors.textStrong },
    hint: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: colors.muted },
    otherBox: { gap: 10, marginTop: 2 },
    input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border2, paddingHorizontal: 14, fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.text, backgroundColor: colors.card },
    continue: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentFill },
    continueText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: colors.onAccent },
  });
