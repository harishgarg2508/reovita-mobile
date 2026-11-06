import { useQuery } from '@tanstack/react-query';

import { fetchCurrentSubject } from './subject.api';

// The signed-in subject's codename. Cleared from the cache on sign-out.
export function useCurrentSubject() {
  return useQuery({
    queryKey: ['subject', 'current'],
    queryFn: fetchCurrentSubject,
  });
}
