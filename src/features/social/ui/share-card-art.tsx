import { Platform } from 'react-native';
import { ClipPath, Defs, G, Image as SvgImage, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { topicLabel, type SocialPost, type SocialRecap } from '@entities/social';

// The pictures that people share. They are drawn at 1080 by 1350 (a 4:5 picture) and are the same on every phone and in both app themes, so their
// colours are fixed here and do not follow the app theme. One system for all three: warm paper, ink type, one colour per card, a rule between the
// parts, and the Reovita name at the foot. No real name, no health data and no link to the account is ever drawn.
export const CARD_W = 1080;
export const CARD_H = 1350;

const PAPER = '#FBF8F3';
const INK = '#0F1B2D';
const MUTED = '#5F6B7C';
const RULE = '#E1D9CB';
const MARGIN = 90;

const COLORS = {
  streak: { accent: '#E8643F', soft: '#FFE6DA' },
  recap: { accent: '#1F7A4D', soft: '#DDF1E5' },
  post: { accent: '#1B5E9E', soft: '#E3EEF8' },
} as const;

// Poppins is loaded in the app, so a phone draws it. A browser draws the picture without the page's fonts, so it falls back to a plain sans.
const WEB_FALLBACK = Platform.OS === 'web' ? ', Helvetica, Arial, sans-serif' : '';
const FONT = {
  regular: `Poppins_400Regular${WEB_FALLBACK}`,
  semi: `Poppins_600SemiBold${WEB_FALLBACK}`,
  bold: `Poppins_700Bold${WEB_FALLBACK}`,
};

// A flame, about 280 by 440 from 380,300.
const FLAME = 'M540 300 q-80 130 -10 250 q-80 -10 -100 -100 q-80 130 20 240 q100 110 220 30 q90 -80 40 -200 q-40 -80 -110 -140 q0 70 -34 120 q-48 -80 -36 -190z';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

// The paper, the handle at the top, and the name at the foot. The three cards share it.
function Chrome({ handle, accent, label }: { handle: string; accent: string; label: string }) {
  return (
    <G>
      <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill={PAPER} />
      <Rect x={0} y={0} width={CARD_W} height={18} fill={accent} />
      <SvgText x={MARGIN} y={140} fontSize={40} fontFamily={FONT.semi} fill={INK}>
        @{handle.replace(/^@/, '')}
      </SvgText>
      <SvgText x={CARD_W - MARGIN} y={140} fontSize={30} fontFamily={FONT.regular} fill={MUTED} textAnchor="end">
        {label}
      </SvgText>
      <Line x1={MARGIN} y1={1222} x2={CARD_W - MARGIN} y2={1222} stroke={RULE} strokeWidth={2} />
      <SvgText x={MARGIN} y={1292} fontSize={44} fontFamily={FONT.bold} fill={accent}>
        Reovita
      </SvgText>
      <SvgText x={CARD_W - MARGIN} y={1290} fontSize={28} fontFamily={FONT.regular} fill={MUTED} textAnchor="end">
        Your health, in one place.
      </SvgText>
    </G>
  );
}

// Two figures side by side under a rule: a muted label above and a bold value below.
function Figures({ top, left, right, accent }: { top: number; left: { label: string; value: string }; right: { label: string; value: string }; accent: string }) {
  const mid = CARD_W / 2 + 10;
  return (
    <G>
      <Line x1={MARGIN} y1={top} x2={CARD_W - MARGIN} y2={top} stroke={RULE} strokeWidth={2} />
      <Rect x={mid - 30} y={top + 36} width={2} height={110} fill={RULE} />
      <SvgText x={MARGIN} y={top + 80} fontSize={30} fontFamily={FONT.regular} fill={MUTED}>
        {left.label}
      </SvgText>
      <SvgText x={MARGIN} y={top + 142} fontSize={54} fontFamily={FONT.bold} fill={INK}>
        {left.value}
      </SvgText>
      <SvgText x={mid} y={top + 80} fontSize={30} fontFamily={FONT.regular} fill={MUTED}>
        {right.label}
      </SvgText>
      <SvgText x={mid} y={top + 142} fontSize={54} fontFamily={FONT.bold} fill={accent}>
        {right.value}
      </SvgText>
    </G>
  );
}

// The streak: the number is the picture, with one flame.
export function StreakCardArt({ handle, streak, best, total }: { handle: string; streak: number; best: number; total: number }) {
  const { accent } = COLORS.streak;
  const digits = String(streak).length;
  const size = digits <= 1 ? 540 : digits === 2 ? 460 : digits === 3 ? 350 : 270;
  return (
    <G>
      <Chrome handle={handle} accent={accent} label="Day streak" />
      <Path d={FLAME} transform="translate(742 236) scale(0.86) translate(-380 -300)" fill={accent} />
      <SvgText x={MARGIN - 10} y={800} fontSize={size} fontFamily={FONT.bold} fill={INK}>
        {streak}
      </SvgText>
      <SvgText x={MARGIN} y={914} fontSize={78} fontFamily={FONT.semi} fill={INK}>
        {streak === 1 ? 'day streak' : 'days streak'}
      </SvgText>
      <SvgText x={MARGIN} y={986} fontSize={40} fontFamily={FONT.regular} fill={MUTED}>
        Keep going.
      </SvgText>
      <Figures top={1040} left={{ label: 'Personal best', value: `${best} ${best === 1 ? 'day' : 'days'}` }} right={{ label: 'Check-ins', value: `${total} total` }} accent={accent} />
    </G>
  );
}

// The week: days checked in out of seven, and a bar for each day.
export function RecapCardArt({ handle, recap }: { handle: string; recap: SocialRecap }) {
  const { accent, soft } = COLORS.recap;
  const active = Math.min(7, Math.max(0, recap.active_days));
  const top = topicLabel(recap.top_habit);
  const barW = 100;
  const gap = (CARD_W - MARGIN * 2 - barW * 7) / 6;
  return (
    <G>
      <Chrome handle={handle} accent={accent} label="Weekly recap" />
      <SvgText x={MARGIN - 6} y={540} fontSize={380} fontFamily={FONT.bold} fill={INK}>
        {active}
      </SvgText>
      <SvgText x={MARGIN + 250} y={540} fontSize={140} fontFamily={FONT.semi} fill={accent}>
        /7
      </SvgText>
      <SvgText x={MARGIN} y={620} fontSize={42} fontFamily={FONT.regular} fill={MUTED}>
        days checked in this week
      </SvgText>
      {recap.days.slice(0, 7).map((d, index) => {
        const x = MARGIN + index * (barW + gap);
        const weekday = WEEKDAYS[new Date(`${d.day}T00:00:00Z`).getUTCDay()];
        return (
          <G key={d.day}>
            <Rect x={x} y={690} width={barW} height={190} rx={24} fill={d.checked_in ? accent : soft} />
            {d.checked_in ? (
              <Path d={`M${x + 30} ${785} L${x + 46} ${802} L${x + 74} ${768}`} fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            <SvgText x={x + barW / 2} y={934} fontSize={30} fontFamily={d.checked_in ? FONT.semi : FONT.regular} fill={d.checked_in ? INK : MUTED} textAnchor="middle">
              {weekday}
            </SvgText>
          </G>
        );
      })}
      <Figures top={1000} left={{ label: 'Top focus', value: top ?? '-' }} right={{ label: 'Streak', value: `${recap.streak}-day streak` }} accent={accent} />
    </G>
  );
}

// A post: the photo (or the words, large), the caption, and the streak stamp when there is one.
export function PostCardArt({ post, photo }: { post: SocialPost; photo: string | null }) {
  const { accent } = COLORS.post;
  const topic = topicLabel(post.topic);
  const hasPhoto = post.has_photo && !!photo;
  const lines = hasPhoto ? wrapText(post.body, 42, 3) : wrapText(post.body || 'Small consistent steps lead to lasting change.', 24, 7);
  const stampY = hasPhoto ? 1130 : 1130;

  return (
    <G>
      <Defs>
        <ClipPath id="cardPhotoClip">
          <Rect x={MARGIN} y={196} width={CARD_W - MARGIN * 2} height={640} rx={28} />
        </ClipPath>
      </Defs>
      <Chrome handle={post.handle} accent={accent} label={topic ? `#${topic}` : 'Post'} />
      {hasPhoto ? (
        <G>
          <Rect x={MARGIN} y={196} width={CARD_W - MARGIN * 2} height={640} rx={28} fill={COLORS.post.soft} />
          <SvgImage x={MARGIN} y={196} width={CARD_W - MARGIN * 2} height={640} href={{ uri: photo }} preserveAspectRatio="xMidYMid slice" clipPath="url(#cardPhotoClip)" />
          {post.photo_count > 1 ? (
            <G>
              <Rect x={CARD_W - MARGIN - 150} y={222} width={124} height={50} rx={25} fill="#0F1B2D" fillOpacity={0.62} />
              <SvgText x={CARD_W - MARGIN - 88} y={257} fontSize={26} fontFamily={FONT.semi} fill="#FFFFFF" textAnchor="middle">
                1 of {post.photo_count}
              </SvgText>
            </G>
          ) : null}
          {lines.map((line, index) => (
            <SvgText key={index} x={MARGIN} y={912 + index * 58} fontSize={42} fontFamily={FONT.regular} fill={INK}>
              {line}
            </SvgText>
          ))}
        </G>
      ) : (
        <G>
          <Rect x={MARGIN} y={250} width={110} height={12} rx={6} fill={accent} />
          {lines.map((line, index) => (
            <SvgText key={index} x={MARGIN} y={380 + index * 100} fontSize={76} fontFamily={FONT.semi} fill={INK}>
              {line}
            </SvgText>
          ))}
        </G>
      )}
      {post.stamp ? (
        <G>
          <Line x1={MARGIN} y1={stampY - 56} x2={CARD_W - MARGIN} y2={stampY - 56} stroke={RULE} strokeWidth={2} />
          <Path d={FLAME} transform={`translate(${MARGIN + 20} ${stampY - 30}) scale(0.1) translate(-400 -300)`} fill={COLORS.streak.accent} />
          <SvgText x={MARGIN + 66} y={stampY + 18} fontSize={38} fontFamily={FONT.bold} fill={INK}>
            {post.stamp.streak}-day streak
          </SvgText>
          <SvgText x={CARD_W - MARGIN} y={stampY + 18} fontSize={32} fontFamily={FONT.regular} fill={MUTED} textAnchor="end">
            {topicLabel(post.stamp.habit) ?? 'Habit'}
          </SvgText>
        </G>
      ) : null}
    </G>
  );
}
