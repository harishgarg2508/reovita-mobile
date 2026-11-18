import { StyleSheet, Text, View } from 'react-native';

import { ReportDropZone } from '@shared/ui/report-drop-zone';
import { useFormColors } from '@shared/ui/theme/form-colors';

// Step 4 "First Report": the shared report upload block, with a note that a report can also be added later.
export function StepReportPrompt({ onChoose }: { onChoose: () => void; onSkip: () => void }) {
  const colors = useFormColors();
  return (
    <View style={styles.wrap}>
      <ReportDropZone onChoose={onChoose} />
      <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.noteTitle, { color: colors.textStrong }]}>No report with you right now?</Text>
        <Text style={[styles.noteText, { color: colors.muted }]}>
          Your profile will show as incomplete until a lab report is added. You can upload one later from the dashboard whenever you are ready.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  note: { borderRadius: 16, padding: 14, gap: 4 },
  noteTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5 },
  noteText: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 18 },
});
