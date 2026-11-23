// The look of Social: a calm, editorial system. It keeps the Reovita green and Poppins, and sets the rules the Social screens share, so each screen is
// composed with the same few decisions instead of its own.
//
//   - One big heading per screen, left-aligned. The rest of the type is body-sized and plain.
//   - Labels are the body face, one step smaller, in sentence case with no tracking. Nothing in capitals.
//   - Lists are flat rows on thin rules, not boxes. A box (a card) is used only for a picture or a single thing worth framing, and never inside another box.
//   - Space does the grouping: 24 between groups, 12 inside a group, 16 at the screen edge.
//   - Meta lines are split into places (name over handle, time at the far end), never joined with dots.
//   - One accent per screen: the brand green. Colour that means something (the streak flame, kudos red) stays, and nothing else is coloured.
import { StyleSheet } from 'react-native';

export const SOCIAL_SPACE = { edge: 16, group: 24, inner: 12, tight: 6 } as const;

// Poppins, loaded by the app. Weights 400, 500, 600 and 700 only.
export const SOCIAL_TYPE = {
  display: { fontFamily: 'Poppins_600SemiBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 15.5, lineHeight: 23 },
  bodyStrong: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, lineHeight: 23 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 18 },
  small: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 17 },
  figure: { fontFamily: 'Poppins_600SemiBold', fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
} as const;

export const SOCIAL_RULE = StyleSheet.hairlineWidth;

// Radii: pictures and the one framed thing, and controls (full).
export const SOCIAL_RADIUS = { media: 16, control: 999 } as const;
