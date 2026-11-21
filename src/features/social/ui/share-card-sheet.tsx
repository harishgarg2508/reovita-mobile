import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { topicLabel, usePostPhoto, type SocialPost, type SocialRecap } from '@entities/social';

// What a share card shows. A post: the pseudonymous handle, the words, the photo, the topic and the streak stamp. A streak: the numbers of the person's
// consistency. Nothing else goes on a card: no real name, no health data, no link to the account.
export type ShareCardContent =
  | { kind: 'post'; post: SocialPost }
  | { kind: 'streak'; handle: string; streak: number; best: number; total: number }
  | { kind: 'recap'; handle: string; recap: SocialRecap };

// A flame, drawn once and used on both cards (about 280 by 440, from 380,300).
const FLAME = 'M540 300 q-80 130 -10 250 q-80 -10 -100 -100 q-80 130 20 240 q100 110 220 30 q90 -80 40 -200 q-40 -80 -110 -140 q0 70 -34 120 q-48 -80 -36 -190z';

// The card is drawn at this size (a 4:5 picture, the size social apps like) and shown smaller in the preview.
const W = 1080;
const H = 1350;

// Breaks words into lines of at most `max` characters, at most `lines` of them, with "..." if the text is longer. A word longer than a line is cut.
export function wrapText(text: string, max: number, lines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (let word of words) {
    while (word.length > max) {
      if (line) {
        out.push(line);
        line = '';
      }
      out.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= max) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  const last = kept[lines - 1];
  kept[lines - 1] = `${last.length > max - 3 ? last.slice(0, max - 3) : last}...`;
  return kept;
}

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
            <Defs>
              <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#0E2A20" />
                <Stop offset="1" stopColor="#1F7A4D" />
              </LinearGradient>
              <ClipPath id="photoClip">
                <Rect x={90} y={150} width={900} height={640} rx={44} />
              </ClipPath>
            </Defs>
            <Rect x={0} y={0} width={W} height={H} fill="url(#bg)" />
            {card.kind === 'post' ? (
              <PostCardArt post={card.post} photo={photo.data ?? null} />
            ) : card.kind === 'streak' ? (
              <StreakCardArt handle={card.handle} streak={card.streak} best={card.best} total={card.total} />
            ) : (
              <RecapCardArt handle={card.handle} recap={card.recap} />
            )}
            <Brand />
          </Svg>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: p.red }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || (!!post?.has_photo && photo.isPending)} onPress={() => void share()} style={[styles.button, { backgroundColor: p.accent }, (busy || (!!post?.has_photo && photo.isPending)) && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : (
          <>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>{Platform.OS === 'web' ? 'Download picture' : 'Share picture'}</Text>
          </>
        )}
      </Pressable>
    </BottomSheet>
  );
}

// The footer of every card: the Reovita name.
function Brand() {
  return (
    <G>
      <SvgText x={W / 2} y={H - 70} fontSize={40} fontWeight="700" fill="#FFFFFF" fillOpacity={0.9} textAnchor="middle" letterSpacing={6}>
        REOVITA
      </SvgText>
    </G>
  );
}

