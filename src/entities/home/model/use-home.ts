import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchHome } from './home.api';

export function useHome() {
  return useQuery({ queryKey: queryKeys.home.detail(), queryFn: fetchHome });
}
