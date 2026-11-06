import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ConsentType } from './consent.types';

// Screens of the consent carousel, in order.
export type ConsentScreenId = 'welcome' | 'storage' | 'ai' | 'controls';

export type ConsentSaveStatus = 'idle' | 'saving' | 'granted' | 'error';

// What the app tracks for one consent type.
export interface ConsentRecord {
  selected: boolean;
  status: ConsentSaveStatus;
  version: string | null;
  grantedAt: string | null;
}

export interface ConsentFlowState {
  screen: ConsentScreenId;
  records: Record<ConsentType, ConsentRecord>;
}

const emptyRecord = (selected = false): ConsentRecord => ({
  selected,
  status: 'idle',
  version: null,
  grantedAt: null,
});

export const CONSENT_TYPES: ConsentType[] = ['health_data', 'llm_processing', 'location', 'notifications', 'food_image'];

const initialState: ConsentFlowState = {
  screen: 'welcome',
  records: {
    health_data: emptyRecord(false),
    llm_processing: emptyRecord(false),
    location: emptyRecord(false),
    notifications: emptyRecord(false),
    food_image: emptyRecord(false),
  },
};

export const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    consentScreenSet(state, action: PayloadAction<ConsentScreenId>) {
      state.screen = action.payload;
    },
    consentSelectedSet(state, action: PayloadAction<{ type: ConsentType; value: boolean }>) {
      state.records[action.payload.type].selected = action.payload.value;
    },
    consentSaving(state, action: PayloadAction<ConsentType>) {
      state.records[action.payload].status = 'saving';
    },
    consentGranted(state, action: PayloadAction<{ type: ConsentType; version: string; grantedAt: string }>) {
      const record = state.records[action.payload.type];
      record.status = 'granted';
      record.version = action.payload.version;
      record.grantedAt = action.payload.grantedAt;
    },
    consentFailed(state, action: PayloadAction<ConsentType>) {
      state.records[action.payload].status = 'error';
    },
    consentFlowReset() {
      return initialState;
    },
  },
});

export const {
  consentScreenSet,
  consentSelectedSet,
  consentSaving,
  consentGranted,
  consentFailed,
  consentFlowReset,
} = consentSlice.actions;

export const consentReducer = consentSlice.reducer;
