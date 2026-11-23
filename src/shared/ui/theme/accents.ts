import type { ResolvedScheme } from './theme-context';

// The colour themes a person can choose in their profile. A theme changes the brand colour only: backgrounds, text, and the red and amber used for abnormal
// values stay as they are, so a health result always reads the same whatever theme is chosen.
export type AccentId = 'blue' | 'teal' | 'green' | 'pink' | 'coral' | 'purple';

export interface AccentColors {
  // Buttons, links, the active tab, icons that act.
  accent: string;
  // The pale fill behind an accent: chips, selected rows.
  accentSoft: string;
  // A solid accent background that carries white text (filled buttons, segments).
  accentFill: string;
  // Text on accentSoft.
  onSoft: string;
}

export const ACCENTS: Record<AccentId, { label: string; light: AccentColors; dark: AccentColors }> = {
  blue: {
    label: 'Blue',
    light: { accent: '#1B5E9E', accentSoft: '#E3EEF8', accentFill: '#1B5E9E', onSoft: '#0F3A66' },
    dark: { accent: '#6DB3F2', accentSoft: '#17304F', accentFill: '#2B78C2', onSoft: '#CFE6FB' },
  },
  teal: {
    label: 'Teal',
    light: { accent: '#177F86', accentSoft: '#DDF1F2', accentFill: '#177F86', onSoft: '#0B4A4F' },
    dark: { accent: '#4CC9CF', accentSoft: '#123A40', accentFill: '#1F9AA2', onSoft: '#C9F0F2' },
  },
  green: {
    label: 'Green',
    light: { accent: '#1F7A4D', accentSoft: '#E1F3E8', accentFill: '#1F7A4D', onSoft: '#14502E' },
    dark: { accent: '#6FD08C', accentSoft: '#173626', accentFill: '#2E8B57', onSoft: '#C5F0D4' },
  },
  pink: {
    label: 'Pink',
    light: { accent: '#C2417A', accentSoft: '#FBE5EF', accentFill: '#C2417A', onSoft: '#6E1F43' },
    dark: { accent: '#F58CB8', accentSoft: '#3A1828', accentFill: '#D1558C', onSoft: '#FBD5E6' },
  },
  coral: {
    label: 'Coral',
    light: { accent: '#C94A33', accentSoft: '#FFE6DA', accentFill: '#C94A33', onSoft: '#7A2E12' },
    dark: { accent: '#FF9B84', accentSoft: '#3A2219', accentFill: '#E0674E', onSoft: '#FFD9CB' },
  },
  purple: {
    label: 'Purple',
    light: { accent: '#6A4FC4', accentSoft: '#ECE7FA', accentFill: '#6A4FC4', onSoft: '#3A2A80' },
    dark: { accent: '#B3A0FF', accentSoft: '#281F4A', accentFill: '#7B63D6', onSoft: '#DDD3FF' },
  },
};

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];
export const DEFAULT_ACCENT: AccentId = 'blue';

export function accentColors(id: AccentId, scheme: ResolvedScheme): AccentColors {
  return ACCENTS[id][scheme];
}
