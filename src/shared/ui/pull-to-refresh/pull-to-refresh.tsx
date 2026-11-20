import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { usePalette } from '@shared/ui/theme';

const THRESHOLD = 80;
const MAX_PULL = 130;

// Pull down on a list to load it again. On a phone the list's own refresh control does this. In a browser (and in the browser's phone
// preview) the refresh control does nothing, so this adds the same gesture there: pull down from the very top of the list, past the line,
// and let go. Spread `listProps` onto the list, and render <PullIndicator pull={pull} busy={busy} /> above it.
export function usePullToRefresh(onRefresh: () => unknown) {
  const startY = useRef<number | null>(null);
  const atTop = useRef(true);
  const pulled = useRef(0);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    startY.current = null;
    pulled.current = 0;
    setPull(0);
  }, []);

  const listProps =
    Platform.OS === 'web'
      ? {
          scrollEventThrottle: 16,
          onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            atTop.current = event.nativeEvent.contentOffset.y <= 0;
          },
        }
      : {};

  const touch =
    Platform.OS === 'web'
      ? {
          onTouchStart: (event: { nativeEvent: { touches: ArrayLike<{ pageY: number }> } }) => {
            startY.current = atTop.current && !busy ? event.nativeEvent.touches[0].pageY : null;
          },
          onTouchMove: (event: { nativeEvent: { touches: ArrayLike<{ pageY: number }> } }) => {
            if (startY.current === null) return;
            const delta = event.nativeEvent.touches[0].pageY - startY.current;
            pulled.current = Math.max(0, Math.min(MAX_PULL, delta));
            setPull(pulled.current);
          },
          onTouchEnd: () => {
            const reached = pulled.current >= THRESHOLD;
            reset();
            if (!reached) return;
            setBusy(true);
            void Promise.resolve(onRefresh()).finally(() => setBusy(false));
          },
        }
      : {};

  return { listProps, touch, pull, busy };
}

// A small spinner strip above a list, shown whenever the list is being loaded again from the server while it already shows something (a
// return to the screen, a pull down, a change of tab). It takes no room when idle. The very first load shows the list's own big spinner.
export function RefreshingBar({ active }: { active: boolean }) {
  const p = usePalette();
  if (!active) return null;
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite" accessibilityLabel="Loading">
      <ActivityIndicator size="small" color={p.accent} />
    </View>
  );
}

// The strip above a list that shows how far it is pulled, and the spinner while it loads again. It takes no room when idle.
export function PullIndicator({ pull, busy }: { pull: number; busy: boolean }) {
  const p = usePalette();
  if (Platform.OS !== 'web') return null;
  const height = busy ? 44 : pull > 0 ? Math.min(pull * 0.5, 56) : 0;
  if (height === 0) return null;
  return (
    <View style={[styles.strip, { height }]} pointerEvents="none">
      {busy ? (
        <ActivityIndicator color={p.accent} />
      ) : (
        <Text style={[styles.text, { color: p.muted }]}>{pull >= THRESHOLD ? 'Release to refresh' : 'Pull down to refresh'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 34, alignItems: 'center', justifyContent: 'center' },
  strip: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { fontSize: 12.5, fontWeight: '600' },
});
