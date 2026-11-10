import type { Href } from 'expo-router';

// The router methods this helper needs. Keeps the helper free of expo-router's generic Router type.
interface BackRouter {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
}

// Goes back when there is history, otherwise replaces the route with a known fallback screen.
// Used by in-screen back buttons; screens do not get a generic header back arrow.
export function goBackOr(router: BackRouter, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
