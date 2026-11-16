import { useMemo } from 'react';

import { usePalette, useResolvedScheme } from '@shared/ui/theme';

import type { Tone } from '../model/reading-labels';

// Colours for the environmental briefing: a soft green page in light mode, the app's dark palette in dark mode.
export interface BriefingColors {
  dark: boolean;
  page: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  tone: Record<Tone, string>;
  toneText: Record<Tone, string>;
}

const LIGHT_TONE: Record<Tone, string> = { cool: '#4A90D9', good: '#2E9E5B', watch: '#E0A526', high: '#E8742B', severe: '#D6334A' };
const LIGHT_TONE_TEXT: Record<Tone, string> = { cool: '#2F6DB5', good: '#1F7A3E', watch: '#9A6A00', high: '#C25A12', severe: '#B42339' };
const DARK_TONE_TEXT: Record<Tone, string> = { cool: '#7DB4F0', good: '#6FD08C', watch: '#F5C26B', high: '#FF9A5A', severe: '#FF6B7D' };

export function useBriefingColors(): BriefingColors {
  const p = usePalette();
  const dark = useResolvedScheme() === 'dark';
  return useMemo(
    () => ({
      dark,
      page: dark ? p.bg : '#F1F8EC',
      card: dark ? p.card : '#FFFFFF',
      border: dark ? p.border : '#DCEBD2',
      text: p.textStrong,
      muted: p.muted,
      accent: p.accent,
      accentSoft: dark ? p.accentSoft : '#E3F2DA',
      onAccent: '#FFFFFF',
      tone: LIGHT_TONE,
      toneText: dark ? DARK_TONE_TEXT : LIGHT_TONE_TEXT,
    }),
    [p, dark],
  );
}
