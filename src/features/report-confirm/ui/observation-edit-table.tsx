import { StyleSheet, Text, TextInput, View } from 'react-native';

import { healthStatusOf, type Observation } from '@entities/report';
import { StatusTag } from '@shared/ui/status-tag';

// Card layout per observation (not a wide table) so it reads on a phone.
export function ObservationEditTable({
  observations,
  onChangeValue,
}: {
  observations: Observation[];
  onChangeValue: (index: number, value: string) => void;
}) {
  return (
    <View style={styles.list}>
      {observations.map((obs, index) => (
        <View key={`${obs.biomarker_code}-${index}`} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.name}>{obs.name_raw}</Text>
            <StatusTag status={healthStatusOf(obs.status)} />
          </View>
          <View style={styles.row}>
            <TextInput
              accessibilityLabel={`Value for ${obs.name_raw}`}
              style={styles.input}
              keyboardType="decimal-pad"
              value={String(obs.value_num)}
              onChangeText={(v) => onChangeValue(index, v)}
            />
            <Text style={styles.meta}>{obs.unit}</Text>
          </View>
          <Text style={styles.meta}>
            Range: {obs.ref_low ?? '-'} to {obs.ref_high ?? '-'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { padding: 14, borderRadius: 14, backgroundColor: '#F0F0F3', gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#171717', flex: 1, marginRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, fontSize: 16, color: '#171717' },
  meta: { fontSize: 13, color: '#60646C' },
});
