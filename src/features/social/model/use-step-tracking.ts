import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { api, queryKeys } from '@shared/api';
import { askStepPermission, stepCounterAvailable, stepPermission, stepsSince, watchSteps, type StepPermission } from '@shared/lib';

// Step counting for journeys. The person turns it on once and allows the phone's activity permission; the app then counts steps while it is open
// (and asks iOS for the whole day), keeps today's total on the phone, and sends only that number to the server. Nothing about where the person is.
const KEY_ENABLED = 'reovita.steps.enabled';
const KEY_DAY = 'reovita.steps.day';
const SEND_EVERY_MS = 60_000;
const SEND_AFTER_STEPS = 150;

export interface StepState {
  // Loaded from storage and the phone yet.
  ready: boolean;
  available: boolean;
  // The person turned counting on, even if the phone's permission is missing now.
  wanted: boolean;
  enabled: boolean;
  permission: StepPermission;
  canAskAgain: boolean;
  today: number;
}

let state: StepState = { ready: false, available: false, wanted: false, enabled: false, permission: 'undetermined', canAskAgain: true, today: 0 };
let loading = false;
const listeners = new Set<() => void>();
function set(patch: Partial<StepState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// India time, the same day the server uses.
export const istDayNow = (at = Date.now()): string => new Date(at + 5.5 * 3600_000).toISOString().slice(0, 10);

async function load() {
  if (loading) return;
  loading = true;
  const [available, perm, enabled, stored] = await Promise.all([stepCounterAvailable(), stepPermission(), AsyncStorage.getItem(KEY_ENABLED).catch(() => null), AsyncStorage.getItem(KEY_DAY).catch(() => null)]);
  let today = 0;
  try {
    const parsed = stored ? (JSON.parse(stored) as { day: string; steps: number }) : null;
    if (parsed && parsed.day === istDayNow()) today = parsed.steps;
  } catch {
    today = 0;
  }
  set({ ready: true, available, permission: perm.state, canAskAgain: perm.canAskAgain, wanted: enabled === '1', enabled: enabled === '1' && perm.state === 'granted', today });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getState = () => state;

export function useStepState(): StepState {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => {
    if (!state.ready) void load();
  }, []);
  return snapshot;
}

// Turn counting on: asks the phone's permission first. Returns whether it is on.
export async function enableStepCounting(): Promise<boolean> {
  const perm = await askStepPermission();
  const after = await stepPermission();
  set({ permission: perm, canAskAgain: after.canAskAgain });
  if (perm !== 'granted') return false;
  await AsyncStorage.setItem(KEY_ENABLED, '1').catch(() => undefined);
  set({ wanted: true, enabled: true });
  return true;
}

export async function disableStepCounting(): Promise<void> {
  await AsyncStorage.setItem(KEY_ENABLED, '0').catch(() => undefined);
  set({ wanted: false, enabled: false });
}

// Checks the phone's permission again. The person may have taken it away in the phone settings, or never answered. If counting is wanted and the permission
// is missing, the phone is asked again (once each time the app comes to the front); if it cannot be asked any more, the card tells the person to allow it
// in the settings. Counting stops while the permission is missing and starts again as soon as it is given.
let asking = false;
export async function refreshStepPermission(askAgain: boolean): Promise<void> {
  if (!state.ready || asking) return;
  let perm = await stepPermission();
  if (state.wanted && perm.state !== 'granted' && perm.canAskAgain && askAgain) {
    asking = true;
    await askStepPermission();
    asking = false;
    perm = await stepPermission();
  }
  set({ permission: perm.state, canAskAgain: perm.canAskAgain, enabled: state.wanted && perm.state === 'granted' });
}

// Mounted once, high in the signed-in app. While counting is on it keeps today's steps up to date, and sends them to the server now and then.
export function useStepTracker() {
  const queryClient = useQueryClient();
  const { enabled, ready } = useStepState();
  const sent = useRef({ steps: 0, at: 0, day: '' });
  const total = useRef({ day: '', base: 0 });

  const send = useCallback(
    async (force: boolean) => {
      const steps = state.today;
      const day = istDayNow();
      const last = sent.current;
      if (!force && last.day === day && (Date.now() - last.at < SEND_EVERY_MS || steps - last.steps < SEND_AFTER_STEPS)) return;
      if (last.day === day && steps === last.steps) return;
      sent.current = { steps, at: Date.now(), day };
      try {
        await api.put('/v1/social/steps/today', { steps });
        void queryClient.invalidateQueries({ queryKey: queryKeys.social.challenges() });
      } catch {
        // Try again at the next change; the number is kept on the phone.
        sent.current = { ...last };
      }
    },
    [queryClient],
  );

  // Check the permission when the app opens and each time it comes to the front.
  useEffect(() => {
    if (!ready) return;
    void refreshStepPermission(true);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshStepPermission(true);
    });
    return () => sub.remove();
  }, [ready]);

  useEffect(() => {
    if (!ready || !enabled) return;
    let stop: () => void = () => undefined;
    let cancelled = false;
    void (async () => {
      const day = istDayNow();
      // Where the phone can answer for the whole day (iOS), that is the total. Otherwise start from the total kept on the phone and add what is counted now.
      const whole = await stepsSince(new Date(`${day}T00:00:00+05:30`));
      if (cancelled) return;
      total.current = { day, base: whole ?? state.today };
      if (whole !== null) set({ today: whole });
      stop = watchSteps((counted) => {
        const now = istDayNow();
        if (now !== total.current.day) {
          // Midnight passed while the app was open: a new day starts from zero.
          total.current = { day: now, base: -counted };
        }
        const steps = Math.max(0, total.current.base + counted);
        set({ today: steps });
        void AsyncStorage.setItem(KEY_DAY, JSON.stringify({ day: now, steps })).catch(() => undefined);
        void send(false);
      });
      void send(true);
    })();
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void send(true);
    });
    return () => {
      cancelled = true;
      stop();
      appState.remove();
    };
  }, [enabled, ready, send]);
}
