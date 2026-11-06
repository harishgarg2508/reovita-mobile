// Access token lives in memory only. Refresh tokens are not implemented: reovita-service has no refresh endpoint yet.
let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registered once by the session provider. Called when the API returns 401. */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  accessToken = null;
  unauthorizedHandler?.();
}

export function signOutLocally(): void {
  accessToken = null;
}
