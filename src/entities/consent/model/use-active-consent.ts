import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchConsents } from './consent.api';
import type { ConsentType } from './consent.types';

// True when the subject has an active, current-version consent of this type.
export function useActiveConsent(type: ConsentType) {
  const query = useQuery({
    queryKey: queryKeys.consent.list(),
    queryFn: fetchConsents,
  });
  const granted = query.data?.some((c) => c.type === type && c.active && c.is_current_version) ?? false;
  return { ...query, granted };
}
