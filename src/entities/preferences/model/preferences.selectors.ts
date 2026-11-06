import type { PreferencesState } from './preferences.slice';

interface PreferencesRootState {
  preferences: PreferencesState;
}

export const selectThemeMode = (state: PreferencesRootState) => state.preferences.themeMode;
