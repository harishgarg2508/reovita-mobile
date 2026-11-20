import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';

import { SOCIAL_HOME } from '../model/routes';
import { useCreatePost } from '../model/use-social-actions';

const MAX_CHARS = 500;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type Photo = { uri: string; name: string; type: string };

// Write a post, with an optional photo. A photo's position, phone model and time are removed on the server before it is stored, and a
// post never carries anything from the person's health information: it is only what they type and choose here.
export function ComposeScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const create = useCreatePost();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const canPost = (text.trim().length > 0 || photo !== null) && !create.isPending;

  async function pickPhoto() {
    setPhotoError(null);
    const picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], multiple: false, copyToCacheDirectory: true });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (asset.size && asset.size > MAX_PHOTO_BYTES) {
      setPhotoError('Choose a photo under 5 MB.');
      return;
    }
    setPhoto({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' });
  }

  function submit() {
    if (!canPost) return;
    create.mutate({ body: text.trim(), photo: photo ?? undefined }, { onSuccess: () => goBackOr(router, SOCIAL_HOME) });
  }

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="close" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>New post</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPost, busy: create.isPending }}
          disabled={!canPost}
          onPress={submit}
          style={[styles.post, { backgroundColor: p.accent }, !canPost && { opacity: 0.45 }]}>
          {create.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.postText}>Post</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <TextInput
          value={text}
          onChangeText={(v) => setText(v.slice(0, MAX_CHARS))}
          multiline
          placeholder="Share your progress, a walk, a streak, a small win"
          placeholderTextColor={p.muted}
          style={[styles.input, { color: p.text, backgroundColor: p.input, borderColor: p.border }]}
          accessibilityLabel="Post text"
          maxLength={MAX_CHARS}
        />
        <Text style={[styles.count, { color: p.muted }]}>{text.length}/{MAX_CHARS}</Text>

        {photo ? (
          <View style={styles.preview}>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" accessibilityLabel="Selected photo" />
            <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} style={styles.remove}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={[styles.add, { borderColor: p.border, backgroundColor: p.card }]}>
            <Ionicons name="image-outline" size={20} color={p.accent} />
            <Text style={[styles.addText, { color: p.accent }]}>Add a photo</Text>
          </Pressable>
        )}
        {photoError ? <Text style={[styles.note, { color: p.red }]}>{photoError}</Text> : null}
        {create.isError ? <Text style={[styles.note, { color: p.red }]}>{(create.error as Error).message}</Text> : null}

        <Text style={[styles.note, { color: p.muted }]}>
          Posts are public: anyone on Social can see them in For you. Keep your health details, reports and exact location out of what you share. Hidden data in a photo, like its position, is removed before it is saved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  post: { minWidth: 72, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  postText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  body: { paddingHorizontal: 16, gap: 10 },
  input: { minHeight: 150, borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  count: { fontSize: 12, textAlign: 'right' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, borderWidth: 1 },
  addText: { fontSize: 14.5, fontWeight: '700' },
  preview: { borderRadius: 16, overflow: 'hidden' },
  previewImage: { width: '100%', aspectRatio: 4 / 3 },
  remove: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12.5, lineHeight: 18 },
});
