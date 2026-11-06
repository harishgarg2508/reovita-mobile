import { createContext, useContext } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';

export type ResolvedScheme = 'light' | 'dark';

// The scheme the app should draw in. ThemeBridge sets it from the user's choice; without a provider
// the system setting is used.
const ThemeSchemeContext = createContext<ResolvedScheme | null>(null);

export const ThemeSchemeProvider = ThemeSchemeContext.Provider;

export function useResolvedScheme(): ResolvedScheme {
  const provided = useContext(ThemeSchemeContext);
  const system = useSystemScheme();
  return provided ?? (system === 'dark' ? 'dark' : 'light');
}
