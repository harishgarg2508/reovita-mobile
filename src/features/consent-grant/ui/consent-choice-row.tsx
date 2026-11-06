import { StyleSheet, Switch, Text, View } from 'react-native';

import type { ConsentChoice } from '../model/consent-choices';

interface ConsentChoiceRowProps {
  choice: ConsentChoice;
  value: boolean;
  onChange: (value: boolean) => void;
}

// One consent type: its code name, what it is for, what happens without it, and a switch.
export function ConsentChoiceRow({ choice, value, onChange }: ConsentChoiceRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.code}>{choice.label}</Text>
        <Text style={styles.purpose}>{choice.purpose}</Text>
        <Text style={styles.effect}>If off: {choice.effectIfMissing}</Text>
      </View>
      <Switch
        accessibilityLabel={`Allow ${choice.label}`}
        value={value}
        disabled={choice.required}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: '#7545ED' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E1E6',
  },
  text: { flex: 1, gap: 2 },
  code: {
    alignSelf: 'flex-start',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#171717',
    backgroundColor: '#EFEFF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  purpose: { fontSize: 14, color: '#171717', marginTop: 4 },
  effect: { fontSize: 12, color: '#60646C' },
});
