import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { tapConfirm } from '@shared/lib';
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

  const kind = card?.kind ?? 'streak';

  return (
    <BottomSheet visible={card !== null} onClose={close}>
      <Text style={[styles.title, { color: p.text }]}>Share Card</Text>
      <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
        {card ? (
          <Svg ref={(node) => { svgRef.current = node as never; }} width={previewWidth} height={previewHeight} viewBox={`0 0 ${W} ${H}`}>
            <Defs>
              {/* Streak Card Background Gradient */}
              <LinearGradient id="streakBg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#140A1E" />
                <Stop offset="45%" stopColor="#25102E" />
                <Stop offset="100%" stopColor="#3E151E" />
              </LinearGradient>
              <RadialGradient id="streakAura" cx="50%" cy="40%" r="55%">
                <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                <Stop offset="50%" stopColor="#EF4444" stopOpacity="0.12" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>

              {/* Flame Gradient */}
              <LinearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FCD34D" />
                <Stop offset="40%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#DC2626" />
              </LinearGradient>

              {/* Recap Card Background Gradient */}
              <LinearGradient id="recapBg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#081A16" />
                <Stop offset="50%" stopColor="#113327" />
                <Stop offset="100%" stopColor="#0D241C" />
              </LinearGradient>
              <RadialGradient id="recapAura" cx="50%" cy="38%" r="60%">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                <Stop offset="60%" stopColor="#059669" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>

              {/* Post Card Background Gradient */}
              <LinearGradient id="postBg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#0F172A" />
                <Stop offset="50%" stopColor="#1E293B" />
                <Stop offset="100%" stopColor="#0F1420" />
              </LinearGradient>
              <RadialGradient id="postAura" cx="50%" cy="25%" r="65%">
                <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>

              <ClipPath id="photoClip">
                <Rect x={90} y={150} width={900} height={640} rx={44} />
              </ClipPath>
            </Defs>

            {/* Background & Aura */}
            <Rect x={0} y={0} width={W} height={H} fill={kind === 'streak' ? 'url(#streakBg)' : kind === 'recap' ? 'url(#recapBg)' : 'url(#postBg)'} />
            <Rect x={0} y={0} width={W} height={H} fill={kind === 'streak' ? 'url(#streakAura)' : kind === 'recap' ? 'url(#recapAura)' : 'url(#postAura)'} />

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
      <Rect x={W / 2 - 130} y={H - 96} width={260} height={46} rx={23} fill="#FFFFFF" fillOpacity={0.12} />
      <SvgText x={W / 2} y={H - 66} fontSize={22} fontWeight="800" fill="#FFFFFF" fillOpacity={0.95} textAnchor="middle" letterSpacing={4}>
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
      <Rect x={90} y={70} width={Math.max(260, post.handle.length * 28 + 100)} height={60} rx={30} fill="#FFFFFF" fillOpacity={0.15} />
      <SvgText x={125} y={112} fontSize={32} fontWeight="800" fill="#FFFFFF">
        @{post.handle}
      </SvgText>

      {hasPhoto ? <SvgImage x={90} y={150} width={900} height={640} href={{ uri: photo }} preserveAspectRatio="xMidYMid slice" clipPath="url(#photoClip)" /> : null}

      {lines.map((line, i) => (
        <SvgText key={i} x={hasPhoto ? 90 : W / 2} y={startY + i * (fontSize * 1.3)} fontSize={fontSize} fontWeight={hasPhoto ? '500' : '800'} fill="#FFFFFF" textAnchor={hasPhoto ? 'start' : 'middle'}>
          {line}
        </SvgText>
      ))}

      {post.stamp ? (
        <G>
          <Rect x={90} y={H - 250} width={580} height={76} rx={38} fill="#FFFFFF" fillOpacity={0.16} stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={2} />
          <Path d={FLAME} transform={`translate(112 ${H - 245}) scale(0.16) translate(-400 -300)`} fill="url(#flameGrad)" />
          <SvgText x={190} y={H - 200} fontSize={32} fontWeight="800" fill="#FFFFFF">
            {post.stamp.streak}-day streak · {topicLabel(post.stamp.habit) ?? 'Habit'}
          </SvgText>
        </G>
      ) : topic ? (
        <G>
          <Rect x={90} y={H - 250} width={Math.max(220, topic.length * 26 + 80)} height={76} rx={38} fill="#FFFFFF" fillOpacity={0.16} stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={2} />
          <SvgText x={130} y={H - 200} fontSize={32} fontWeight="800" fill="#FFFFFF">
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
      <Rect x={W / 2 - 170} y={100} width={340} height={60} rx={30} fill="#FFFFFF" fillOpacity={0.15} />
      <SvgText x={W / 2} y={142} fontSize={32} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
        @{handle}
      </SvgText>

      <SvgText x={W / 2} y={240} fontSize={38} fontWeight="700" fill="#A7F3D0" textAnchor="middle" letterSpacing={2}>
        WEEKLY RECAP
      </SvgText>

      <SvgText x={W / 2} y={590} fontSize={250} fontWeight="900" fill="#FFFFFF" textAnchor="middle">
        {recap.active_days}
        <TSpan fontSize={120} fill="#6EE7B7">/7</TSpan>
      </SvgText>

      <SvgText x={W / 2} y={680} fontSize={46} fontWeight="700" fill="#FFFFFF" fillOpacity={0.9} textAnchor="middle">
        Days Checked In
      </SvgText>

      {/* Week Day Dots with glowing badges */}
      {recap.days.map((d, i) => {
        const cx = 150 + i * 130;
        const weekday = WEEKDAYS[new Date(`${d.day}T00:00:00Z`).getUTCDay()];
        return (
          <G key={d.day}>
            <Circle cx={cx} cy={820} r={40} fill={d.checked_in ? '#10B981' : '#FFFFFF'} fillOpacity={d.checked_in ? 1 : 0.08} stroke={d.checked_in ? '#34D399' : '#FFFFFF'} strokeOpacity={d.checked_in ? 1 : 0.3} strokeWidth={4} />
            {d.checked_in ? (
              <SvgText x={cx} y={832} fontSize={32} fontWeight="900" fill="#FFFFFF" textAnchor="middle">
                ✓
              </SvgText>
            ) : null}
            <SvgText x={cx} y={905} fontSize={28} fontWeight="700" fill="#FFFFFF" fillOpacity={d.checked_in ? 1 : 0.5} textAnchor="middle">
              {weekday}
            </SvgText>
          </G>
        );
      })}

      <Rect x={120} y={1010} width={W - 240} height={130} rx={28} fill="#FFFFFF" fillOpacity={0.1} stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth={2} />
      <SvgText x={W / 2} y={1062} fontSize={34} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
        {top ? `Top Focus: ${top}` : 'Active & Moving'}
      </SvgText>
      <SvgText x={W / 2} y={1112} fontSize={30} fontWeight="600" fill="#A7F3D0" textAnchor="middle">
        🔥 {recap.streak}-day streak · {recap.check_ins} check-ins
      </SvgText>
    </G>
  );
}

function StreakCardArt({ handle, streak, best, total }: { handle: string; streak: number; best: number; total: number }) {
  return (
    <G>
      <Rect x={W / 2 - 170} y={100} width={340} height={60} rx={30} fill="#FFFFFF" fillOpacity={0.15} />
      <SvgText x={W / 2} y={142} fontSize={32} fontWeight="800" fill="#FFFFFF" textAnchor="middle">
        @{handle}
      </SvgText>

      {/* Radiant Flame with Glowing Gradient */}
      <Path d={FLAME} fill="url(#flameGrad)" />

      <SvgText x={W / 2} y={870} fontSize={240} fontWeight="900" fill="#FFFFFF" textAnchor="middle">
        {streak}
      </SvgText>
      <SvgText x={W / 2} y={960} fontSize={56} fontWeight="800" fill="#FCD34D" textAnchor="middle" letterSpacing={2}>
        DAY STREAK
      </SvgText>

      {/* Metric Capsule */}
      <Rect x={140} y={1040} width={W - 280} height={100} rx={50} fill="#FFFFFF" fillOpacity={0.12} stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} />
      <SvgText x={W / 2} y={1102} fontSize={34} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
        Personal Best: {best} days  ·  {total} Check-ins
      </SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800' },
  preview: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  error: { fontSize: 12.5, textAlign: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, marginTop: 4 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
