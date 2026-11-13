import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { saveLocation } from './briefing-api';

interface Coords {
  latitude: number;
  longitude: number;
}

// Asks for the device location once, then stores it in the database (rounded on the server).
// Returns false when the user says no or the device cannot give a position.
export async function shareLocationForBriefing(): Promise<boolean> {
  const coords = Platform.OS === 'web' ? await webPosition() : await nativePosition();
  if (!coords) return false;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  await saveLocation(coords.latitude, coords.longitude, tz);
  return true;
}

async function nativePosition(): Promise<Coords | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

// Browser geolocation: this is what shows the site's own location prompt.
function webPosition(): Promise<Coords | null> {
  const geo = (globalThis as unknown as {
    navigator?: {
      geolocation?: {
        getCurrentPosition(
          ok: (pos: { coords: Coords }) => void,
          fail: (err: unknown) => void,
          opts?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
        ): void;
      };
    };
  }).navigator?.geolocation;
  if (!geo) return Promise.resolve(null);
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
