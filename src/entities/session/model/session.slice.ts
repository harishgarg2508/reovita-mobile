import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { SessionState } from './session.types';

const initialState: SessionState = {
  status: 'loading',
  subjectId: null,
  codename: null,
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionReady(state, action: PayloadAction<{ subjectId: string; codename: string }>) {
      state.status = 'ready';
      state.subjectId = action.payload.subjectId;
      state.codename = action.payload.codename;
    },
    sessionCleared(state) {
      state.status = 'signed-out';
      state.subjectId = null;
      state.codename = null;
    },
  },
});

export const { sessionReady, sessionCleared } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
