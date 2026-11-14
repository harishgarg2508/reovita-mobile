import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface CurrentPlace {
  name: string; // "City, Region", from the phone's own geocoder
  latitude: number;
  longitude: number;
}

// The phone's current position and its place name. Uses only the device; no key and no third-party service.
// Returns null when the permission is not granted or the platform cannot name the place (web).
export async function readCurrentPlace(): Promise<CurrentPlace | null> {
  if (Platform.OS === 'web') return null;
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;
  const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
  const locality = address?.city ?? address?.district ?? address?.subregion ?? null;
  const name = [locality, address?.region].filter((part): part is string => Boolean(part)).join(', ');
  return { name: name || 'Current location', latitude, longitude };
}

// The place is read when the briefing screen opens, and kept for a few minutes.
export function useCurrentPlace(enabled: boolean) {
  return useQuery({
    queryKey: ['briefing', 'current-place'] as const,
    queryFn: readCurrentPlace,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// "28.61° N, 77.21° E", rounded for display.
export function formatCoords(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}
