import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

// The phone's step counter. Only a number of steps is ever read: no position, no route. Android allows live counting only while the app runs;
// iOS can also answer "how many steps since midnight".
export type StepPermission = 'granted' | 'denied' | 'undetermined';

export async function stepCounterAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function stepPermission(): Promise<{ state: StepPermission; canAskAgain: boolean }> {
  try {
    const r = await Pedometer.getPermissionsAsync();
    return { state: r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied', canAskAgain: r.canAskAgain };
  } catch {
    return { state: 'denied', canAskAgain: false };
  }
}

export async function askStepPermission(): Promise<StepPermission> {
  try {
    const r = await Pedometer.requestPermissionsAsync();
    return r.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

// Steps from a time until now, where the phone can answer (iOS). Null where it cannot (Android).
export async function stepsSince(start: Date): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    return (await Pedometer.getStepCountAsync(start, new Date())).steps;
  } catch {
    return null;
  }
}

// Steps counted since watching began; calls back on each change. Returns a function that stops watching.
export function watchSteps(onSteps: (sinceWatchStarted: number) => void): () => void {
  try {
    const sub = Pedometer.watchStepCount((r) => onSteps(r.steps));
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
