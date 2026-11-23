import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_ACCENT, type AccentId } from '@shared/ui/theme/accents';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface PreferencesState {
  themeMode: ThemeMode;
  // The colour theme chosen in the profile.
  accent: AccentId;
}

// Light mode by default. The user can still switch to dark or system from the theme toggle.
const initialState: PreferencesState = { themeMode: 'light', accent: DEFAULT_ACCENT };

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    themeModeSet(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    accentSet(state, action: PayloadAction<AccentId>) {
      state.accent = action.payload;
    },
  },
});

export const { themeModeSet, accentSet } = preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;
