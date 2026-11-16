import type { ResolvedScheme } from '@shared/ui/theme/theme-context';

export interface ThemeOrigin {
  x: number;
  y: number;
}

type Play = (next: ResolvedScheme, origin: ThemeOrigin | undefined, apply: () => void) => void;

// The animated change of theme uses the browser's View Transitions API, so it exists on the web only (see theme-transition.web.ts).
// On a phone there is no such API, and the theme changes straight away.
const play: Play = (_next, _origin, apply) => apply();

export function useThemeTransition(): Play {
  return play;
}
