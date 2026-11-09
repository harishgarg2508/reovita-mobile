import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { api, queryKeys } from '@shared/api';

export interface UploadReportResult {
  report_id: string;
  status: string;
  duplicate: boolean;
}

export interface UploadReportInput {
  /** One PDF (max 15 pages), or up to 5 JPEG/PNG images. */
  files: { uri: string; name: string; type: string }[];
}

export function useUploadReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ files }: UploadReportInput): Promise<UploadReportResult> => {
      const form = new FormData();
      for (const file of files) {
        if (Platform.OS === 'web') {
          // Browsers need a real Blob in FormData; the native { uri, name, type } object is ignored.
          const blob = await (await fetch(file.uri)).blob();
          form.append('files', blob, file.name);
        } else {
          form.append('files', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
        }
      }
      const { data } = await api.post<UploadReportResult>('/v1/health/reports', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.home.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.report.list() });
    },
  });
}
