import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Whether this app may use the device location, and whether the system will still show its own permission popup.
//   granted       allowed
//   denied        refused. canAskAgain says whether the phone will show the popup again (it stops after repeated refusals)
//   undetermined  never asked, or the browser has not decided yet
//   unknown       the browser cannot tell (no Permissions API): nothing is shown
export interface LocationPermission {
  status: 'granted' | 'denied' | 'undetermined' | 'unknown';
  canAskAgain: boolean;
}

export async function getLocationPermission(): Promise<LocationPermission> {
  if (Platform.OS === 'web') return webPermission();
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    const status = permission.status === 'granted' ? 'granted' : permission.status === 'denied' ? 'denied' : 'undetermined';
    return { status, canAskAgain: permission.canAskAgain !== false };
  } catch {
    return { status: 'unknown', canAskAgain: false };
  }
}

// Shows the system's own permission popup, if it will still show one, and returns the permission after the person has answered.
//   On a phone: the phone's native location popup.
//   On a computer: the browser's location prompt, which the browser only shows when a position is asked for, so one is asked for here.
//     A browser that has blocked the site shows nothing: the person has to allow it in the site settings.
export async function askLocationPermission(): Promise<LocationPermission> {
  if (Platform.OS === 'web') {
    await askBrowserForPosition();
    return webPermission();
  }
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    const status = permission.status === 'granted' ? 'granted' : 'denied';
    return { status, canAskAgain: permission.canAskAgain !== false };
  } catch {
    return { status: 'unknown', canAskAgain: false };
  }
}

// Asks the browser for a position so that it shows its permission prompt. The position itself is not used here.
function askBrowserForPosition(): Promise<void> {
  const geo = (globalThis as unknown as {
    navigator?: { geolocation?: { getCurrentPosition(ok: () => void, fail: () => void, opts?: { timeout?: number; maximumAge?: number }): void } };
  }).navigator?.geolocation;
  if (!geo) return Promise.resolve();
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { timeout: 30_000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

async function webPermission(): Promise<LocationPermission> {
  try {
    const api = (globalThis as unknown as {
      navigator?: { permissions?: { query(d: { name: string }): Promise<{ state: string }> } };
    }).navigator?.permissions;
    if (!api) return { status: 'unknown', canAskAgain: false };
    const result = await api.query({ name: 'geolocation' });
    if (result.state === 'granted') return { status: 'granted', canAskAgain: false };
    // A browser that has refused the site will not show the prompt again until the person changes it in the site settings.
    if (result.state === 'denied') return { status: 'denied', canAskAgain: false };
    return { status: 'undetermined', canAskAgain: true };
  } catch {
    return { status: 'unknown', canAskAgain: false };
  }
}
