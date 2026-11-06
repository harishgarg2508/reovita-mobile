import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { selectThemeMode } from '@entities/preferences';
import { ThemeSchemeProvider, type ResolvedScheme } from '@shared/ui/theme/theme-context';

import { useAppSelector } from '../store';

// Resolves the user's theme choice (system, light or dark) and provides it to navigation and shared UI.
export function ThemeBridge({ children }: PropsWithChildren) {
  const mode = useAppSelector(selectThemeMode);
  const system = useColorScheme();
  const scheme: ResolvedScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeSchemeProvider value={scheme}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
    </ThemeSchemeProvider>
  );
}
