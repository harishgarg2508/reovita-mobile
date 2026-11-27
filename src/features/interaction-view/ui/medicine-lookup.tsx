import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useInteractionLookup } from '@entities/interaction-finding';
import { tapSelection } from '@shared/lib';
import { Card } from '@shared/ui/card';
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
  const { mutate } = lookup;
  const firstIds = first?.ingredient_ids.join(',') ?? '';
  const secondIds = second?.ingredient_ids.join(',') ?? '';

  useEffect(() => {
    if (!firstIds || !secondIds) return;
    mutate({ idsA: firstIds.split(','), idsB: secondIds.split(',') });
  }, [firstIds, secondIds, mutate]);

  function reset() {
    tapSelection();
    setFirst(null);
    setSecond(null);
    lookup.reset();
  }

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.headIconTile, { backgroundColor: p.accentSoft }]}>
            <Ionicons name="swap-horizontal" size={20} color={p.accent} />
          </View>
          <View style={styles.headTextCol}>
            <Text style={[styles.title, { color: p.textStrong }]}>Check two medicines</Text>
            <Text style={[styles.muted, { color: p.muted }]}>
              Pick two medicines, brand or generic, or scan a pack to verify interactions instantly.
            </Text>
          </View>
        </View>

        {/* Input pickers with staggered zIndex for overlay autocomplete */}
        <Picker label="First medicine" value={first} onPick={(v) => { setFirst(v); lookup.reset(); }} p={p} zIndex={40} />
        <Picker label="Second medicine" value={second} onPick={(v) => { setSecond(v); lookup.reset(); }} p={p} zIndex={30} />

        {/* Checking Status */}
        {ready && lookup.isPending ? (
          <View style={[styles.pendingBar, { backgroundColor: p.surface, borderColor: p.border }]}>
            <ActivityIndicator color={p.accent} size="small" />
            <Text style={[styles.pendingText, { color: p.textStrong }]}>Analyzing potential drug interactions...</Text>
          </View>
        ) : null}

        {lookup.isError ? (
          <View style={[styles.errorCard, { backgroundColor: p.redSoft, borderColor: p.red }]}>
            <Ionicons name="alert-circle" size={18} color={p.red} />
            <Text style={[styles.errorText, { color: p.red }]}>
              The check could not be completed. Please check your network and try again.
            </Text>
          </View>
        ) : null}

        {/* Reset Button */}
        {first || second ? (
          <Pressable accessibilityRole="button" onPress={reset} hitSlop={8} style={styles.clearBtn}>
            <Ionicons name="refresh-outline" size={15} color={p.muted} />
            <Text style={[styles.clear, { color: p.muted }]}>Start over / Clear medicines</Text>
          </Pressable>
        ) : null}
      </Card>

      {/* Interaction Result Display */}
      {lookup.data ? <InteractionResult data={lookup.data} /> : null}
    </View>
  );
}

