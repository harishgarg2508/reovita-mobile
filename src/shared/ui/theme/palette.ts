import { useMemo } from 'react';

import { accentColors } from './accents';
import { useAccentId, useResolvedScheme, type ResolvedScheme } from './theme-context';

// One palette per theme. Screens read the colours from here, so one toggle changes the whole app.
//
// The colour roles of a health app:
//   accent     trust blue: brand actions, headers, links, the active tab
//   teal       the dashboard and diagnostics colour, between the clinical blue and the healthy green
//   good       healthy: a value in range, a goal done, a normal result. Never the brand colour.
//   lime       the warm call-to-action and highlight colour (coral and peach). The key keeps its old name so no screen has to change.
//   red, warn  abnormal values, critical alerts and caution only. Never decoration.
//   bg, card   warm cream and off-white, softer than pure white for long reading.
export const PALETTES = {
  light: {
    bg: '#FBF8F3',
    surface: '#F4EFE7',
    card: '#FFFDF9',
    border: '#E8E1D6',
    text: '#1A2433',
    textStrong: '#0F1B2D',
    muted: '#5F6B7C',
    accent: '#1B5E9E',
    accentSoft: '#E3EEF8',
    teal: '#177F86',
    tealSoft: '#DDF1F2',
    good: '#2E8B57',
    goodSoft: '#E1F3E8',
    lime: '#F2745B',
    limeSoft: '#FFE6DA',
    red: '#D6334A',
    redSoft: '#FDEBEE',
    warn: '#B26A00',
    warnSoft: '#FFF1D6',
    input: '#FFFFFF',
  },
  dark: {
    bg: '#0A1220',
    surface: '#101A2C',
    card: '#142038',
    border: '#233252',
    text: '#F3F6FB',
    textStrong: '#FFFFFF',
    muted: '#9DAAC0',
    accent: '#6DB3F2',
    accentSoft: '#17304F',
    teal: '#4CC9CF',
    tealSoft: '#123A40',
    good: '#6FD08C',
    goodSoft: '#173626',
    lime: '#FFA283',
    limeSoft: '#3A2219',
    red: '#FF6B7D',
    redSoft: '#34161E',
    warn: '#F5C26B',
    warnSoft: '#3A2C10',
    input: '#1A2640',
  },
} as const;

// Every colour is a plain string, so the person's chosen theme can replace the accent ones.
export type Palette = { [K in keyof (typeof PALETTES)['light']]: string };

// The palette for the theme the user chose (or the system setting), with the colour theme they picked in their profile.
export function usePalette(): Palette {
  const scheme = useResolvedScheme();
  const accent = useAccentId();
  return useMemo(() => {
    const { accent: a, accentSoft } = accentColors(accent, scheme);
    return { ...PALETTES[scheme], accent: a, accentSoft };
  }, [scheme, accent]);
}
