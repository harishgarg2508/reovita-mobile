import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Both values are held in memory only. This slice is not persisted, so nothing here reaches device storage.
export interface InteractionAlertState {
  // The interaction check queued by the last step 2 save, until it finishes. Followed by the root-level follower,
  // so it keeps going after the user has moved to the next screen.
  pendingJobId: string | null;
  // True when the finished check found a major or contraindicated pair.
  // TODO: the dashboard shows an interstitial for this flag (it reads it there, then clears it).
  hasMajorOrContra: boolean;
}

const initialState: InteractionAlertState = { pendingJobId: null, hasMajorOrContra: false };

export const interactionAlertSlice = createSlice({
  name: 'interactionAlert',
  initialState,
  reducers: {
    interactionJobQueued(state, action: PayloadAction<string>) {
      state.pendingJobId = action.payload;
    },
    interactionJobSettled(state, action: PayloadAction<{ hasMajorOrContra: boolean } | undefined>) {
      state.pendingJobId = null;
      // A failed check leaves the flag as it was; a finished one sets it from the result.
      if (action.payload) state.hasMajorOrContra = action.payload.hasMajorOrContra;
    },
    interactionAlertCleared(state) {
      state.hasMajorOrContra = false;
    },
  },
});

export const { interactionJobQueued, interactionJobSettled, interactionAlertCleared } = interactionAlertSlice.actions;
export const interactionAlertReducer = interactionAlertSlice.reducer;
