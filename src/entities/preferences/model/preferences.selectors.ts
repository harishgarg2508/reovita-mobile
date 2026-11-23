import type { PreferencesState } from './preferences.slice';

interface PreferencesRootState {
  preferences: PreferencesState;
}

export const selectThemeMode = (state: PreferencesRootState) => state.preferences.themeMode;
export const selectAccent = (state: PreferencesRootState) => state.preferences.accent ?? 'blue';
