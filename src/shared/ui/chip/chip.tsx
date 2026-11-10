import { Pressable, StyleSheet, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// Tag-cloud style toggle used for conditions, relations and single-choice answers.
export function Chip({ label, selected, onPress }: ChipProps) {
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

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E0E1E6' },
  selected: { backgroundColor: '#1F6F3F', borderColor: '#1F6F3F' },
  label: { fontSize: 14, color: '#171717' },
  selectedLabel: { color: '#FFFFFF', fontWeight: '600' },
});
