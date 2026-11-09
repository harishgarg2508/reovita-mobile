import { StyleSheet, Text, View } from 'react-native';

const STATUS_COLOR: Record<string, string> = {
  Normal: '#3D5500',
  Watch: '#8A6A12',
  High: '#C22F43',
  Low: '#C22F43',
  Critical: '#C22F43',
};

// One explanation: status and biomarker name on top, the explanation text below.
export function ExplanationCard({ status, biomarkerCode, text }: { status?: string; biomarkerCode?: string; text: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {status ? <Text style={[styles.status, { color: STATUS_COLOR[status] ?? '#171717' }]}>{status}</Text> : <View />}
        {biomarkerCode ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{biomarkerCode.replace(/_/g, ' ')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEAEF',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  status: { fontSize: 12, fontWeight: '700' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    backgroundColor: '#FFFFFF',
  },
  pillText: { fontSize: 12, fontWeight: '600', color: '#171717', textTransform: 'uppercase', letterSpacing: 0.4 },
  body: { fontSize: 14, lineHeight: 20, color: '#3B3F47' },
});
