import type { SessionState } from './session.types';

interface SessionRootState {
  session: SessionState;
}

export const selectSessionStatus = (state: SessionRootState) => state.session.status;
export const selectSubjectId = (state: SessionRootState) => state.session.subjectId;
export const selectIsSignedIn = (state: SessionRootState) => state.session.status === 'ready';
