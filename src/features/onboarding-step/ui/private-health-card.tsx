import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

import { usePrivateStatus } from '../model/private-health';
import { PrivateHealthSheet } from './private-health-sheet';

// The optional private section at the end of the lifestyle step. It never holds the answers: it only says whether any are saved,
// and opens the sheet where they are given, or opened with the security answer. Skipping it changes nothing for the step.
export function PrivateHealthCard() {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const status = usePrivateStatus();
  const [open, setOpen] = useState(false);
  // A new count remounts the sheet, so nothing typed or read in it survives from one opening to the next.
  const [opened, setOpened] = useState(0);

  const saved = status.data?.configured === true;
  const lockedUntil = status.data?.locked_until && new Date(status.data.locked_until) > new Date();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>Private health (optional)</Text>
          <Text style={styles.sub}>Questions about intimate health, locked with a security answer only you know.</Text>
        </View>
      </View>
      {status.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : status.isError ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setOpened((n) => n + 1);
            setOpen(true);
          }}
          style={styles.button}>
          <Text style={styles.buttonText}>{saved ? (lockedUntil ? 'Locked for now' : 'Open my private answers') : 'Add privately'}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </Pressable>
      )}
      {saved ? <Text style={styles.note}>Saved and encrypted.</Text> : null}
      <PrivateHealthSheet key={opened} visible={open} onClose={() => setOpen(false)} status={status.data} />
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
    card: { gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.card, padding: 16 },
    head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    headText: { flex: 1, gap: 2 },
    title: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: colors.textStrong },
    sub: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.muted },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 14 },
    buttonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: colors.accent },
    note: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: colors.muted },
  });
