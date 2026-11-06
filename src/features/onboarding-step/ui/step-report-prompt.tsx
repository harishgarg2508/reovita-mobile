import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Step 4 "First Report": upload area, encryption note, and a skip link. Matches the Figma frame 29:554.
export function StepReportPrompt({ onChoose, onSkip }: { onChoose: () => void; onSkip: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.dropZone}>
        <View style={styles.iconBox}>
          <Ionicons name="document-attach-outline" size={28} color="#7545ED" />
        </View>
        <Text style={styles.dropTitle}>Drop your report here</Text>
        <Text style={styles.dropHint}>PDF, JPG or PNG · Up to 20 MB</Text>
        <Pressable accessibilityRole="button" onPress={onChoose} style={({ pressed }) => [styles.chooseBtn, pressed && styles.pressed]}>
          <Ionicons name="add" size={16} color="#7545ED" />
          <Text style={styles.chooseText}>Choose file</Text>
        </Pressable>
      </View>

      <View style={styles.banner}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#3D5500" />
        <Text style={styles.bannerText}>Encrypted. Private. Always yours.</Text>
      </View>

      <Text style={styles.later}>No report handy? Add it later.</Text>
      <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#7545ED',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4FF3F',
    backgroundColor: '#FBFFF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropTitle: { fontFamily: 'Poppins_500Medium', fontSize: 16, color: '#242032' },
  dropHint: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#6B7280' },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#F1EDF7',
  },
  chooseText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#7545ED' },
  pressed: { opacity: 0.85 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F4FFD6',
  },
  bannerText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#3D5500' },
  later: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  skip: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#7545ED' },
});
