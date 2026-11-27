import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette, type Palette } from '@shared/ui/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  'Type a medicine name, brand or generic, and pick it from the list.',
  'Do the same for the second medicine, or scan its pack.',
  'The check appears below. Tap a finding to read how the two medicines interact.',
];

// The drawer for the medication check, in the same layout as the other help drawers: what it is for and how to use it.
export function ClinicalInfoModal({ visible, onClose }: Props) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Medication check</Text>
        <Text style={styles.infoBody}>
          Checks two medicines against drug databases for possible interactions, duplicate ingredients and documented contraindications.
        </Text>

        <Text style={styles.infoHead}>How to use it</Text>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.step}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        <Text style={styles.infoNote}>
          This does not give medical advice. Discuss any finding with your doctor or pharmacist before you start, stop or change a medicine.
        </Text>
      </View>
    </BottomSheet>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    info: { gap: 10, paddingBottom: 8 },
    infoTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    infoHead: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: p.textStrong, marginTop: 6 },
    infoBody: { fontSize: 14, lineHeight: 21, color: p.text },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stepNumber: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: p.accent },
    stepText: { flex: 1, fontSize: 14, lineHeight: 21, color: p.text },
    infoNote: { fontSize: 12.5, lineHeight: 18, color: p.muted, marginTop: 6 },
  });
}
