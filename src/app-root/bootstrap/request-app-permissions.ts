import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Asks for camera and location when the app opens, so the system permission prompts show up
// straight away. Answers are not stored here: the OS remembers them, and a denied permission
// just leaves that feature off. Skipped on web, where these prompts are not used.
export async function requestAppPermissions(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Camera.requestCameraPermissionsAsync();
  } catch {
    // Camera not available on this device: nothing to ask for.
  }
  try {
    await Location.requestForegroundPermissionsAsync();
  } catch {
    // Location services unavailable: nothing to ask for.
  }
}
