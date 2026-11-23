import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { accentSet, selectAccent, selectThemeMode, themeModeSet, type PreferencesState, type ThemeMode } from '@entities/preferences';
import { tapSelection } from '@shared/lib';
import { ACCENTS, ACCENT_IDS, Gap, Rule, Type, useResolvedScheme, usePalette, type Palette } from '@shared/ui/theme';

interface PreferencesRootState {
  preferences: PreferencesState;
}

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match phone' },
];

// The person's own look for the app, in their profile: light, dark or the phone's setting, and one of six colour themes. A colour theme changes the brand
// colour only. Health results keep their own colours (green for in range, amber for watch, red for abnormal), so a result reads the same in every theme.
export function ThemePicker() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const dispatch = useDispatch();
  const mode = useSelector((state: PreferencesRootState) => selectThemeMode(state));
  const accent = useSelector((state: PreferencesRootState) => selectAccent(state));
  const scheme = useResolvedScheme();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Appearance</Text>
      <Text style={styles.line}>Choose how Reovita looks. Your choice stays on this phone.</Text>

      <Text style={styles.label}>Mode</Text>
      <View style={styles.modes} accessibilityRole="radiogroup">
        {MODES.map((m) => {
          const on = mode === m.value;
          return (
            <Pressable
              key={m.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tapSelection();
                dispatch(themeModeSet(m.value));
              }}
              style={[styles.mode, on && { backgroundColor: p.accent }]}>
              <Text style={[styles.modeText, on && { color: '#FFFFFF' }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Colour theme</Text>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        {ACCENT_IDS.map((id) => {
          const on = accent === id;
          const color = ACCENTS[id][scheme].accent;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={`${ACCENTS[id].label} theme`}
              accessibilityState={{ selected: on }}
              onPress={() => {
                tapSelection();
                dispatch(accentSet(id));
              }}
              style={styles.swatchCell}>
              <View style={[styles.ring, on && { borderColor: color }]}>
                <View style={[styles.dot, { backgroundColor: color }]}>{on ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}</View>
              </View>
              <Text style={[styles.swatchLabel, on && { color: p.textStrong }]}>{ACCENTS[id].label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: Gap.inner },
    title: { ...Type.title, color: p.textStrong },
    line: { ...Type.small, color: p.muted },
    label: { ...Type.label, color: p.muted, marginTop: Gap.inner },
    modes: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: p.surface, borderWidth: Rule, borderColor: p.border },
    mode: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    modeText: { ...Type.label, color: p.muted },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Gap.inner },
    swatchCell: { width: '33.33%', alignItems: 'center', gap: 6 },
    ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    swatchLabel: { ...Type.small, color: p.muted },
  });
}
