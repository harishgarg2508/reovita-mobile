import { StyleSheet, Text, View } from 'react-native';

import { StatusColors, type HealthStatus } from '../theme/tokens';

const LABELS: Record<HealthStatus, string> = { normal: 'Normal', watch: 'Watch', critical: 'Critical' };

export function StatusTag({ status }: { status: HealthStatus }) {
  return (
    <View style={[styles.tag, { backgroundColor: StatusColors[status] }]}>
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
