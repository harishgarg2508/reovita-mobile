import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { isApiError } from '@shared/api';
import { tapConfirm } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_TYPE, type SocialPost } from '@entities/social';

import { useUpdatePost } from '../model/use-social-actions';

const MAX_CHARS = 500;

// Change the text of my own post, in the swipe-down drawer. The photo, topic and check-in stamp stay as posted.
export function EditPostSheet({ post, onClose }: { post: SocialPost | null; onClose: () => void }) {
  // The form is mounted only while a post is being edited, so it starts from that post's text each time.
  return (
    <BottomSheet visible={post !== null} onClose={onClose}>
      {post ? <EditPostForm key={post.id} post={post} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function EditPostForm({ post, onClose }: { post: SocialPost; onClose: () => void }) {
  const p = usePalette();
  const update = useUpdatePost();
  const [text, setText] = useState(post.body);
  const clean = text.trim();
  // A post with a photo may have no text; a text post cannot be empty.
  const canSave = !update.isPending && clean !== post.body.trim() && (clean.length > 0 || post.has_photo);
  const message = update.isError ? (isApiError(update.error) ? update.error.message : 'Could not save the change. Try again.') : null;

  return (
    <View style={styles.form}>
      <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Edit caption</Text>
      <TextInput
        value={text}
        onChangeText={(v) => {
          update.reset();
          setText(v.slice(0, MAX_CHARS));
        }}
        maxLength={MAX_CHARS}
        multiline
        autoFocus
        placeholder={post.has_photo ? 'Add a caption' : 'Write something'}
        placeholderTextColor={p.muted}
        accessibilityLabel="Caption"
        style={[styles.input, { color: p.text, borderColor: message ? p.red : p.border, backgroundColor: p.input }]}
      />
      <Text style={[SOCIAL_TYPE.small, styles.count, { color: p.muted }]}>
        {text.length} of {MAX_CHARS}
      </Text>
      {message ? <Text style={[SOCIAL_TYPE.small, { color: p.red }]}>{message}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, { borderColor: p.border, borderWidth: 1 }]}>
          <Text style={[SOCIAL_TYPE.bodyStrong, { color: p.text }]}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: update.isPending }}
          disabled={!canSave}
          onPress={() => {
            tapConfirm();
            update.mutate({ post, body: clean }, { onSuccess: onClose });
          }}
          style={[styles.button, { backgroundColor: p.accent, opacity: canSave || update.isPending ? 1 : 0.5 }]}>
          {update.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[SOCIAL_TYPE.bodyStrong, { color: '#FFFFFF' }]}>Save</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  input: { minHeight: 110, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top' },
  count: { textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
