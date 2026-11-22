import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useInteractionLookup } from '@entities/interaction-finding';
import { tapConfirm, tapSelection } from '@shared/lib';
import { usePalette, type Palette } from '@shared/ui/theme';

import { useMedicineSuggestions, type MedicineSuggestion } from '../model/use-medicine-suggestions';
import { InteractionResult } from './interaction-result';
import { MedicineScanModal } from './medicine-scan-modal';

// Check any two medicines, brand or generic, without adding them to your list. Type a name, pick it from the suggestions, do the same for the second,
// and tap Check. Nothing about you is sent and nothing is saved.
export function MedicineLookup() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const [first, setFirst] = useState<MedicineSuggestion | null>(null);
  const [second, setSecond] = useState<MedicineSuggestion | null>(null);
  const lookup = useInteractionLookup();

  const ready = first !== null && second !== null;
  // The result shows on this screen as soon as both medicines are chosen, whether they were typed or scanned. Nothing needs to be tapped.
  const { mutate } = lookup;
  const firstIds = first?.ingredient_ids.join(',') ?? '';
  const secondIds = second?.ingredient_ids.join(',') ?? '';
  useEffect(() => {
    if (!firstIds || !secondIds) return;
    mutate({ idsA: firstIds.split(','), idsB: secondIds.split(',') });
  }, [firstIds, secondIds, mutate]);
  function reset() {
    setFirst(null);
    setSecond(null);
    lookup.reset();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.head}>
          <Ionicons name="swap-horizontal" size={20} color={p.accent} />
          <Text style={styles.title}>Check two medicines</Text>
        </View>
        <Text style={styles.muted}>Pick two medicines, brand or generic, or scan a pack. The result shows here as soon as both are chosen. They are not added to your list. Pick only one to check it against the medicines you take.</Text>
        <Picker label="First medicine" value={first} onPick={(v) => { setFirst(v); lookup.reset(); }} p={p} />
        <Picker label="Second medicine" value={second} onPick={(v) => { setSecond(v); lookup.reset(); }} p={p} />
        {first && !second ? (
          <Pressable
            accessibilityRole="button"
            disabled={lookup.isPending}
            onPress={() => {
              tapConfirm();
              lookup.mutate({ idsA: first.ingredient_ids });
            }}
            style={styles.mineBtn}>
            {lookup.isPending ? <ActivityIndicator color={p.accent} /> : <Text style={styles.mineText}>Check against my medicines</Text>}
          </Pressable>
        ) : null}
        {ready && lookup.isPending ? <ActivityIndicator color={p.accent} /> : null}
        {lookup.isError ? <Text style={[styles.muted, { color: p.red }]}>The check could not be done. Nothing has been checked. Try again.</Text> : null}
        {first || second ? (
          <Pressable accessibilityRole="button" onPress={reset} hitSlop={8}>
            <Text style={styles.clear}>Start again</Text>
          </Pressable>
        ) : null}
      </View>
      {lookup.data ? <InteractionResult data={lookup.data} /> : null}
    </View>
  );
}

function Picker({ label, value, onPick, p }: { label: string; value: MedicineSuggestion | null; onPick: (v: MedicineSuggestion | null) => void; p: Palette }) {
  const styles = useMemo(() => makeStyles(p), [p]);
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const { items, searching } = useMedicineSuggestions(value ? '' : text);

  if (value) {
    return (
      <View style={styles.chosen}>
        <Ionicons name="medkit-outline" size={18} color={p.accent} />
        <Text numberOfLines={1} style={styles.chosenText}>{value.alias}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Change ${label}`} hitSlop={8} onPress={() => { onPick(null); setText(''); }}>
          <Ionicons name="close-circle" size={20} color={p.muted} />
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.pickerBox}>
      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} maxLength={100} autoCapitalize="none" autoCorrect={false} placeholder={label} placeholderTextColor={p.muted} accessibilityLabel={label} style={[styles.input, styles.inputFlex]} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Scan a pack for the ${label.toLowerCase()}`} onPress={() => { tapSelection(); setScanning(true); }} style={styles.scanBtn}>
          <Ionicons name="scan-outline" size={22} color={p.accent} />
        </Pressable>
      </View>
      <MedicineScanModal visible={scanning} onClose={() => setScanning(false)} onPick={(picked) => onPick({ alias: picked.alias, ingredient_ids: picked.ingredient_ids, similarity: 1 })} />
      {searching ? <ActivityIndicator color={p.accent} style={styles.spin} /> : null}
      {items.map((item) => (
        <Pressable key={`${item.alias}-${item.ingredient_ids.join()}`} accessibilityRole="button" onPress={() => { tapSelection(); onPick(item); setText(''); }} style={styles.option}>
          <Text numberOfLines={1} style={styles.optionText}>{item.alias}</Text>
        </Pressable>
      ))}
      {!searching && text.trim().length >= 2 && items.length === 0 ? <Text style={styles.muted}>No medicine found with that name. Check the spelling.</Text> : null}
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 16, fontWeight: '800', color: p.textStrong },
    muted: { fontSize: 12.5, color: p.muted, lineHeight: 18 },
    pickerBox: { gap: 6 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    inputFlex: { flex: 1 },
    scanBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' },
    input: { height: 46, borderWidth: 1, borderRadius: 14, borderColor: p.border, backgroundColor: p.input, color: p.text, paddingHorizontal: 14, fontSize: 15 },
    spin: { alignSelf: 'flex-start', marginLeft: 6 },
    option: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
    optionText: { fontSize: 14, fontWeight: '600', color: p.text },
    chosen: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: p.accent, backgroundColor: p.accentSoft, paddingHorizontal: 12 },
    chosenText: { flex: 1, fontSize: 14.5, fontWeight: '700', color: p.textStrong },
    mineBtn: { height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: p.accent, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' },
    mineText: { color: p.accent, fontSize: 14.5, fontWeight: '800' },
    clear: { fontSize: 12.5, fontWeight: '700', color: p.muted, textDecorationLine: 'underline', textAlign: 'center' },
  });
}
