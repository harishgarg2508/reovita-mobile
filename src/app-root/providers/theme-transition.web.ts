import { flushSync } from 'react-dom';

import type { ResolvedScheme } from '@shared/ui/theme/theme-context';

export interface ThemeOrigin {
  x: number;
  y: number;
}

type Play = (next: ResolvedScheme, origin: ThemeOrigin | undefined, apply: () => void) => void;

interface ViewTransitionLike {
  ready: Promise<void>;
}

type DocumentWithTransitions = Document & { startViewTransition?: (update: () => void) => ViewTransitionLike };

const STYLE_ID = 'theme-view-transition';
const DURATION_MS = 650;

// By default the browser cross-fades the old and new page. These rules turn that off, so the new theme can be revealed by the
// growing circle below, with the new page above the old one.
function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
    ::view-transition-old(root) { z-index: 1; }
    ::view-transition-new(root) { z-index: 2; }
  `;
  document.head.appendChild(style);
}

// The theme grows from the toggle: the browser takes a picture of the old page, the theme is switched, and the new page is
// revealed inside a circle that grows from the button to the farthest corner. Needs a browser with the View Transitions API
// (Chrome, Edge, Safari 18 and later); anywhere else, or when the user asks for reduced motion, the theme just changes.
const play: Play = (_next, origin, apply) => {
  const doc = document as DocumentWithTransitions;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!doc.startViewTransition || reduced) {
    apply();
    return;
  }
  ensureStyle();
  const x = origin?.x ?? window.innerWidth - 44;
  const y = origin?.y ?? 64;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  // The page must be redrawn inside the callback for the browser to capture the new theme, so React is flushed there.
  const transition = doc.startViewTransition(() => {
    flushSync(apply);
  });
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION_MS, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined);
};

export function useThemeTransition(): Play {
  return play;
}

// The web draws the change with the browser's View Transitions, so it needs no overlay.
export function ThemeTransitionOverlay(): null {
  return null;
}
