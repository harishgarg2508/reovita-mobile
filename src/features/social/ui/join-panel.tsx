import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialTerms } from '@entities/social';

import { pickPicture, type PickedPicture } from '../model/pick-picture';
import { useAcceptSocialTerms, useCreateHandle } from '../model/use-social-actions';

// First visit: the person reads the terms, ticks that they are 18 or older and agree, and chooses the name others will see. It is the only thing
// shown on Social. When the terms change later, the same panel comes back without the name fields: only the new text and Agree. The text is the
// server's (GET /v1/social/terms), so what is shown is exactly the version that gets recorded. A person under 18 is refused by the server, and
// its message is shown here.
export function JoinPanel() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const terms = useSocialTerms();
  const create = useCreateHandle();
  const accept = useAcceptSocialTerms();
  const returning = me.needsTerms;
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  // The profile picture and the cover are optional. They are chosen here and sent once the account is made.
  const [avatar, setAvatar] = useState<PickedPicture | null>(null);
  const [cover, setCover] = useState<PickedPicture | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  async function choose(kind: 'avatar' | 'cover') {
    setPickError(null);
    try {
      const picked = await pickPicture();
      if (picked) {
        tapSelection();
        (kind === 'avatar' ? setAvatar : setCover)(picked);
      }
    } catch (err) {
      setPickError((err as Error).message);
    }
  }

  const clean = handle.trim().replace(/^@+/, '').toLowerCase();
  const validHandle = /^[a-z0-9_]{3,24}$/.test(clean) && !clean.startsWith('_') && !clean.endsWith('_');
  const pending = create.isPending || accept.isPending;
  const canSubmit = !!terms.data && agreed && (returning || validHandle) && !pending;
  const failure = (returning ? accept.error : create.error) as Error | null;

  function submit() {
    if (!canSubmit || !terms.data) return;
    tapConfirm();
    if (returning) accept.mutate(terms.data.version);
    else create.mutate({ handle: clean, displayName: name.trim(), termsVersion: terms.data.version, avatar, cover });
  }

  return (
    <View style={styles.wrap}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: p.text }]}>{returning ? 'The social terms changed' : (terms.data?.title ?? 'Create your social account')}</Text>

        {terms.isPending ? (
          <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} />
        ) : terms.isError || !terms.data ? (
          <Text style={[styles.body, { color: p.red }]}>Could not load the terms. Check your connection and open this screen again.</Text>
        ) : (
          <>
            <Text style={[styles.body, { color: p.muted }]}>{returning ? 'Please read the terms again and agree to keep using Social. Your account and posts stay as they are.' : terms.data.intro}</Text>
            <View style={styles.points}>
              {terms.data.points.map((point) => (
                <View key={point.title} style={[styles.point, { backgroundColor: p.surface }]}>
                  <Text style={[styles.pointTitle, { color: p.text }]}>{point.title}</Text>
                  <Text style={[styles.pointBody, { color: p.muted }]}>{point.body}</Text>
                </View>
              ))}
              <Text style={[styles.pointBody, { color: p.muted }]}>{terms.data.withdrawal}</Text>
            </View>

            {returning ? null : (
              <>
                <Text style={[styles.label, { color: p.text }]}>Profile photo and cover (optional)</Text>
                <View style={{ marginBottom: 30 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Choose a cover" onPress={() => void choose('cover')} style={[styles.coverPick, { backgroundColor: p.surface, borderColor: p.border }]}>
                    {cover ? <Image source={{ uri: cover.uri }} style={styles.fill} resizeMode="cover" /> : <Text style={[styles.hint, { color: p.muted }]}>Tap to add a cover</Text>}
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Choose a profile photo" onPress={() => void choose('avatar')} style={[styles.avatarPick, { backgroundColor: p.accentSoft, borderColor: p.card }]}>
                    {avatar ? <Image source={{ uri: avatar.uri }} style={styles.fill} resizeMode="cover" /> : <Ionicons name="camera-outline" size={24} color={p.accent} />}
                  </Pressable>
                </View>
                {pickError ? <Text style={[styles.hint, { color: p.red }]}>{pickError}</Text> : null}

                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: p.text }]}>Handle</Text>
                  {clean.length >= 3 && validHandle ? (
                    <View style={styles.validTag}>
                      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                      <Text style={styles.validTagText}>Valid handle</Text>
                    </View>
                  ) : null}
                </View>
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
                    placeholder="fitness_mover"
                    placeholderTextColor={p.muted}
                    style={[styles.input, { color: p.text }]}
                    accessibilityLabel="Handle"
                  />
                </View>
                <Text style={[styles.hint, { color: p.muted }]}>3 to 24 letters, numbers or underscores. Do not use your real name.</Text>

                <Text style={[styles.label, { color: p.text }]}>Display name (optional)</Text>
                <View style={[styles.field, { borderColor: p.border, backgroundColor: p.input }]}>
                  <TextInput value={name} onChangeText={setName} maxLength={40} placeholder="Display Name" placeholderTextColor={p.muted} style={[styles.input, { color: p.text }]} accessibilityLabel="Display name" />
                </View>
              </>
            )}

          </>
        )}
      </View>
    </ScrollView>
    {terms.data ? (
      <View style={[styles.footer, { borderTopColor: p.border, backgroundColor: p.bg, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              onPress={() => {
                tapSelection();
                setAgreed((v) => !v);
              }}
              style={styles.agreeRow}>
              <View style={[styles.box, { borderColor: agreed ? p.accent : p.border, backgroundColor: agreed ? p.accent : 'transparent' }]}>
                {agreed ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.agreeText, { color: p.text }]}>{terms.data.agree_label}</Text>
            </Pressable>

            {failure ? <Text style={[styles.hint, { color: p.red }]}>{failure.message}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: pending }}
              disabled={!canSubmit}
              onPress={submit}
              style={[styles.button, { backgroundColor: p.accent }, !canSubmit && { opacity: 0.5 }]}>
              {pending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{returning ? 'Agree and continue' : 'Join Social'}</Text>}
            </Pressable>
      </View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  // The terms scroll; the tick box and the button stay fixed under them.
  scroll: { flex: 1 },
  scrollBody: { paddingBottom: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  card: { paddingVertical: 8, gap: 12 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  body: { fontSize: 14, lineHeight: 20 },
  points: { gap: 8, marginVertical: 4 },
  point: { borderRadius: 14, padding: 12, gap: 3 },
  pointTitle: { fontSize: 13.5, fontWeight: '800' },
  pointBody: { fontSize: 13, lineHeight: 19 },
  fill: { width: '100%', height: '100%' },
  coverPick: { height: 104, borderRadius: 16, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarPick: { position: 'absolute', left: 16, bottom: -28, width: 68, height: 68, borderRadius: 34, borderWidth: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  validTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  validTagText: { fontSize: 11.5, fontWeight: '700', color: '#10B981' },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 50 },
  at: { fontSize: 16, marginRight: 2 },
  input: { flex: 1, fontSize: 16, padding: 0, height: '100%' },
  hint: { fontSize: 12, lineHeight: 16 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  agreeText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  button: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
