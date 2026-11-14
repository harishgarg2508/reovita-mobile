// Keeps the app running when an error escapes the screens (a request cancelled on unmount, a rejected promise that
// nothing awaited). A cancelled request is expected and is ignored. Anything else is logged, not thrown to the user.
// Errors that happen while a screen renders are still handled by the route ErrorBoundary in app/_layout.tsx.

function isCancellation(reason: unknown): boolean {
  if (!reason) return false;
  const name = (reason as { name?: unknown }).name;
  const message = String((reason as { message?: unknown }).message ?? reason);
  return name === 'AbortError' || /aborted/i.test(message);
}

let installed = false;

export function installErrorGuards(): void {
  if (installed) return;
  installed = true;

  // Web: unhandled promise rejections and uncaught errors.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', (event) => {
      if (isCancellation(event.reason)) {
        event.preventDefault();
        return;
      }
      console.warn('[app] unhandled promise rejection', event.reason);
      event.preventDefault();
    });
    window.addEventListener('error', (event) => {
      if (isCancellation(event.error)) {
        event.preventDefault();
      }
    });
  }

  // Native: JavaScript errors that would otherwise close the app. Cancellations are dropped; the rest are passed on.
  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, fatal) => {
      if (isCancellation(error)) return;
      previous(error, fatal);
    });
  }
}
