import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';

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
              <LinearGradient id="streakBg" x1="0" y1="0" x2="0.3" y2="1">
                <Stop offset="0%" stopColor="#0E0717" />
                <Stop offset="30%" stopColor="#1A0B26" />
                <Stop offset="65%" stopColor="#2A0B22" />
                <Stop offset="100%" stopColor="#3F0D1B" />
              </LinearGradient>
              <RadialGradient id="streakAura" cx="50%" cy="36%" r="55%">
                <Stop offset="0%" stopColor="#F97316" stopOpacity="0.4" />
                <Stop offset="35%" stopColor="#DC2626" stopOpacity="0.2" />
                <Stop offset="70%" stopColor="#7F1D1D" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="0.8">
                <Stop offset="0%" stopColor="#991B1B" stopOpacity="0.65" />
                <Stop offset="50%" stopColor="#B91C1C" stopOpacity="0.45" />
                <Stop offset="100%" stopColor="#7C2D12" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0.7">
                <Stop offset="0%" stopColor="#C2410C" stopOpacity="0.7" />
                <Stop offset="50%" stopColor="#EA580C" stopOpacity="0.5" />
                <Stop offset="100%" stopColor="#9A3412" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="flameGradOuter" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FDE047" />
                <Stop offset="25%" stopColor="#F59E0B" />
                <Stop offset="65%" stopColor="#EA580C" />
                <Stop offset="100%" stopColor="#DC2626" />
              </LinearGradient>
              <LinearGradient id="flameGradInner" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FEF08A" />
                <Stop offset="35%" stopColor="#FBBF24" />
                <Stop offset="75%" stopColor="#F97316" />
                <Stop offset="100%" stopColor="#EF4444" />
              </LinearGradient>
              <LinearGradient id="flameGradCore" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="40%" stopColor="#FEF08A" />
                <Stop offset="80%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#EA580C" />
              </LinearGradient>
              <LinearGradient id="orbitGrad1" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.1" />
                <Stop offset="20%" stopColor="#FBBF24" stopOpacity="0.85" />
                <Stop offset="50%" stopColor="#FEF08A" stopOpacity="1" />
                <Stop offset="80%" stopColor="#F59E0B" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#D97706" stopOpacity="0.15" />
              </LinearGradient>
              <LinearGradient id="orbitGrad2" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#D97706" stopOpacity="0.05" />
                <Stop offset="30%" stopColor="#F59E0B" stopOpacity="0.7" />
                <Stop offset="70%" stopColor="#FDE68A" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#EA580C" stopOpacity="0.1" />
              </LinearGradient>
              <LinearGradient id="btnBorderGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#A855F7" />
                <Stop offset="40%" stopColor="#EC4899" />
                <Stop offset="80%" stopColor="#F97316" />
                <Stop offset="100%" stopColor="#FBBF24" />
              </LinearGradient>

              {/* Flame Gradient for Posts */}
              <LinearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FCD34D" />
                <Stop offset="40%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#DC2626" />
              </LinearGradient>

              {/* Recap Card Background Gradient */}
              <LinearGradient id="recapBg" x1="0" y1="0" x2="0.3" y2="1">
                <Stop offset="0%" stopColor="#03160D" />
                <Stop offset="35%" stopColor="#062817" />
                <Stop offset="70%" stopColor="#08331E" />
                <Stop offset="100%" stopColor="#02140A" />
              </LinearGradient>
              <RadialGradient id="recapAura" cx="50%" cy="36%" r="55%">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                <Stop offset="45%" stopColor="#059669" stopOpacity="0.18" />
                <Stop offset="80%" stopColor="#047857" stopOpacity="0.04" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="recapArcGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#86EFAC" />
                <Stop offset="40%" stopColor="#4ADE80" />
                <Stop offset="100%" stopColor="#22C55E" />
              </LinearGradient>
              <LinearGradient id="recapWaveGrad1" x1="0" y1="0" x2="1" y2="0.8">
                <Stop offset="0%" stopColor="#064E3B" stopOpacity="0.6" />
                <Stop offset="50%" stopColor="#047857" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#022C1A" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="recapWaveGrad2" x1="0" y1="0" x2="1" y2="0.7">
                <Stop offset="0%" stopColor="#059669" stopOpacity="0.5" />
                <Stop offset="50%" stopColor="#10B981" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#065F46" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#4ADE80" stopOpacity="0.8" />
                <Stop offset="50%" stopColor="#22C55E" stopOpacity="0.5" />
                <Stop offset="100%" stopColor="#15803D" stopOpacity="0.2" />
              </LinearGradient>

              {/* Post Card Background Gradient */}
              <LinearGradient id="postBg" x1="0" y1="0" x2="0.3" y2="1">
                <Stop offset="0%" stopColor="#0B1120" />
                <Stop offset="35%" stopColor="#0F172A" />
                <Stop offset="70%" stopColor="#1E1B4B" />
                <Stop offset="100%" stopColor="#090D16" />
              </LinearGradient>
              <RadialGradient id="postAura" cx="50%" cy="30%" r="60%">
                <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                <Stop offset="45%" stopColor="#6366F1" stopOpacity="0.15" />
                <Stop offset="80%" stopColor="#1E1B4B" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="postWaveGrad1" x1="0" y1="0" x2="1" y2="0.8">
                <Stop offset="0%" stopColor="#1E293B" stopOpacity="0.7" />
                <Stop offset="50%" stopColor="#312E81" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="postWaveGrad2" x1="0" y1="0" x2="1" y2="0.7">
                <Stop offset="0%" stopColor="#0369A1" stopOpacity="0.5" />
                <Stop offset="50%" stopColor="#38BDF8" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="postPhotoBorder" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
                <Stop offset="50%" stopColor="#818CF8" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
              </LinearGradient>

              <ClipPath id="photoClip">
                <Rect x={90} y={160} width={900} height={590} rx={36} />
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
          </Svg>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: p.red }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || (!!post?.has_photo && photo.isPending)} onPress={() => void share()} style={[styles.button, (busy || (!!post?.has_photo && photo.isPending)) && { opacity: 0.6 }]}>
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

