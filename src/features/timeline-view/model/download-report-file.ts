import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { api } from '@shared/api';

// Downloads the file the subject uploaded for a report, using the signed-in session (the API checks ownership).
// Native: saves it in the app cache and opens the share sheet, which includes "Save to Files". Web: browser download.
export async function downloadReportFile(reportId: string, position: number, mimeType: string, fileName: string): Promise<void> {
  const { data } = await api.get<ArrayBuffer>(`/v1/health/reports/${reportId}/files/${position}`, { responseType: 'arraybuffer' });

  if (Platform.OS === 'web') {
    const doc = (globalThis as unknown as { document: { createElement(tag: string): { href: string; download: string; click(): void } } }).document;
    const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
    const link = doc.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  const writer = file.writableStream().getWriter();
  await writer.write(new Uint8Array(data));
  await writer.close();

  await Sharing.shareAsync(file.uri, { mimeType: mimeType, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined, dialogTitle: 'Save report' });
}
