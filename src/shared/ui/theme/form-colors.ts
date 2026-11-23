import { useMemo } from 'react';

import { accentColors } from './accents';
import { useAccentId, useResolvedScheme, type ResolvedScheme } from './theme-context';

// Colours for forms and onboarding screens, one set per theme. Screens read them through useFormColors, so the
// onboarding steps follow the app's light/dark choice. Names say what the colour is for, not what it looks like.
const LIGHT = {
  bg: '#FBF8F3',
  card: '#FFFDF9',
  surfaceAlt: '#F1ECE3',
  border: '#E6DFD3',
  border2: '#D8D0C2',
  text: '#1A2433',
  textStrong: '#0F1B2D',
  muted: '#5F6B7C',
  placeholder: '#8D96A5',
  accent: '#1B5E9E',
  accentFill: '#1B5E9E',
  accentSoft: '#E3EEF8',
  onAccent: '#FFFFFF',
  onSoft: '#0F3A66',
  error: '#C22F43',
  warnBg: '#FFF1D6',
  warnText: '#8A5A00',
  disabledIcon: '#C4CBD6',
  warnBorder: '#F3D9A4',
  errorBorder: '#F9CBD2',
  good: '#2E8B57',
  goodSoft: '#E1F3E8',
  teal: '#177F86',
};

const DARK: typeof LIGHT = {
  bg: '#0A1220',
  card: '#142038',
  surfaceAlt: '#1B2A47',
  border: '#233252',
  border2: '#32456B',
  text: '#F3F6FB',
  textStrong: '#FFFFFF',
  muted: '#9DAAC0',
  placeholder: '#7F8DA8',
  accent: '#6DB3F2',
  accentFill: '#2B78C2',
  accentSoft: '#17304F',
  onAccent: '#FFFFFF',
  onSoft: '#CFE6FB',
  error: '#FF6B7D',
  warnBg: '#3A2C10',
  warnText: '#F5C26B',
  disabledIcon: '#44557A',
  warnBorder: '#5A4318',
  errorBorder: '#5A2430',
  good: '#6FD08C',
  goodSoft: '#173626',
  teal: '#4CC9CF',
};

export type FormColors = typeof LIGHT;

export const FORM_COLORS: Record<ResolvedScheme, FormColors> = { light: LIGHT, dark: DARK };

// The colours for the theme in use. The same object is returned until the theme changes.
export function useFormColors(): FormColors {
  const scheme = useResolvedScheme();
  const accent = useAccentId();
  return useMemo(() => ({ ...FORM_COLORS[scheme], ...accentColors(accent, scheme) }), [scheme, accent]);
}
