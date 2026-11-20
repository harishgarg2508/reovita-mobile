import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { useCreateHandle } from '../model/use-social-actions';

// First visit: the person chooses the name others will see. It is the only thing shown on Social.
export function JoinPanel() {
  const p = usePalette();
  const create = useCreateHandle();
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');

  const clean = handle.trim().replace(/^@+/, '').toLowerCase();
  const valid = /^[a-z0-9_]{3,24}$/.test(clean) && !clean.startsWith('_') && !clean.endsWith('_');

  function submit() {
    if (!valid || create.isPending) return;
    create.mutate({ handle: clean, displayName: name.trim() });
  }

  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={[styles.icon, { backgroundColor: p.accentSoft }]}>
        <Ionicons name="people" size={24} color={p.accent} />
      </View>
      <Text style={[styles.title, { color: p.text }]}>Create your social account</Text>
      <Text style={[styles.body, { color: p.muted }]}>
        Share your progress, cheer others on and make friends. Pick a handle that others will see. Your name, your health information and your reports are never shown.
      </Text>

      <Text style={[styles.label, { color: p.text }]}>Handle</Text>
      <View style={[styles.field, { borderColor: create.isError ? p.red : p.border, backgroundColor: p.input }]}>
        <Text style={[styles.at, { color: p.muted }]}>@</Text>
        <TextInput
          value={handle}
          onChangeText={(v) => {
            create.reset();
            setHandle(v.replace(/[^A-Za-z0-9_@]/g, '').slice(0, 25));
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={25}
          placeholder="pavitar"
          placeholderTextColor={p.muted}
          style={[styles.input, { color: p.text }]}
          accessibilityLabel="Handle"
        />
      </View>
      <Text style={[styles.hint, { color: create.isError ? p.red : p.muted }]}>
        {create.isError ? (create.error as Error).message : '3 to 24 letters, numbers or underscores. Do not use your real name.'}
      </Text>

      <Text style={[styles.label, { color: p.text }]}>Display name (optional)</Text>
      <View style={[styles.field, { borderColor: p.border, backgroundColor: p.input }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="Pavitar"
          placeholderTextColor={p.muted}
          style={[styles.input, { color: p.text }]}
          accessibilityLabel="Display name"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !valid || create.isPending, busy: create.isPending }}
        disabled={!valid || create.isPending}
        onPress={submit}
        style={[styles.button, { backgroundColor: p.accent }, (!valid || create.isPending) && { opacity: 0.5 }]}>
        {create.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Join</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 10 },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 50 },
  at: { fontSize: 16, marginRight: 2 },
  input: { flex: 1, fontSize: 16, padding: 0, height: '100%' },
  hint: { fontSize: 12, lineHeight: 16 },
  button: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
