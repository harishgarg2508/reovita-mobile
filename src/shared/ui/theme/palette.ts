import { useResolvedScheme, type ResolvedScheme } from './theme-context';

// One palette per theme. Screens read the colours from here, so one toggle changes the whole app.
export const PALETTES = {
  light: {
    bg: '#FFFFFF',
    surface: '#F7F6FD',
    card: '#FFFFFF',
    border: '#ECEAF5',
    text: '#171717',
    textStrong: '#14121C',
    muted: '#6E6A82',
    accent: '#7545ED',
    accentSoft: '#F1EDFC',
    lime: '#B8F000',
    red: '#E34255',
    redSoft: '#FDEEF0',
    input: '#FFFFFF',
  },
  dark: {
    bg: '#0B0A12',
    surface: '#120F1F',
    card: '#16142A',
    border: '#2B2846',
    text: '#FFFFFF',
    textStrong: '#FFFFFF',
    muted: '#A9A3C8',
    accent: '#A78BFA',
    accentSoft: '#22203A',
    lime: '#D4FF3F',
    red: '#E34255',
    redSoft: '#2E1624',
    input: '#1C1A2E',
  },
} as const;

export type Palette = (typeof PALETTES)[ResolvedScheme];

// The palette for the theme the user chose (or the system setting).
export function usePalette(): Palette {
  return PALETTES[useResolvedScheme()];
}
