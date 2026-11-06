import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface PreferencesState {
  themeMode: ThemeMode;
}

const initialState: PreferencesState = { themeMode: 'system' };

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    themeModeSet(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
  },
});

export const { themeModeSet } = preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;
