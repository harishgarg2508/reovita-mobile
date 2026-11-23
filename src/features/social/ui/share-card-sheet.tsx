import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';


import { BottomSheet } from '@shared/ui/bottom-sheet';
import { tapConfirm } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { usePostPhoto, type SocialPost, type SocialRecap } from '@entities/social';

import { CARD_H as H, CARD_W as W, PostCardArt, RecapCardArt, StreakCardArt, wrapText } from './share-card-art';

export { wrapText };

// What a share card shows. A post: the pseudonymous handle, the words, the photo, the topic and the streak stamp. A streak: the numbers of the person's
// consistency. Nothing else goes on a card: no real name, no health data, no link to the account.
export type ShareCardContent =
  | { kind: 'post'; post: SocialPost }
  | { kind: 'streak'; handle: string; streak: number; best: number; total: number }
  | { kind: 'recap'; handle: string; recap: SocialRecap };

// A preview of the card in a swipe-down drawer, with a button that turns it into a PNG picture and opens the phone's share sheet (WhatsApp,
// Instagram and so on). In a browser the picture downloads instead. If the picture cannot be made, the words are shared as text.
export function ShareCardSheet({ card, onClose }: { card: ShareCardContent | null; onClose: () => void }) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const svgRef = useRef<{ toDataURL: (callback: (base64: string) => void, options?: { width: number; height: number }) => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = card?.kind === 'post' ? card.post : null;
  const photo = usePostPhoto(post?.id ?? '', !!post?.has_photo);

  const previewWidth = Math.min(width - 64, 320);
  const previewHeight = Math.round((previewWidth * H) / W);

  function close() {
    setError(null);
    setBusy(false);
    onClose();
  }

  async function share() {
    if (!svgRef.current || busy) return;
    tapConfirm();
    setBusy(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve) => svgRef.current?.toDataURL(resolve, { width: W, height: H }));
      if (Platform.OS === 'web') {
        const doc = (globalThis as unknown as { document: { createElement(tag: string): { href: string; download: string; click(): void } } }).document;
        const link = doc.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = 'reovita-card.png';
        link.click();
      } else {
        const uri = `${FileSystem.cacheDirectory ?? ''}reovita-card-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share' });
      }
    } catch {
      // The picture could not be made or shared: the words go as text instead.
      setError('Could not make the picture, so the words were shared as text.');
      const text =
        card?.kind === 'post'
          ? `${card.post.body ? `${card.post.body}\n\n` : ''}@${card.post.handle} on Reovita`
          : card?.kind === 'streak'
            ? `${card.streak}-day streak on Reovita`
            : card?.kind === 'recap'
              ? `${card.recap.active_days} of 7 days checked in this week on Reovita`
              : '';
      void Share.share({ message: text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={card !== null} onClose={close}>
      <Text style={[styles.title, { color: p.text }]}>Share card</Text>
      <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
        {card ? (
          <Svg ref={(node) => { svgRef.current = node as never; }} width={previewWidth} height={previewHeight} viewBox={`0 0 ${W} ${H}`}>
            {card.kind === 'post' ? (
              <PostCardArt post={card.post} photo={photo.data ?? null} />
            ) : card.kind === 'streak' ? (
              <StreakCardArt handle={card.handle} streak={card.streak} best={card.best} total={card.total} />
            ) : (
              <RecapCardArt handle={card.handle} recap={card.recap} />
            )}
          </Svg>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: p.red }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || (!!post?.has_photo && photo.isPending)} onPress={() => void share()} style={[styles.button, { backgroundColor: p.accent }, (busy || (!!post?.has_photo && photo.isPending)) && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : (
          <>
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>{Platform.OS === 'web' ? 'Download picture' : 'Share picture'}</Text>
          </>
        )}
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800' },
  preview: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 27, 45, 0.12)',
  },
  error: { fontSize: 12.5, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    marginTop: 14,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
