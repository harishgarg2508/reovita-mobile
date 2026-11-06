import type { ConsentFlowState } from './consent.slice';

interface ConsentRootState {
  consent: ConsentFlowState;
}

export const selectConsentScreen = (state: ConsentRootState) => state.consent.screen;
export const selectConsentRecords = (state: ConsentRootState) => state.consent.records;
export const selectConsentRecord = (type: keyof ConsentFlowState['records']) => (state: ConsentRootState) =>
  state.consent.records[type];
