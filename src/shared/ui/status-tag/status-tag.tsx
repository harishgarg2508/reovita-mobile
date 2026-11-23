import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusColors, Type, type HealthStatus } from '../theme/tokens';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

const LABELS: Record<HealthStatus, string> = { normal: 'Normal', watch: 'Watch', critical: 'Critical' };

export function StatusTag({ status }: { status: HealthStatus }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.tag, { backgroundColor: StatusColors[status] }]}>
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  text: { ...Type.label, color: colors.onAccent },
});
