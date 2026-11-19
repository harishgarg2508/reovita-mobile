import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { saveLocation } from './briefing-api';

interface Coords {
  latitude: number;
  longitude: number;
}

// Why the location could not be shared, so the screen can say what to do about it.
//   denied      the user said no (or the browser did)
//   blocked     the phone will not ask again: it has to be turned on in the phone's settings
//   unavailable the device could not work out a position (location is off, no signal)
//   timeout     finding the position took too long
//   unsupported this browser has no location
export type LocationFailure = 'denied' | 'blocked' | 'unavailable' | 'timeout' | 'unsupported';

export type ShareLocationResult = { ok: true } | { ok: false; reason: LocationFailure };

type PositionResult = { coords: Coords } | { reason: LocationFailure };

// Asks for the device location once, then stores it in the database (rounded on the server).
// A refusal or a position that cannot be found is returned as a reason, not thrown. A failure to save is thrown.
export async function shareLocationForBriefing(): Promise<ShareLocationResult> {
  const found = Platform.OS === 'web' ? await webPosition() : await nativePosition();
  if ('reason' in found) return { ok: false, reason: found.reason };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  await saveLocation(found.coords.latitude, found.coords.longitude, tz);
  return { ok: true };
}

async function nativePosition(): Promise<PositionResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return { reason: permission.canAskAgain === false ? 'blocked' : 'denied' };
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { coords: { latitude: position.coords.latitude, longitude: position.coords.longitude } };
  } catch {
    // Permission is given but the position could not be read: location services are off or there is no fix.
    return { reason: 'unavailable' };
  }
}

// Browser geolocation: this is what shows the site's own location prompt.
function webPosition(): Promise<PositionResult> {
  const geo = (globalThis as unknown as {
    navigator?: {
      geolocation?: {
        getCurrentPosition(
          ok: (pos: { coords: Coords }) => void,
          fail: (err: { code?: number }) => void,
          opts?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
        ): void;
      };
    };
  }).navigator?.geolocation;
  if (!geo) return Promise.resolve({ reason: 'unsupported' });
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
      // The browser's codes: 1 permission denied, 2 position unavailable, 3 timeout.
      (err) => resolve({ reason: err?.code === 1 ? 'denied' : err?.code === 3 ? 'timeout' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

// The words shown for each reason.
export const LOCATION_FAILURE_TEXT: Record<LocationFailure, string> = {
  denied: 'Location permission was not given. Allow it to get your daily briefing.',
  blocked: 'Location is blocked for Reovita. Turn it on in your phone settings, then come back.',
  unavailable: 'Your position could not be found. Check that location is on, then try again.',
  timeout: 'Finding your position took too long. Try again.',
  unsupported: 'This browser cannot share your location.',
};
