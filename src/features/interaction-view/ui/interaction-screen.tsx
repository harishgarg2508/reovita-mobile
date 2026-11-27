import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { goBackOr } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';

import { ClinicalInfoModal } from './clinical-info-modal';
import { MedicineLookup } from './medicine-lookup';

// Medicine interaction check screen.
// Instant check between two medicines (brand or generic) with pack scanning and floating autocomplete.
export function InteractionScreen() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
      ]}>
      {/* Header in the same layout as the other app screens: back, title, and the info drawer */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')}
          hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={styles.title}>Medication check</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How the medication check works"
          onPress={() => {
            tapSelection();
            setShowInfo(true);
          }}
          hitSlop={10}>
          <Ionicons name="information-circle-outline" size={24} color={p.muted} />
        </Pressable>
      </View>

      {/* Two-Medicine Lookup and Instant Interaction Check */}
      <MedicineLookup />

      {/* Swipable Safety & Clinical Info Bottom Drawer */}
      <ClinicalInfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </ScrollView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    content: { paddingHorizontal: 18, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: {
      flex: 1,
      fontSize: 26,
      fontFamily: 'Poppins_600SemiBold',
      color: p.textStrong,
    },
  });
}
