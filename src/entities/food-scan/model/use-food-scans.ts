import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { deleteFoodScan, fetchFoodScan, fetchFoodScanPhoto, fetchFoodScans } from './food-scan.api';
import type { FoodScanKind } from './food-scan.types';

// My past scans of one kind, newest first.
export function useFoodScans(kind: FoodScanKind, limit = 20) {
  return useQuery({ queryKey: queryKeys.foodScan.list(kind, limit), queryFn: () => fetchFoodScans(kind, limit), staleTime: 0 });
}

// One scan. Its answer never changes, so it is kept.
export function useFoodScan(id: string) {
  return useQuery({ queryKey: queryKeys.foodScan.detail(id), queryFn: () => fetchFoodScan(id), enabled: id.length > 0, staleTime: Infinity, retry: false });
}

// The photo of a scan. Its picture never changes, so it is kept.
export function useFoodScanPhoto(id: string, enabled: boolean) {
  return useQuery({ queryKey: queryKeys.foodScan.photo(id), queryFn: () => fetchFoodScanPhoto(id), enabled: enabled && id.length > 0, staleTime: Infinity, gcTime: 30 * 60 * 1000, retry: false });
}

export function useDeleteFoodScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFoodScan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.foodScan.root }),
  });
}
