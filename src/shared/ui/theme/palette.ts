import { useResolvedScheme, type ResolvedScheme } from './theme-context';

// One palette per theme. Screens read the colours from here, so one toggle changes the whole app.
// Royal blue is the main colour, pink is the soft highlight, green marks what is healthy, and white is the base.
export const PALETTES = {
  light: {
    bg: '#FFFFFF',
    surface: '#F5F8FF',
    card: '#FFFFFF',
    border: '#E2E8F7',
    text: '#14213D',
    textStrong: '#0B1B3F',
    muted: '#5F6B85',
    accent: '#2447B5',
    accentSoft: '#E8EEFC',
    lime: '#E8559A',
    red: '#E34255',
    redSoft: '#FDEEF0',
    input: '#FFFFFF',
  },
  dark: {
    bg: '#0A0F1F',
    surface: '#0F1630',
    card: '#121A36',
    border: '#25305A',
    text: '#FFFFFF',
    textStrong: '#FFFFFF',
    muted: '#A3AFD0',
    accent: '#8AA9FF',
    accentSoft: '#1B2748',
    lime: '#FF8CC0',
    red: '#E34255',
    redSoft: '#2E1624',
    input: '#18213F',
  },
} as const;

export type Palette = (typeof PALETTES)[ResolvedScheme];

// The palette for the theme the user chose (or the system setting).
export function usePalette(): Palette {
  return PALETTES[useResolvedScheme()];
}
