import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Type, usePalette } from '@shared/ui/theme';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

// Report upload block: dashed drop zone, encryption note, and an optional skip link.
// Used by onboarding Step 4 (with skip) and the upload screen (without).
export function ReportDropZone({
  onChoose,
  onSkip,
  disabled = false,
}: {
  onChoose: () => void;
  onSkip?: () => void;
  disabled?: boolean;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const p = usePalette();
  return (
    <View style={styles.wrap}>
      <View style={[styles.dropZone, { backgroundColor: p.card, borderColor: p.accent }]}>
        <Ionicons name="cloud-upload-outline" size={34} color={colors.accent} />
        <Text style={[styles.dropTitle, { color: p.text }]}>Drop your report here</Text>
        <Text style={[styles.dropHint, { color: p.muted }]}>PDF, JPG or PNG, up to 20 MB</Text>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onChoose}
          style={({ pressed }) => [styles.chooseBtn, { backgroundColor: p.accent }, pressed && styles.pressed, disabled && styles.disabled]}>
          <Text style={styles.chooseText}>Choose file</Text>
        </Pressable>
      </View>

      {onSkip ? (
        <>
          <Text style={styles.later}>No report handy? Add it later.</Text>
          <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  wrap: { gap: 16 },
  dropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFC4A8',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropTitle: { ...Type.heading, color: colors.text, marginTop: 6 },
  dropHint: { ...Type.small, color: colors.muted },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  chooseText: { ...Type.bodyStrong, color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  bannerText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.onSoft },
  later: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 },
  skip: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: colors.accent, textAlign: 'center' },
});
