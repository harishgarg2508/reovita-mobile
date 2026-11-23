import { useMemo } from 'react';

import { useResolvedScheme } from '@shared/ui/theme';

import type { Tone } from '../model/reading-labels';

export interface ToneColorSet {
  bg: string;
  text: string;
  dot: string;
}

export interface BriefingColors {
  dark: boolean;
  page: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  chevron: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  careCard: {
    bg: string;
    border: string;
    iconBg: string;
    icon: string;
    title: string;
    body: string;
  };
  tones: Record<Tone, ToneColorSet>;
  tone: Record<Tone, string>;
  toneText: Record<Tone, string>;
}

const LIGHT_TONE_SETS: Record<Tone, ToneColorSet> = {
  cool: { bg: '#EAF2FA', text: '#256DB3', dot: '#3B82F6' },
  good: { bg: '#E7F5E8', text: '#1F7A3E', dot: '#2E9E5B' },
  watch: { bg: '#FEF3DC', text: '#9A6A00', dot: '#E0A526' },
  high: { bg: '#FFF1E8', text: '#C25A12', dot: '#E8742B' },
  severe: { bg: '#FDECEE', text: '#D6334A', dot: '#D6334A' },
};

const DARK_TONE_SETS: Record<Tone, ToneColorSet> = {
  cool: { bg: '#14293D', text: '#7DB4F0', dot: '#60A5FA' },
  good: { bg: '#173423', text: '#6DB3F2', dot: '#48BB78' },
  watch: { bg: '#3A2E14', text: '#F6C768', dot: '#F6C768' },
  high: { bg: '#382015', text: '#FF9D66', dot: '#FF8A48' },
  severe: { bg: '#3B171D', text: '#FF7A8E', dot: '#FF6B81' },
};

const LIGHT_TONE: Record<Tone, string> = { cool: '#4A90D9', good: '#2E9E5B', watch: '#E0A526', high: '#E8742B', severe: '#D6334A' };
const LIGHT_TONE_TEXT: Record<Tone, string> = { cool: '#256DB3', good: '#1F7A3E', watch: '#9A6A00', high: '#C25A12', severe: '#D6334A' };
const DARK_TONE_TEXT: Record<Tone, string> = { cool: '#7DB4F0', good: '#6DB3F2', watch: '#F6C768', high: '#FF9D66', severe: '#FF7A8E' };

export function useBriefingColors(): BriefingColors {
  const dark = useResolvedScheme() === 'dark';
  return useMemo(
    () => ({
      dark,
      page: dark ? '#0D1510' : '#EEF5EB',
      card: dark ? '#15241C' : '#FFFFFF',
      border: dark ? '#22382C' : '#E2ECE0',
      text: dark ? '#F0FDF4' : '#1A2C24',
      muted: dark ? '#8EA59A' : '#687D73',
      chevron: dark ? '#4E6B5C' : '#B2C4BA',
      accent: dark ? '#6DB3F2' : '#2E7D52',
      accentSoft: dark ? '#1C3426' : '#EAF5E8',
      onAccent: '#FFFFFF',
      careCard: {
        bg: dark ? '#16271F' : '#EBF4E7',
        border: dark ? '#243D2F' : '#DBEBD5',
        iconBg: dark ? '#1F3427' : '#FFFFFF',
        icon: dark ? '#6DB3F2' : '#285C43',
        title: dark ? '#F0FDF4' : '#1A2C24',
        body: dark ? '#A7C2B4' : '#4F655B',
      },
      tones: dark ? DARK_TONE_SETS : LIGHT_TONE_SETS,
      tone: LIGHT_TONE,
      toneText: dark ? DARK_TONE_TEXT : LIGHT_TONE_TEXT,
    }),
    [dark],
  );
}
