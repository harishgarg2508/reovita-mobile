import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { selectAccent, selectThemeMode } from '@entities/preferences';
import { PALETTES } from '@shared/ui/theme/palette';
import { AccentProvider, ThemeSchemeProvider, type ResolvedScheme } from '@shared/ui/theme/theme-context';

import { useAppSelector } from '../store';

// Resolves the user's theme choice (system, light or dark) and provides it to navigation and shared UI.
export function ThemeBridge({ children }: PropsWithChildren) {
  const mode = useAppSelector(selectThemeMode);
  const accent = useAppSelector(selectAccent);
  const system = useColorScheme();
  const scheme: ResolvedScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  // Android: the system navigation bar takes the app background, with icons that stay readable on it.
  // The bar is drawn edge to edge, so the app background shows through it; the icons are switched to suit the scheme.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void SystemUI.setBackgroundColorAsync(PALETTES[scheme].bg);
    NavigationBar.setStyle(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme]);

  return (
    <ThemeSchemeProvider value={scheme}>
      <AccentProvider value={accent}>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
      </AccentProvider>
    </ThemeSchemeProvider>
  );
}
