import { StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER_V1 } from '../../config/constants';

// Fixed footer. Rendered on every interpretation screen.
export function Disclaimer() {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{DISCLAIMER_V1}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, borderRadius: 12, backgroundColor: '#F0F0F3' },
  text: { fontSize: 12, color: '#60646C', lineHeight: 18 },
});
