import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Form values for each onboarding step, kept in Redux so they survive moving between steps and restarts.
export type OnboardingSex = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export interface BasicsDraft {
  year: number | null;
  sex: OnboardingSex | null;
  height: string;
  weight: string;
}

export interface HistoryDraft {
  conditions: string[];
  otherText: string;
  medications: string[];
  father: string[];
  mother: string[];
  sibling: string[];
  wife: string[];
}

export interface LifestyleDraft {
  sleep: number | null;
  stress: number | null;
  diet: string | null;
  smoking: string | null;
  alcohol: string | null;
  exercise: string | null;
  occupation: string | null;
  activity_level: string | null;
}

export interface OnboardingState {
  basics: BasicsDraft;
  history: HistoryDraft;
  lifestyle: LifestyleDraft;
}

export const DEFAULT_BIRTH_YEAR = 1995;

const initialState: OnboardingState = {
  basics: { year: null, sex: null, height: '', weight: '' },
  // Step 2 starts empty. The user picks each item.
  history: {
    conditions: [],
    otherText: '',
    medications: [],
    father: [],
    mother: [],
    sibling: [],
    wife: [],
  },
  lifestyle: { sleep: null, stress: null, diet: null, smoking: null, alcohol: null, exercise: null, occupation: null, activity_level: null },
};

export const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    basicsDraftSet(state, action: PayloadAction<Partial<BasicsDraft>>) {
      state.basics = { ...state.basics, ...action.payload };
    },
    historyDraftSet(state, action: PayloadAction<Partial<HistoryDraft>>) {
      state.history = { ...state.history, ...action.payload };
    },
    lifestyleDraftSet(state, action: PayloadAction<Partial<LifestyleDraft>>) {
      state.lifestyle = { ...state.lifestyle, ...action.payload };
    },
    onboardingDraftsReset() {
      return initialState;
    },
  },
});

export const { basicsDraftSet, historyDraftSet, lifestyleDraftSet, onboardingDraftsReset } = onboardingSlice.actions;
export const onboardingReducer = onboardingSlice.reducer;
