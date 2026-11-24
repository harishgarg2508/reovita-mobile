import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { ApiError } from '@shared/api';

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Nothing is reused between screens: every screen asks the server again, and data is dropped when its screen closes. A profile switch
            // would otherwise show the previous profile's data.
            staleTime: 0,
            gcTime: 0,
            // A screen that opens always asks the server for its data again, even when the same data was loaded a moment ago.
            refetchOnMount: 'always',
            // Do not retry client errors (4xx); retry transient failures once.
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
