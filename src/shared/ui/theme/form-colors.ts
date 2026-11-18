import { useMemo } from 'react';

import { useResolvedScheme, type ResolvedScheme } from './theme-context';

// Colours for forms and onboarding screens, one set per theme. Screens read them through useFormColors, so the
// onboarding steps follow the app's light/dark choice. Names say what the colour is for, not what it looks like.
const LIGHT = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  surfaceAlt: '#EEF2FC',
  border: '#E1E7F5',
  border2: '#D2DAF0',
  text: '#1B2440',
  textStrong: '#0B1B3F',
  muted: '#5F6B85',
  placeholder: '#8D97B3',
  accent: '#2447B5',
  accentFill: '#2447B5',
  accentSoft: '#E8EEFC',
  onAccent: '#FFFFFF',
  onSoft: '#16307F',
  error: '#C22F43',
  warnBg: '#FFF1D6',
  warnText: '#8A5A00',
  disabledIcon: '#C3CBE0',
  warnBorder: '#F3D9A4',
  errorBorder: '#F9CBD2',
};

const DARK: typeof LIGHT = {
  bg: '#0A0F1F',
  card: '#121A36',
  surfaceAlt: '#18213F',
  border: '#25305A',
  border2: '#34427A',
  text: '#EEF2FF',
  textStrong: '#FFFFFF',
  muted: '#A3AFD0',
  placeholder: '#8591B5',
  accent: '#8AA9FF',
  accentFill: '#3555C8',
  accentSoft: '#1B2748',
  onAccent: '#FFFFFF',
  onSoft: '#CBD8FF',
  error: '#FF6B7D',
  warnBg: '#3A2C10',
  warnText: '#F5C26B',
  disabledIcon: '#3B4670',
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
