import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

type Router = ReturnType<typeof useRouter>;

/**
 * Go to the previous screen. With no history (a screen opened by a redirect or a deep link),
 * go to `fallback` instead, so the back control always does something.
 */
export function goBackOr(router: Router, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

interface ScreenBackButtonProps {
  /** Where to go when there is no history. */
  fallback: Href;
}

/** Back arrow for a screen header. Pair with `goBackOr` for in-screen back buttons. */
export function ScreenBackButton({ fallback }: ScreenBackButtonProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={() => goBackOr(router, fallback)}
      style={styles.button}>
      <Text style={styles.arrow}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrow: {
    fontSize: 22,
    color: '#171717',
    fontWeight: '700',
  },
});
