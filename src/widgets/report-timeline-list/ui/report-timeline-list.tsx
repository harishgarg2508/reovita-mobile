import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@shared/ui/card';
import { Brand, Radius, Type } from '@shared/ui/theme/tokens';

// Flag summary of recent reports. The backend returns recent_flags as untyped items for now.
export function ReportTimelineList({ flags }: { flags: unknown[] }) {
  return (
    <View style={styles.wrap}>
      <Text style={[Type.title, styles.heading]}>Recent flags</Text>
      {flags.length === 0 ? (
        <Card>
          <Text style={[Type.body, styles.muted]}>No flagged results yet.</Text>
        </Card>
      ) : null}
      {flags.map((flag, index) => (
        <View key={index} style={styles.row}>
          <Text style={[Type.body, styles.body]}>{typeof flag === 'string' ? flag : JSON.stringify(flag)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { color: Brand.ink },
  muted: { color: Brand.muted },
  body: { color: Brand.ink },
  row: { padding: 14, borderRadius: Radius.md, backgroundColor: '#F0F0F3' },
});