function PostCardArt({ post, photo }: { post: SocialPost; photo: string | null }) {
  const cleanHandle = post.handle.replace(/^@/, '');
  const pillW = Math.max(260, Math.min(420, cleanHandle.length * 24 + 130));
  const topic = topicLabel(post.topic);
  const hasPhoto = post.has_photo && !!photo;

  // Words formatting:
  const lines = hasPhoto
    ? wrapText(post.body || 'Celebrating a healthy milestone today!', 40, 3)
    : wrapText(post.body || 'Small consistent steps lead to lasting change.', 26, 6);

  return (
    <G>
      {/* Background Atmosphere: Ambient Cyan & Indigo Bottom Waves */}
      <Path
        d="M0 650 C280 620 450 780 720 740 C880 715 980 640 1080 600"
        fill="none"
        stroke="#38BDF8"
        strokeOpacity={0.08}
        strokeWidth={2}
      />
      <Path
        d="M0 1140 C280 1160 480 1280 720 1270 C880 1260 980 1200 1080 1160 L1080 1350 L0 1350 Z"
        fill="url(#postWaveGrad1)"
      />
      <Path
        d="M0 1220 C220 1245 420 1315 650 1310 C820 1305 960 1250 1080 1210 L1080 1350 L0 1350 Z"
        fill="url(#postWaveGrad2)"
      />

      {/* Top Center User Pill with Flanking Lines */}
      <Line
        x1={W / 2 - pillW / 2 - 130}
        y1={106}
        x2={W / 2 - pillW / 2 - 25}
        y2={106}
        stroke="#38BDF8"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      <Rect
        x={W / 2 - pillW / 2}
        y={75}
        width={pillW}
        height={62}
        rx={31}
        fill="#0B132B"
        fillOpacity={0.75}
        stroke="#38BDF8"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
      {/* User Avatar Circle inside Pill */}
      <Circle
        cx={W / 2 - pillW / 2 + 36}
        cy={106}
        r={17}
        fill="#38BDF8"
        fillOpacity={0.15}
        stroke="#38BDF8"
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />
      <Circle cx={W / 2 - pillW / 2 + 36} cy={101} r={5} fill="#BAE6FD" />
      <Path
        d={`M ${W / 2 - pillW / 2 + 27} 117 C ${W / 2 - pillW / 2 + 27} 110, ${W / 2 - pillW / 2 + 45} 110, ${W / 2 - pillW / 2 + 45} 117`}
        fill="#BAE6FD"
      />
      <SvgText x={W / 2 - pillW / 2 + 64} y={116} fontSize={28} fontWeight="700" fill="#FFFFFF">
        {cleanHandle}
      </SvgText>
      <Line
        x1={W / 2 + pillW / 2 + 25}
        y1={106}
        x2={W / 2 + pillW / 2 + 130}
        y2={106}
        stroke="#38BDF8"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />

      {hasPhoto ? (
        <>
          {/* Hero Photo Container */}
          <Rect x={90} y={160} width={900} height={590} rx={36} fill="#0F172A" />
          <SvgImage
            x={90}
            y={160}
            width={900}
            height={590}
            href={{ uri: photo }}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#photoClip)"
          />
          {/* Frosted Inner Border Frame */}
          <Rect
            x={90}
            y={160}
            width={900}
            height={590}
            rx={36}
            fill="none"
            stroke="url(#postPhotoBorder)"
            strokeWidth={3}
          />

          {/* Optional Topic Chip in Photo Top-Right Corner */}
          {topic ? (
            <G>
              <Rect
                x={90 + 900 - Math.max(160, topic.length * 22 + 60) - 24}
                y={184}
                width={Math.max(160, topic.length * 22 + 60)}
                height={48}
                rx={24}
                fill="#000000"
                fillOpacity={0.65}
                stroke="#FFFFFF"
                strokeOpacity={0.2}
                strokeWidth={1.5}
              />
              <SvgText
                x={90 + 900 - Math.max(160, topic.length * 22 + 60) / 2 - 24}
                y={216}
                fontSize={22}
                fontWeight="800"
                fill="#38BDF8"
                textAnchor="middle"
              >
                #{topic}
              </SvgText>
            </G>
          ) : null}

          {/* Frosted Caption Card below Photo */}
          <Rect
            x={90}
            y={780}
            width={900}
            height={190}
            rx={38}
            fill="#0B132B"
            fillOpacity={0.78}
            stroke="#38BDF8"
            strokeOpacity={0.22}
            strokeWidth={2}
          />

          {/* Left Decorative Quote Mark */}
          <SvgText x={132} y={852} fontSize={64} fontWeight="900" fill="#38BDF8" fillOpacity={0.45}>
            {"“"}
          </SvgText>

          {/* Caption Lines */}
          {lines.map((line, i) => (
            <SvgText
              key={i}
              x={185}
              y={838 + i * 44}
              fontSize={32}
              fontWeight="600"
              fill="#F8FAFC"
            >
              {line}
            </SvgText>
          ))}

          {/* Achievement Row: Streak Stamp or Wellness Check-in Badge */}
          {post.stamp ? (
            <G>
              <Rect
                x={90}
                y={1000}
                width={560}
                height={72}
                rx={36}
                fill="#1E1B4B"
                fillOpacity={0.75}
                stroke="#818CF8"
                strokeOpacity={0.4}
                strokeWidth={2}
              />
              <Path
                d={FLAME}
                transform="translate(112 1005) scale(0.15) translate(-400 -300)"
                fill="url(#flameGradOuter)"
              />
              <SvgText x={186} y={1046} fontSize={30} fontWeight="800" fill="#FFFFFF">
                {post.stamp.streak}-day streak · {topicLabel(post.stamp.habit) ?? 'Habit'}
              </SvgText>

              {/* Verified Community Badge alongside */}
              <Rect
                x={670}
                y={1000}
                width={320}
                height={72}
                rx={36}
                fill="#0F172A"
                fillOpacity={0.7}
                stroke="#38BDF8"
                strokeOpacity={0.25}
                strokeWidth={2}
              />
              <SvgText x={830} y={1046} fontSize={24} fontWeight="700" fill="#38BDF8" textAnchor="middle">
                {"✦ Daily Milestone"}
              </SvgText>
            </G>
          ) : (
            <G>
              <Rect
                x={90}
                y={1000}
                width={900}
                height={72}
                rx={36}
                fill="#0F172A"
                fillOpacity={0.75}
                stroke="#38BDF8"
                strokeOpacity={0.25}
                strokeWidth={2}
              />
              <SvgText x={W / 2} y={1046} fontSize={26} fontWeight="700" fill="#38BDF8" textAnchor="middle">
                {"✦ Reovita Community Check-in"}
              </SvgText>
            </G>
          )}
        </>
      ) : (
        /* Text-Only Post: Editorial Magazine Style */
        <G>
          {/* Main Frosted Quote Container */}
          <Rect
            x={90}
            y={180}
            width={900}
            height={780}
            rx={48}
            fill="#0B132B"
            fillOpacity={0.8}
            stroke="#38BDF8"
            strokeOpacity={0.25}
            strokeWidth={2}
          />

          {/* Giant Stylized Opening Quote Mark */}
          <SvgText x={150} y={300} fontSize={110} fontWeight="900" fill="#38BDF8" fillOpacity={0.4}>
            {"“"}
          </SvgText>

          {/* Centered Editorial Text Lines */}
          {lines.map((line, i) => (
            <SvgText
              key={i}
              x={W / 2}
              y={380 + i * 68}
              fontSize={46}
              fontWeight="700"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              {line}
            </SvgText>
          ))}

          {/* Achievement Row */}
          {post.stamp ? (
            <G>
              <Rect
                x={W / 2 - 270}
                y={840}
                width={540}
                height={72}
                rx={36}
                fill="#1E1B4B"
                fillOpacity={0.75}
                stroke="#818CF8"
                strokeOpacity={0.4}
                strokeWidth={2}
              />
              <Path
                d={FLAME}
                transform={`translate(${W / 2 - 245} 845) scale(0.15) translate(-400 -300)`}
                fill="url(#flameGradOuter)"
              />
              <SvgText x={W / 2 - 170} y={886} fontSize={28} fontWeight="800" fill="#FFFFFF">
                {post.stamp.streak}-day streak · {topicLabel(post.stamp.habit) ?? 'Habit'}
              </SvgText>
            </G>
          ) : topic ? (
            <G>
              <Rect
                x={W / 2 - Math.max(180, topic.length * 24 + 60) / 2}
                y={840}
                width={Math.max(180, topic.length * 24 + 60)}
                height={70}
                rx={35}
                fill="#0F172A"
                fillOpacity={0.75}
                stroke="#38BDF8"
                strokeOpacity={0.3}
                strokeWidth={2}
              />
              <SvgText x={W / 2} y={885} fontSize={28} fontWeight="800" fill="#38BDF8" textAnchor="middle">
                #{topic}
              </SvgText>
            </G>
          ) : null}
        </G>
      )}

      {/* Brand Footer Capsule: 🌿 Reovita */}
      <Rect
        x={W / 2 - 120}
        y={1100}
        width={240}
        height={54}
        rx={27}
        fill="#0A1628"
        fillOpacity={0.8}
        stroke="#38BDF8"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      {/* Leaf Vector Glyph */}
      <Path
        d="M 458 1127 C 453 1117 466 1113 476 1115 C 480 1125 470 1133 458 1127 Z"
        fill="#38BDF8"
      />
      <Path d="M 458 1127 Q 468 1121 476 1115" stroke="#0A1628" strokeWidth={1.5} />
      <SvgText x={490} y={1135} fontSize={26} fontWeight="700" fill="#FFFFFF">
        Reovita
      </SvgText>
    </G>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// My last 7 days: visual circular progress gauge, status dots for each day, top habit and current streak.
function RecapCardArt({ handle, recap }: { handle: string; recap: SocialRecap }) {
  const cleanHandle = handle.replace(/^@/, '');
  const pillW = Math.max(260, Math.min(420, cleanHandle.length * 24 + 130));
  const top = topicLabel(recap.top_habit);

  const r = 185;
  const circumference = 2 * Math.PI * r;
  const activeDays = Math.min(7, Math.max(0, recap.active_days));
  // Small 40px gap at top for the flame apex
  const gap = 40;
  const usableCircumference = circumference - gap;
  const strokeLength = activeDays > 0 ? (activeDays / 7) * usableCircumference : 0;

  return (
    <G>
      {/* Background Atmosphere: Emerald & Mint Ambient Bottom Waves */}
      <Path
        d="M0 680 C280 640 450 790 720 750 C880 725 980 650 1080 610"
        fill="none"
        stroke="#10B981"
        strokeOpacity={0.12}
        strokeWidth={2.5}
      />
      <Path
        d="M0 1140 C280 1160 480 1280 720 1270 C880 1260 980 1200 1080 1160 L1080 1350 L0 1350 Z"
        fill="url(#recapWaveGrad1)"
      />
      <Path
        d="M0 1220 C220 1245 420 1315 650 1310 C820 1305 960 1250 1080 1210 L1080 1350 L0 1350 Z"
        fill="url(#recapWaveGrad2)"
      />

      {/* Botanical Corner Leaves */}
      {/* Top Left Leaves */}
      <G transform="translate(40 60)">
        <Path
          d="M0 40 C20 10 60 15 80 50 C60 70 20 65 0 40 Z"
          fill="url(#leafGrad)"
          fillOpacity={0.65}
        />
        <Path d="M0 40 Q45 35 80 50" stroke="#10B981" strokeWidth={1.5} strokeOpacity={0.7} />
        <Path
          d="M10 80 C35 70 65 85 75 115 C55 125 25 110 10 80 Z"
          fill="url(#leafGrad)"
          fillOpacity={0.5}
        />
        <Path d="M10 80 Q45 92 75 115" stroke="#10B981" strokeWidth={1.2} strokeOpacity={0.6} />
      </G>

      {/* Top Right Leaves */}
      <G transform="translate(1040 60) scale(-1 1)">
        <Path
          d="M0 40 C20 10 60 15 80 50 C60 70 20 65 0 40 Z"
          fill="url(#leafGrad)"
          fillOpacity={0.65}
        />
        <Path d="M0 40 Q45 35 80 50" stroke="#10B981" strokeWidth={1.5} strokeOpacity={0.7} />
        <Path
          d="M10 80 C35 70 65 85 75 115 C55 125 25 110 10 80 Z"
          fill="url(#leafGrad)"
          fillOpacity={0.5}
        />
        <Path d="M10 80 Q45 92 75 115" stroke="#10B981" strokeWidth={1.2} strokeOpacity={0.6} />
      </G>

      {/* Top Center User Pill with Flanking Lines */}
      <Line
        x1={W / 2 - pillW / 2 - 130}
        y1={106}
        x2={W / 2 - pillW / 2 - 25}
        y2={106}
        stroke="#10B981"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      <Rect
        x={W / 2 - pillW / 2}
        y={75}
        width={pillW}
        height={62}
        rx={31}
        fill="#042013"
        fillOpacity={0.7}
        stroke="#10B981"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      {/* User Avatar Circle inside Pill */}
      <Circle
        cx={W / 2 - pillW / 2 + 36}
        cy={106}
        r={17}
        fill="#10B981"
        fillOpacity={0.15}
        stroke="#34D399"
        strokeOpacity={0.6}
        strokeWidth={1.5}
      />
      <Circle cx={W / 2 - pillW / 2 + 36} cy={101} r={5} fill="#A7F3D0" />
      <Path
        d={`M ${W / 2 - pillW / 2 + 27} 117 C ${W / 2 - pillW / 2 + 27} 110, ${W / 2 - pillW / 2 + 45} 110, ${W / 2 - pillW / 2 + 45} 117`}
        fill="#A7F3D0"
      />
      <SvgText x={W / 2 - pillW / 2 + 64} y={116} fontSize={28} fontWeight="700" fill="#FFFFFF">
        {cleanHandle}
      </SvgText>
      <Line
        x1={W / 2 + pillW / 2 + 25}
        y1={106}
        x2={W / 2 + pillW / 2 + 130}
        y2={106}
        stroke="#10B981"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />

      {/* Heading: WEEKLY RECAP */}
      <SvgText x={W / 2} y={195} textAnchor="middle">
        <TSpan fontSize={56} fontWeight="900" fill="#FFFFFF" letterSpacing={3}>WEEKLY </TSpan>
        <TSpan fontSize={56} fontWeight="900" fill="#4ADE80" letterSpacing={3}>RECAP</TSpan>
      </SvgText>

      {/* Subtitle: STAY CONSISTENT with Flanking Lines */}
      <Line x1={290} y1={242} x2={370} y2={242} stroke="#10B981" strokeOpacity={0.3} strokeWidth={1.5} />
      <SvgText x={W / 2} y={248} fontSize={22} fontWeight="800" fill="#86EFAC" letterSpacing={4} textAnchor="middle">
        STAY CONSISTENT
      </SvgText>
      <Line x1={710} y1={242} x2={790} y2={242} stroke="#10B981" strokeOpacity={0.3} strokeWidth={1.5} />

      {/* Hero Circular Progress Gauge */}
      {/* Background Track Aura */}
      <Circle cx={540} cy={445} r={r} fill="none" stroke="#10B981" strokeOpacity={0.12} strokeWidth={32} />
      {/* Dark Track Circle */}
      <Circle cx={540} cy={445} r={r} fill="none" stroke="#052718" strokeWidth={18} />
      {/* Active Glowing Progress Arc */}
      {strokeLength > 0 ? (
        <Circle
          cx={540}
          cy={445}
          r={r}
          fill="none"
          stroke="url(#recapArcGrad)"
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={`${strokeLength} ${circumference}`}
          transform="rotate(-80 540 445)"
        />
      ) : null}

      {/* Flame Icon at Top Apex of Gauge */}
      <G transform="translate(540 252) scale(0.12) translate(-540 -400)">
        <Path d={FLAME} fill="url(#flameGradOuter)" />
        <Path d={FLAME} transform="scale(0.7) translate(160 160)" fill="url(#flameGradCore)" />
      </G>

      {/* 3D Extruded Active Days Score (e.g. 2 / 7) */}
      <SvgText x={544} y={484} textAnchor="middle">
        <TSpan fontSize={200} fontWeight="900" fill="#02140A" letterSpacing={-2}>{recap.active_days}</TSpan>
        <TSpan fontSize={100} fontWeight="900" fill="#042F19">/7</TSpan>
      </SvgText>
      <SvgText x={540} y={480} textAnchor="middle">
        <TSpan fontSize={200} fontWeight="900" fill="#FFFFFF" letterSpacing={-2}>{recap.active_days}</TSpan>
        <TSpan fontSize={100} fontWeight="900" fill="#4ADE80">/7</TSpan>
      </SvgText>

      {/* "Days Checked In" Capsule Pill below the number */}
      <Rect
        x={540 - 160}
        y={535}
        width={320}
        height={54}
        rx={27}
        fill="#042013"
        fillOpacity={0.75}
        stroke="#10B981"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      {/* Calendar Glyph */}
      <Rect x={402} y={551} width={22} height={20} rx={4} fill="none" stroke="#86EFAC" strokeWidth={1.8} />
      <Path d="M408 548 L408 552 M418 548 L418 552" stroke="#86EFAC" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M402 557 L424 557" stroke="#86EFAC" strokeWidth={1.5} />
      <SvgText x={434} y={568} fontSize={22} fontWeight="700" fill="#E2E8F0">
        Days Checked In
      </SvgText>

      {/* 7-Day Status Circles (Week Track) */}
      {recap.days.map((d, i) => {
        const cx = 180 + i * 120;
        const cy = 690;
        const weekday = WEEKDAYS[new Date(`${d.day}T00:00:00Z`).getUTCDay()];
        return (
          <G key={d.day}>
            {d.checked_in ? (
              <>
                <Circle cx={cx} cy={cy} r={40} fill="#10B981" fillOpacity={0.25} />
                <Circle cx={cx} cy={cy} r={32} fill="#10B981" stroke="#34D399" strokeWidth={2.5} />
                <Path
                  d={`M${cx - 9} ${cy} L${cx - 3} ${cy + 7} L${cx + 10} ${cy - 6}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              <>
                <Circle cx={cx} cy={cy} r={32} fill="#051C11" fillOpacity={0.7} stroke="#10B981" strokeOpacity={0.25} strokeWidth={1.8} />
                <Path
                  d={`M${cx - 8} ${cy} L${cx - 2} ${cy + 6} L${cx + 9} ${cy - 5}`}
                  fill="none"
                  stroke="#10B981"
                  strokeOpacity={0.35}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
            <SvgText
              x={cx}
              y={752}
              fontSize={24}
              fontWeight={d.checked_in ? '800' : '600'}
              fill={d.checked_in ? '#FFFFFF' : '#86EFAC'}
              fillOpacity={d.checked_in ? 1 : 0.5}
              textAnchor="middle"
            >
              {weekday}
            </SvgText>
          </G>
        );
      })}

      {/* Frosted Double Capsule: Top Focus & Streak */}
      <Rect
        x={100}
        y={815}
        width={880}
        height={155}
        rx={46}
        fill="#052417"
        fillOpacity={0.78}
        stroke="#10B981"
        strokeOpacity={0.22}
        strokeWidth={2}
      />

      {/* Left Section: Top Focus with Star Badge */}
      <Circle cx={185} cy={892} r={36} fill="#064E3B" fillOpacity={0.55} stroke="#10B981" strokeOpacity={0.4} strokeWidth={2} />
      {/* Golden Star Icon */}
      <Path
        d="M185 877 L189 887 L200 888 L191 896 L194 907 L185 901 L176 907 L179 896 L170 888 L181 887 Z"
        fill="#FACC15"
      />
      <SvgText x={245} y={880} fontSize={24} fontWeight="600" fill="#86EFAC">
        Top Focus
      </SvgText>
      <SvgText x={245} y={920} fontSize={34} fontWeight="800" fill="#FFFFFF">
        {top ? top : 'Daily steps'}
      </SvgText>

      {/* Center Divider Line */}
      <Line x1={W / 2} y1={840} x2={W / 2} y2={945} stroke="#10B981" strokeOpacity={0.2} strokeWidth={2} />

      {/* Right Section: Running Shoe & Streak */}
      <G transform="translate(580 872) scale(1.05)">
        <Path
          d="M5 26 C12 26 18 26 33 26 C43 26 46 22 43 18 C40 14 34 10 27 7 C22 4 18 9 14 15 L6 17 C2 17 1 20 1 23 C1 25 2 26 5 26 Z"
          fill="none"
          stroke="#4ADE80"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M14 15 L23 26 M19 11 L28 22" stroke="#4ADE80" strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M2 26 L44 26" stroke="#86EFAC" strokeWidth={3} strokeLinecap="round" />
      </G>
      <SvgText x={655} y={880} fontSize={32} fontWeight="800" fill="#FFFFFF">
        {recap.streak}-day streak
      </SvgText>
      <SvgText x={655} y={920} fontSize={24} fontWeight="600" fill="#86EFAC">
        {"Keep going! 🚀"}
      </SvgText>

      {/* Brand Footer Capsule: 🌿 Reovita */}
      <Rect
        x={W / 2 - 120}
        y={1015}
        width={240}
        height={54}
        rx={27}
        fill="#041F14"
        fillOpacity={0.75}
        stroke="#10B981"
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      {/* Leaf Vector Glyph */}
      <Path
        d="M 458 1042 C 453 1032 466 1028 476 1030 C 480 1040 470 1048 458 1042 Z"
        fill="#4ADE80"
      />
      <Path d="M 458 1042 Q 468 1036 476 1030" stroke="#042013" strokeWidth={1.5} />
      <SvgText x={490} y={1050} fontSize={26} fontWeight="700" fill="#FFFFFF">
        Reovita
      </SvgText>
    </G>
  );
}

function StreakCardArt({ handle, streak, best, total }: { handle: string; streak: number; best: number; total: number }) {
  const cleanHandle = handle.replace(/^@/, '');
  const pillW = Math.max(260, Math.min(420, cleanHandle.length * 24 + 130));

  return (
    <G>
      {/* Background Atmosphere: Crimson & Orange Ambient Bottom Waves */}
      <Path
        d="M0 1120 C240 1150 420 1260 620 1280 C800 1300 950 1260 1080 1210 L1080 1350 L0 1350 Z"
        fill="url(#waveGrad1)"
      />
      <Path
        d="M0 1210 C200 1240 370 1300 550 1315 C750 1330 920 1270 1080 1220 L1080 1350 L0 1350 Z"
        fill="url(#waveGrad2)"
      />
      <Path
        d="M680 1350 C800 1260 920 1190 1080 1170 L1080 1350 Z"
        fill="url(#waveGrad1)"
        fillOpacity={0.8}
      />

      {/* Top Center User Pill */}
      <Rect
        x={W / 2 - pillW / 2}
        y={75}
        width={pillW}
        height={62}
        rx={31}
        fill="#FFFFFF"
        fillOpacity={0.08}
        stroke="#FFFFFF"
        strokeOpacity={0.16}
        strokeWidth={1.5}
      />
      {/* User Avatar Circle & Glyph inside Pill */}
      <Circle
        cx={W / 2 - pillW / 2 + 36}
        cy={106}
        r={17}
        fill="#FFFFFF"
        fillOpacity={0.12}
        stroke="#FFFFFF"
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
      <Circle cx={W / 2 - pillW / 2 + 36} cy={101} r={5} fill="#FFFFFF" fillOpacity={0.9} />
      <Path
        d={`M ${W / 2 - pillW / 2 + 27} 117 C ${W / 2 - pillW / 2 + 27} 110, ${W / 2 - pillW / 2 + 45} 110, ${W / 2 - pillW / 2 + 45} 117`}
        fill="#FFFFFF"
        fillOpacity={0.9}
      />
      <SvgText x={W / 2 - pillW / 2 + 64} y={116} fontSize={28} fontWeight="700" fill="#FFFFFF">
        {cleanHandle}
      </SvgText>

      {/* Orbiting Golden Ring - Back Arc */}
      <G transform="rotate(-18 540 450)">
        <Ellipse cx={540} cy={450} rx={335} ry={105} fill="none" stroke="url(#orbitGrad1)" strokeWidth={4} />
        <Ellipse
          cx={540}
          cy={455}
          rx={315}
          ry={92}
          fill="none"
          stroke="url(#orbitGrad2)"
          strokeWidth={2.5}
          strokeDasharray="25 15 50 20 80 25"
        />
      </G>

      {/* Hero 3D Fireball: Sculpted Multi-layer Flame */}
      {/* Outer Flame Silhouette */}
      <Path
        d="M 540 650 C 410 650 320 560 320 450 C 320 380 355 330 380 280 C 390 260 405 270 415 300 C 430 345 450 375 470 375 C 460 320 475 250 540 165 C 555 235 575 300 635 335 C 625 290 645 250 695 240 C 725 240 745 270 755 315 C 775 380 780 450 750 525 C 710 615 635 650 540 650 Z"
        fill="url(#flameGradOuter)"
      />
      {/* Inner Flame Radiant Layer */}
      <Path
        d="M 540 630 C 435 630 355 545 355 460 C 355 405 380 365 405 320 C 415 335 430 365 455 380 C 470 335 485 275 540 205 C 555 265 575 320 620 350 C 615 315 635 280 675 275 C 695 305 725 375 710 450 C 685 530 625 630 540 630 Z"
        fill="url(#flameGradInner)"
      />
      {/* Flame Core Highlight */}
      <Path
        d="M 540 600 C 465 600 405 530 405 465 C 405 425 425 380 450 345 C 460 365 475 390 495 400 C 505 355 520 295 545 250 C 555 295 570 345 600 370 C 610 410 625 460 610 510 C 585 570 560 600 540 600 Z"
        fill="url(#flameGradCore)"
        fillOpacity={0.92}
      />

      {/* Orbiting Ring Highlights & Sparkling Embers */}
      <Circle cx={275} cy={475} r={8} fill="#FEF08A" />
      <Circle cx={275} cy={475} r={4} fill="#FFFFFF" />
      <Circle cx={795} cy={410} r={7} fill="#FDE047" />
      <Circle cx={795} cy={410} r={3.5} fill="#FFFFFF" />
      <Circle cx={335} cy={275} r={5} fill="#FBBF24" />
      <Circle cx={335} cy={275} r={2} fill="#FFFFFF" />
      <Circle cx={720} cy={220} r={6} fill="#FDE047" />
      <Circle cx={720} cy={220} r={2.5} fill="#FFFFFF" />
      <Circle cx={255} cy={355} r={4} fill="#F59E0B" />
      <Circle cx={770} cy={490} r={5} fill="#F59E0B" />
      <Circle cx={585} cy={145} r={4} fill="#FEF08A" />
      <Circle cx={490} cy={230} r={3} fill="#FFFFFF" />

      {/* 3D Streak Number in Center of Flame */}
      {/* Depth Shadow 1 */}
      <SvgText x={W / 2 + 8} y={558} fontSize={270} fontWeight="900" fill="#1C050D" fillOpacity={0.7} textAnchor="middle">
        {streak}
      </SvgText>
      {/* Depth Shadow 2 */}
      <SvgText x={W / 2 + 5} y={555} fontSize={270} fontWeight="900" fill="#881337" textAnchor="middle">
        {streak}
      </SvgText>
      {/* Bevel Highlight Layer */}
      <SvgText x={W / 2 + 2} y={552} fontSize={270} fontWeight="900" fill="#BE123C" textAnchor="middle">
        {streak}
      </SvgText>
      {/* Crisp White 3D Face */}
      <SvgText x={W / 2} y={550} fontSize={270} fontWeight="900" fill="#FFFFFF" textAnchor="middle">
        {streak}
      </SvgText>

      {/* DAY STREAK Title */}
      <SvgText x={W / 2} y={720} textAnchor="middle">
        <TSpan fontSize={66} fontWeight="900" fill="#FFFFFF" letterSpacing={4}>DAY </TSpan>
        <TSpan fontSize={66} fontWeight="900" fill="#FBBF24" letterSpacing={4}>STREAK</TSpan>
      </SvgText>

      {/* Motivation Subtitle with Flanking Divider Lines */}
      <Line x1={130} y1={782} x2={270} y2={782} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} strokeLinecap="round" />
      <SvgText x={W / 2} y={792} fontSize={30} fontWeight="600" fill="#F1F5F9" textAnchor="middle">
        {"Keep going! You're on fire 🔥"}
      </SvgText>
      <Line x1={810} y1={782} x2={950} y2={782} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} strokeLinecap="round" />

      {/* Frosted Dual-Stat Capsule */}
      <Rect
        x={100}
        y={845}
        width={880}
        height={155}
        rx={48}
        fill="#140A22"
        fillOpacity={0.72}
        stroke="#FFFFFF"
        strokeOpacity={0.14}
        strokeWidth={2}
      />

      {/* Left Stat: Personal Best */}
      <Rect
        x={145}
        y={885}
        width={76}
        height={76}
        rx={22}
        fill="#8B5CF6"
        fillOpacity={0.2}
        stroke="#A78BFA"
        strokeOpacity={0.4}
        strokeWidth={2}
      />
      {/* Calendar Icon Vector */}
      <Rect x={163} y={904} width={40} height={38} rx={8} fill="none" stroke="#C4B5FD" strokeWidth={2.5} />
      <Path d="M172 899 L172 906 M194 899 L194 906" stroke="#C4B5FD" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M163 916 L203 916" stroke="#C4B5FD" strokeWidth={2} />
      <Circle cx={173} cy={926} r={2} fill="#C4B5FD" />
      <Circle cx={183} cy={926} r={2} fill="#C4B5FD" />
      <Circle cx={193} cy={926} r={2} fill="#C4B5FD" />
      <Circle cx={173} cy={934} r={2} fill="#C4B5FD" />
      <Circle cx={183} cy={934} r={2} fill="#C4B5FD" />
      <Circle cx={193} cy={934} r={2} fill="#C4B5FD" />

      <SvgText x={244} y={918} fontSize={24} fontWeight="600" fill="#A1A1AA">
        Personal Best
      </SvgText>
      <SvgText x={244} y={958} fontSize={38} fontWeight="800" fill="#FFFFFF">
        {best} days
      </SvgText>

      {/* Middle Vertical Divider Line */}
      <Line x1={W / 2} y1={870} x2={W / 2} y2={975} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={2} />

      {/* Right Stat: Check-ins */}
      <Circle
        cx={625}
        cy={923}
        r={38}
        fill="#10B981"
        fillOpacity={0.2}
        stroke="#34D399"
        strokeOpacity={0.45}
        strokeWidth={2}
      />
      {/* Checkmark Vector */}
      <Path
        d="M612 923 L621 932 L638 915"
        fill="none"
        stroke="#34D399"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText x={680} y={918} fontSize={24} fontWeight="600" fill="#A1A1AA">
        Check-ins
      </SvgText>
      <SvgText x={680} y={958} fontSize={38} fontWeight="800" fill="#FFFFFF">
        {total} total
      </SvgText>

      {/* Inner Action Capsule: View Details > */}
      <Rect
        x={W / 2 - 240}
        y={1035}
        width={480}
        height={74}
        rx={37}
        fill="#0B0516"
        fillOpacity={0.65}
        stroke="url(#btnBorderGrad)"
        strokeWidth={2.5}
      />
      {/* Upload/Share Glyph */}
      <Path
        d="M424 1072 L424 1084 L446 1084 L446 1072"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M435 1078 L435 1063 M429 1069 L435 1063 L441 1069"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText x={W / 2 + 16} y={1082} fontSize={30} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
        View Details  ›
      </SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800' },
  preview: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: '#059669',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
