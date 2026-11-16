import { useFocusEffect } from 'expo-router';
import { useCallback, type RefObject } from 'react';

interface Scrollable {
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
}

// Puts a ScrollView or FlatList back at the top each time its screen comes into view (a tab opened again).
// No animation, so the screen is already at the top when it appears.
export function useScrollToTopOnFocus(ref: RefObject<unknown>): void {
  useFocusEffect(
    useCallback(() => {
      const list = ref.current as Scrollable | null;
      list?.scrollTo?.({ y: 0, animated: false });
      list?.scrollToOffset?.({ offset: 0, animated: false });
    }, [ref]),
  );
}
