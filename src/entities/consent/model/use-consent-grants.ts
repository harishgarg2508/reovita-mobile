import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchConsents } from './consent.api';
import type { ConsentType } from './consent.types';

// Consent types the subject has granted and not revoked, from GET /v1/consents.
// A record with granted_at set (and revoked_at null) counts as granted.
export function useConsentGrants() {
  const query = useQuery({
    queryKey: queryKeys.consent.list(),
    queryFn: fetchConsents,
  });

  const granted = new Set<ConsentType>(
    (query.data ?? [])
      .filter((c) => c.granted_at !== null && c.revoked_at === null && c.active)
      .map((c) => c.type),
  );

  return { granted, isLoading: query.isLoading, isError: query.isError };
}
