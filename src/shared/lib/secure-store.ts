import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'vita_refresh_token';

// The refresh token is the only token kept on the device. The access token stays in memory.
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  } catch {
    // Storage unavailable: the user signs in again next time.
  }
}

// On web the secure store may never answer. A timeout treats that as "no stored token", so start-up continues.
export async function getRefreshToken(): Promise<string | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
  try {
    return await Promise.race([SecureStore.getItemAsync(REFRESH_KEY), timeout]);
  } catch {
    return null;
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    // Nothing to clear.
  }
}
