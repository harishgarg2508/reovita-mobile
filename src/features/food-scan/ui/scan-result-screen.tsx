import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { FridgeResultView, MealResultView, useDeleteFoodScan, useFoodScan, type FridgeScanResult, type MealScanResult } from '@entities/food-scan';
import { useScrollToTopOnFocus } from '@shared/lib';

// One scan: the answer of Scan My Meal or Scan My Fridge, with the disclaimer. It can be deleted from here.
export function ScanResultScreen({ id }: { id: string }) {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scan = useFoodScan(id);
  const remove = useDeleteFoodScan();
  const [confirming, setConfirming] = useState(false);
  const back = () => goBackOr(router, '/(app)/(tabs)/dashboard' as Href);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>{scan.data?.kind === 'fridge' ? 'Your fridge' : 'Your meal'}</Text>
        {scan.data ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Delete scan" hitSlop={8} onPress={() => setConfirming(true)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="trash-outline" size={18} color={p.text} />
          </Pressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>

      {scan.isPending ? <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} /> : null}
      {scan.isError ? <Text style={[styles.note, { color: p.muted }]}>This scan is not available. It may have been deleted.</Text> : null}
      {scan.data ? (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {scan.data.kind === 'fridge' ? <FridgeResultView result={scan.data.result as FridgeScanResult} /> : <MealResultView result={scan.data.result as MealScanResult} />}
        </ScrollView>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title="Delete this scan?"
        message="It is removed from your history. This cannot be undone."
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(id, { onSuccess: () => { setConfirming(false); back(); }, onSettled: () => setConfirming(false) })}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingTop: 4 },
  note: { fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
