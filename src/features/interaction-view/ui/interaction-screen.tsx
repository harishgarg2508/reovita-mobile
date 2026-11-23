import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInteractions } from '@entities/interaction-finding';
import { goBackOr } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';
import { useScrollToTopOnFocus } from '@shared/lib';

import { InteractionResult } from './interaction-result';
import { MedicineLookup } from './medicine-lookup';

// Medicine interaction check. Every outcome is shown with what was actually checked, so an unavailable check
// never looks like a safe result.
export function InteractionScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const check = useInteractions();

  return (
    <ScrollView ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom, 20) + 16 },
      ]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')}
          hitSlop={8}
          style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={p.textStrong} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Medication check</Text>
          <Text style={styles.subtitle}>Checks your active medicines against each other.</Text>
        </View>
      </View>

      {/* The action comes first. The result for the person's own active medicines is below it. */}
      <MedicineLookup />

      {check.isLoading ? (
        <ActivityIndicator color={p.accent} style={styles.center} />
      ) : check.isError ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>The check could not be loaded</Text>
          <Text style={styles.muted}>Try again. Nothing has been checked yet.</Text>
          <Pressable accessibilityRole="button" onPress={() => check.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : check.data ? (
        <InteractionResult data={check.data} />
      ) : null}

    </ScrollView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.surface },
    content: { padding: 16, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted, marginTop: 2 },
    center: { paddingVertical: 60, alignItems: 'center' },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: p.textStrong },
    statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    statusText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    muted: { fontSize: 12.5, color: p.muted, lineHeight: 18 },
    finding: { gap: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    pair: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    disclaimer: { fontSize: 12.5, color: p.muted, lineHeight: 18, textAlign: 'center', marginTop: 4 },
    retry: { height: 44, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: '#FFFFFF', fontWeight: '700' },
  });
}
