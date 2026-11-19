



/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#171717',
    background: '#FFFFFF',
    backgroundElement: '#FBFAFF',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#3A3A3A',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'Poppins',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Poppins',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Health status colors (Normal / Watch / Critical). Used by status tags and banners.
export const StatusColors = {
  normal: '#7AA800',
  watch: '#D4A64A',
  critical: '#C22F43',
  criticalBanner: '#E34255',
  amberBanner: '#FDEEF0',
  criticalSoft: '#FDEEF0',
  amberSoft: '#FFF4D6',
} as const;

export type HealthStatus = 'normal' | 'watch' | 'critical';

// Visual rhythm shared by every screen. Keep screens on these values, not ad-hoc numbers.
export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const Elevation = {
  card: {
    shadowColor: '#171717',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

// Poppins, loaded in app/_layout.tsx. Weight is set by family, not fontWeight.
export const Font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
} as const;

export const Type = {
  display: { fontFamily: Font.extrabold, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: Font.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: Font.bold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: Font.regular, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: Font.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: Font.semibold, fontSize: 12, lineHeight: 16 },
} as const;

export const Brand = {
  primary: '#1F6F3F',
  accent: '#D4FF3F',
  ink: '#171717',
  muted: '#60646C',
  surface: '#FBFAFF',
  line: '#E0E1E6',
} as const;
