import type { PropsWithChildren } from 'react';

import { InteractionJobFollower } from './interaction-job-follower';
import { QueryProvider } from './query-provider';
import { ReduxProvider } from './redux-provider';
import { SessionProvider } from './session-provider';
import { ThemeTransitionOverlay } from './theme-transition';

// Composes every app-wide provider. Outermost first.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <SessionProvider>
          {children}
          <InteractionJobFollower />
          <ThemeTransitionOverlay />
        </SessionProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