function Picker({
  label,
  value,
  onPick,
  p,
  zIndex = 1,
}: {
  label: string;
  value: MedicineSuggestion | null;
  onPick: (v: MedicineSuggestion | null) => void;
  p: Palette;
  zIndex?: number;
}) {
  const styles = useMemo(() => makeStyles(p), [p]);
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [focused, setFocused] = useState(false);
  const { items, searching } = useMedicineSuggestions(value ? '' : text);

  if (value) {
    return (
      <View style={[styles.chosenCard, { backgroundColor: p.accentSoft, borderColor: p.accent }]}>
        <View style={[styles.chosenIconBadge, { backgroundColor: p.accent }]}>
          <Ionicons name="medkit" size={15} color="#FFFFFF" />
        </View>
        <View style={styles.chosenTextCol}>
          <Text style={[styles.chosenLabelText, { color: p.accent }]}>{label}</Text>
          <Text numberOfLines={1} style={[styles.chosenTitleText, { color: p.textStrong }]}>
            {value.alias}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change ${label}`}
          hitSlop={8}
          onPress={() => {
            tapSelection();
            onPick(null);
            setText('');
          }}
          style={styles.chosenCloseBtn}>
          <Ionicons name="close-circle" size={22} color={p.muted} />
        </Pressable>
      </View>
    );
  }

  const showDropdown = text.trim().length >= 2;

  return (
    <View style={[styles.pickerBox, { zIndex, elevation: zIndex }]}>
      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: p.input, borderColor: focused ? p.accent : p.border },
            focused && { borderWidth: 1.5 },
          ]}>
          <Ionicons name="search-outline" size={18} color={p.muted} style={styles.searchIcon} />
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={100}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={label}
            placeholderTextColor={p.muted}
            accessibilityLabel={label}
            style={[styles.input, { color: p.text }]}
          />
          {text.length > 0 ? (
            <Pressable hitSlop={8} onPress={() => setText('')} style={styles.clearInputBtn}>
              <Ionicons name="close-circle" size={18} color={p.muted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Scan a pack for the ${label.toLowerCase()}`}
          onPress={() => {
            tapSelection();
            setScanning(true);
          }}
          style={[styles.scanBtn, { borderColor: p.border, backgroundColor: p.surface }]}>
          <Ionicons name="scan-outline" size={22} color={p.accent} />
        </Pressable>
      </View>

      {/* Floating Autocomplete Dropdown ("comes over") */}
      {showDropdown ? (
        <View style={[styles.dropdown, { backgroundColor: p.card, borderColor: p.border }]}>
          {searching ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator color={p.accent} size="small" />
              <Text style={[styles.searchingText, { color: p.muted }]}>Searching medicines...</Text>
            </View>
          ) : null}

          {items.length > 0 ? (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.dropdownScroll}>
              {items.map((item, idx) => (
                <Pressable
                  key={`${item.alias}-${item.ingredient_ids.join()}`}
                  accessibilityRole="button"
                  onPress={() => {
                    tapSelection();
                    Keyboard.dismiss();
                    onPick(item);
                    setText('');
                  }}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: p.border },
                    pressed && { backgroundColor: p.surface },
                  ]}>
                  <View style={[styles.dropdownIconCircle, { backgroundColor: p.accentSoft }]}>
                    <Ionicons name="medical-outline" size={15} color={p.accent} />
                  </View>
                  <View style={styles.dropdownItemTextCol}>
                    <Text numberOfLines={1} style={[styles.dropdownItemTitle, { color: p.textStrong }]}>
                      {item.alias}
                    </Text>
                    <Text style={[styles.dropdownItemSub, { color: p.muted }]}>Generic / brand match</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={p.accent} />
                </Pressable>
              ))}
            </ScrollView>
          ) : !searching ? (
            <View style={styles.emptyDropdown}>
              <Ionicons name="alert-circle-outline" size={18} color={p.muted} />
              <Text style={[styles.emptyDropdownText, { color: p.muted }]}>
                {`No medicine found matching "${text}". Check spelling or try the generic name.`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <MedicineScanModal
        visible={scanning}
        onClose={() => setScanning(false)}
        onPick={(picked) => onPick({ alias: picked.alias, ingredient_ids: picked.ingredient_ids, similarity: 1 })}
      />
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    card: { gap: 14 },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    headIconTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headTextCol: { flex: 1, gap: 2 },
    title: { fontSize: 18, fontFamily: 'Poppins_600SemiBold' },
    muted: { fontSize: 13, lineHeight: 18 },
    pickerBox: { position: 'relative' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    inputContainer: {
      flex: 1,
      minWidth: 0,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    searchIcon: { marginRight: 2 },
    input: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '500', height: '100%' },
    clearInputBtn: { padding: 4, marginRight: -4, flexShrink: 0 },
    scanBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdown: {
      position: 'absolute',
      top: 54,
      left: 0,
      right: 0,
      zIndex: 1000,
      maxHeight: 240,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      shadowColor: '#171717',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 10,
      overflow: 'hidden',
    },
    dropdownScroll: { maxHeight: 240 },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownItemTextCol: { flex: 1, gap: 2 },
    dropdownItemTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    dropdownItemSub: { fontSize: 12.5, lineHeight: 17 },
    searchingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
    },
    searchingText: { fontSize: 13, fontWeight: '500' },
    emptyDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
    },
    emptyDropdownText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
    chosenCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      paddingHorizontal: 14,
    },
    chosenIconBadge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    chosenTextCol: { flex: 1, gap: 1 },
    chosenLabelText: { fontSize: 12, fontWeight: '600' },
    chosenTitleText: { fontSize: 15, fontWeight: '700' },
    chosenCloseBtn: { padding: 4 },
    pendingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    pendingText: { fontSize: 13.5, fontWeight: '600' },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    errorText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
    clear: { fontSize: 13, fontWeight: '700' },
  });
}
