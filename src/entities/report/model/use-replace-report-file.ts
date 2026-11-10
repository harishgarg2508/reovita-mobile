import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { api, queryKeys } from '@shared/api';

export interface ReplaceReportFileInput {
  reportId: string;
  /** One PDF (max 15 pages), or up to 5 JPEG/PNG images. */
  files: { uri: string; name: string; type: string }[];
}

// Uploads a new file into a failed or unreadable report. The report id stays the same and OCR runs again.
export function useReplaceReportFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, files }: ReplaceReportFileInput): Promise<{ report_id: string; status: string }> => {
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
      const { data } = await api.post<{ report_id: string; status: string }>(`/v1/health/reports/${reportId}/replace`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_result, { reportId }) => {
      // The report is read again from the start: fetch its observations once OCR is done.
      queryClient.invalidateQueries({ queryKey: queryKeys.report.observations(reportId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.report.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.home.root });
    },
  });
}
