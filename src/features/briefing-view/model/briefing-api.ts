import { api, isApiError } from '@shared/api';

// One environmental card (spec section 9.4). Numbers come from the snapshot; text comes from fixed rule templates.
// The readings a card was built from. From WeatherAPI.com, or from Open-Meteo when that is unavailable.
export interface BriefingSnapshot {
  aqi?: number | null;
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  o3?: number | null;
  co?: number | null;
  so2?: number | null;
  uv_index?: number | null;
  temperature_c?: number | null;
  feels_like_c?: number | null;
  humidity?: number | null;
}

export interface BriefingCard {
  kind: 'morning' | 'night';
  local_date: string;
  headline: string;
  body: string;
  severity: 'info' | 'caution' | 'high';
  snapshot: BriefingSnapshot;
}

export interface TodaysBriefings {
  morning: BriefingCard | null;
  night: BriefingCard | null;
  // The stored location the briefing is for (rounded to 2 decimals on the server).
  location?: { lat: number; lng: number };
}

// Today's cards. Returns needsLocation when the subject has not shared a location yet (the API answers 409).
export async function fetchTodaysBriefings(): Promise<TodaysBriefings & { needsLocation: boolean }> {
  try {
    const { data } = await api.get<TodaysBriefings>('/v1/briefings/today');
    return { ...data, needsLocation: false };
  } catch (err) {
    if (isApiError(err, 'location_required')) {
      return { morning: null, night: null, needsLocation: true };
    }
    if (isApiError(err, 'briefing_unavailable') || isApiError(err, 'unknown')) {
      return { morning: null, night: null, needsLocation: false };
    }
    throw err;
  }
}

// Saves the device location (the API rounds it to 2 decimals and checks the location consent).
export async function saveLocation(lat: number, lng: number, tz: string): Promise<void> {
  await api.put('/v1/location', { lat, lng, tz });
}
