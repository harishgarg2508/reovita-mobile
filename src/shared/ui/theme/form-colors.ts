import { useMemo } from 'react';

import { useResolvedScheme, type ResolvedScheme } from './theme-context';

// Colours for forms and onboarding screens, one set per theme. Screens read them through useFormColors, so the
// onboarding steps follow the app's light/dark choice. Names say what the colour is for, not what it looks like.
const LIGHT = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  surfaceAlt: '#F1EDF7',
  border: '#E5E0EC',
  border2: '#D9D4EA',
  text: '#242032',
  textStrong: '#1B152B',
  muted: '#655F74',
  placeholder: '#9185AA',
  accent: '#1F6F3F',
  accentFill: '#1F6F3F',
  accentSoft: '#E8F8CE',
  onAccent: '#FFFFFF',
  onSoft: '#2E4D00',
  error: '#C22F43',
  warnBg: '#FFF1D6',
  warnText: '#8A5A00',
  disabledIcon: '#C5BDD4',
  warnBorder: '#F3D9A4',
  errorBorder: '#F9CBD2',
};

const DARK: typeof LIGHT = {
  bg: '#0B0A12',
  card: '#16142A',
  surfaceAlt: '#1F1C36',
  border: '#2B2846',
  border2: '#3A3760',
  text: '#F2F0FA',
  textStrong: '#FFFFFF',
  muted: '#A9A3C8',
  placeholder: '#8C86AD',
  accent: '#6FD08C',
  accentFill: '#2E8B57',
  accentSoft: '#1F3A2A',
  onAccent: '#FFFFFF',
  onSoft: '#BFF5CF',
  error: '#FF6B7D',
  warnBg: '#3A2C10',
  warnText: '#F5C26B',
  disabledIcon: '#4A4668',
  warnBorder: '#5A4318',
  errorBorder: '#5A2430',
};

export type FormColors = typeof LIGHT;

export const FORM_COLORS: Record<ResolvedScheme, FormColors> = { light: LIGHT, dark: DARK };

// The colours for the theme in use. The same object is returned until the theme changes.
export function useFormColors(): FormColors {
  const scheme = useResolvedScheme();
  return useMemo(() => FORM_COLORS[scheme], [scheme]);
}