function PostCardArt({ post, photo }: { post: SocialPost; photo: string | null }) {
  const topic = topicLabel(post.topic);
  const hasPhoto = post.has_photo && !!photo;
  // With a photo the words are a short caption under it; without one the words are the card.
  const lines = hasPhoto ? wrapText(post.body, 38, 3) : wrapText(post.body || 'A small win', 22, 8);
  const fontSize = hasPhoto ? 46 : 62;
  const startY = hasPhoto ? 880 : 400 - (Math.min(lines.length, 8) - 1) * 40;
  return (
    <G>
      <SvgText x={90} y={105} fontSize={44} fontWeight="700" fill="#FFFFFF">
        @{post.handle}
      </SvgText>
      {hasPhoto ? <SvgImage x={90} y={150} width={900} height={640} href={{ uri: photo }} preserveAspectRatio="xMidYMid slice" clipPath="url(#photoClip)" /> : null}
      {lines.map((line, i) => (
        <SvgText key={i} x={hasPhoto ? 90 : W / 2} y={startY + i * (fontSize * 1.3)} fontSize={fontSize} fontWeight={hasPhoto ? '500' : '700'} fill="#FFFFFF" textAnchor={hasPhoto ? 'start' : 'middle'}>
          {line}
        </SvgText>
      ))}
      {post.stamp ? (
        <G>
          <Rect x={90} y={H - 270} width={560} height={70} rx={35} fill="#FFFFFF" fillOpacity={0.16} />
          <Path d={FLAME} transform={`translate(112 ${H - 262}) scale(0.15) translate(-400 -300)`} fill="#F59A4A" />
          <SvgText x={190} y={H - 222} fontSize={34} fontWeight="700" fill="#FFFFFF">
            {post.stamp.streak}-day streak · {topicLabel(post.stamp.habit) ?? 'Habit'}
          </SvgText>
        </G>
      ) : topic ? (
        <G>
          <Rect x={90} y={H - 270} width={Math.max(220, topic.length * 26 + 80)} height={70} rx={35} fill="#FFFFFF" fillOpacity={0.16} />
          <SvgText x={130} y={H - 222} fontSize={34} fontWeight="700" fill="#FFFFFF">
            #{topic}
          </SvgText>
        </G>
      ) : null}
    </G>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// My last 7 days: a dot for each day (filled when I checked in), how many days, the top habit and the streak.
function RecapCardArt({ handle, recap }: { handle: string; recap: SocialRecap }) {
  const top = topicLabel(recap.top_habit);
  return (
    <G>
      <SvgText x={W / 2} y={170} fontSize={48} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
        @{handle}
      </SvgText>
      <SvgText x={W / 2} y={250} fontSize={44} fill="#FFFFFF" fillOpacity={0.85} textAnchor="middle">
        My week
      </SvgText>
      <SvgText x={W / 2} y={620} fontSize={260} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
        {recap.active_days}
        <TSpan fontSize={110} fillOpacity={0.7}>/7</TSpan>
      </SvgText>
      <SvgText x={W / 2} y={710} fontSize={54} fontWeight="600" fill="#FFFFFF" fillOpacity={0.9} textAnchor="middle">
        days checked in
      </SvgText>
      {recap.days.map((d, i) => {
        const cx = 150 + i * 130;
        const weekday = WEEKDAYS[new Date(`${d.day}T00:00:00Z`).getUTCDay()];
        return (
          <G key={d.day}>
            <Circle cx={cx} cy={850} r={38} fill={d.checked_in ? '#F59A4A' : 'none'} stroke={d.checked_in ? '#F59A4A' : '#FFFFFF'} strokeOpacity={d.checked_in ? 1 : 0.4} strokeWidth={5} />
            <SvgText x={cx} y={940} fontSize={30} fill="#FFFFFF" fillOpacity={0.8} textAnchor="middle">
              {weekday}
            </SvgText>
          </G>
        );
      })}
      <SvgText x={W / 2} y={1090} fontSize={42} fill="#FFFFFF" fillOpacity={0.9} textAnchor="middle">
        {top ? `Most days: ${top}` : 'A fresh start'}
      </SvgText>
      <SvgText x={W / 2} y={1160} fontSize={42} fill="#FFFFFF" fillOpacity={0.9} textAnchor="middle">
        {recap.streak}-day streak · {recap.check_ins} check-ins
      </SvgText>
    </G>
  );
}

function StreakCardArt({ handle, streak, best, total }: { handle: string; streak: number; best: number; total: number }) {
  return (
    <G>
      <SvgText x={W / 2} y={170} fontSize={48} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
        @{handle}
      </SvgText>
      <Path d={FLAME} fill="#F59A4A" />
      <SvgText x={W / 2} y={900} fontSize={230} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
        {streak}
      </SvgText>
      <SvgText x={W / 2} y={990} fontSize={60} fontWeight="600" fill="#FFFFFF" fillOpacity={0.9} textAnchor="middle">
        day streak
      </SvgText>
      <SvgText x={W / 2} y={1130} fontSize={40} fill="#FFFFFF" fillOpacity={0.85} textAnchor="middle">
        Best {best} · {total} check-ins
      </SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800' },
  preview: { alignSelf: 'center', borderRadius: 16, overflow: 'hidden' },
  error: { fontSize: 12.5, textAlign: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
