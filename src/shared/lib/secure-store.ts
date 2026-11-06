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

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
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
