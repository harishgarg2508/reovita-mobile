import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useFormColors, type FormColors } from '../theme/form-colors';
import { Type } from '../theme/tokens';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// Tag-cloud style toggle used for conditions, relations and single-choice answers.
export function Chip({ label, selected, onPress }: ChipProps) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
    chip: { paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    selected: { backgroundColor: colors.accentFill, borderColor: colors.accentFill },
    label: { ...Type.label, color: colors.text },
    selectedLabel: { color: colors.onAccent },
  });
