import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER_V1 } from '../../config/constants';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

// Fixed footer. Rendered on every interpretation screen.
export function Disclaimer() {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{DISCLAIMER_V1}</Text>
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  box: { padding: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  text: { fontSize: 12, color: colors.muted, lineHeight: 18 },
});
