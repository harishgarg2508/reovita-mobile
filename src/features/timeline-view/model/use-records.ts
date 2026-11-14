import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

export interface RecordFile {
  position: number;
  mime_type: string;
  size_bytes: number;
  page_count: number | null;
}

export interface RecordObservation {
  biomarker_code: string;
  name: string;
  value: number;
  value_qualifier: string | null;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  status: string;
  collected_on: string;
}

export interface RecordItem {
  id: string;
  created_at: string;
  status: string;
  source: string;
  lab_id: string | null;
  collected_on: string | null;
  reported_on: string | null;
  has_critical: boolean;
  has_interpretation: boolean;
  files: RecordFile[];
  observations: RecordObservation[];
}

export interface RecordsPage {
  page: number;
  limit: number;
  has_more: boolean;
  items: RecordItem[];
}

// The subject's records, 10 per page, newest first. Each page loads when the list reaches its end.
export function useRecords() {
  return useInfiniteQuery({
    queryKey: ['records', 'list'] as const,
    queryFn: async ({ pageParam }): Promise<RecordsPage> => {
      const { data } = await api.get<RecordsPage>('/v1/health/reports/records', { params: { page: pageParam, limit: 10 } });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });
}
