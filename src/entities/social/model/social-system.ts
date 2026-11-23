// The look of Social is the look of the whole app: one editorial system, kept in shared/ui/theme/tokens.ts (Type, Gap, Rule, Radius). Social keeps its own
// names for it so its screens read the same, and adds only what is Social's own.
//
//   - One big heading per screen, left-aligned. The rest of the type is body-sized and plain.
//   - Labels are the body face, one step smaller, in sentence case with no tracking. Nothing in capitals.
//   - Lists are flat rows on thin rules, not boxes. A box (a card) is for a picture or a single thing worth framing, and never inside another box.
//   - Space does the grouping: 24 between groups, 12 inside a group, 16 at the screen edge.
//   - Meta lines are split into places (name over handle, time at the far end), never joined with dots.
//   - One accent per screen: the brand green. Colour that means something (the streak flame, kudos red) stays, and nothing else is coloured.
import { Gap, Rule, Type } from '@shared/ui/theme';

export const SOCIAL_SPACE = Gap;
export const SOCIAL_TYPE = Type;
export const SOCIAL_RULE = Rule;

// Radii: pictures and the one framed thing, and controls (full).
export const SOCIAL_RADIUS = { media: 16, control: 999 } as const;
