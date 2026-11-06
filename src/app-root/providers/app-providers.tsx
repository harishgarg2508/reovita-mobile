import type { PropsWithChildren } from 'react';

import { QueryProvider } from './query-provider';
import { ReduxProvider } from './redux-provider';
import { SessionProvider } from './session-provider';

// Composes every app-wide provider. Outermost first.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <SessionProvider>{children}</SessionProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
