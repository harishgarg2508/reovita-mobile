export type SessionStatus = 'loading' | 'signed-out' | 'ready';

export interface SessionState {
  status: SessionStatus;
  /** Subject id from the access token `sub`. No real name is stored here. */
  subjectId: string | null;
  codename: string | null;
}
