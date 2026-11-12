import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { api } from '@shared/api';

// Downloads use the signed-in session (the API checks ownership). Native: the file is saved in the app cache and the
// share sheet opens, which includes "Save to Files". Web: the browser downloads it.

// One uploaded file of a report, by its position (1 = first uploaded).
export async function downloadReportFile(reportId: string, position: number, mimeType: string, fileName: string): Promise<void> {
  const { data } = await api.get<ArrayBuffer>(`/v1/health/reports/${reportId}/files/${position}`, { responseType: 'arraybuffer' });
  await saveAndShare(data, fileName, mimeType);
}

// Every file of the report, as one zip.
export async function downloadReportZip(reportId: string): Promise<void> {
  const { data } = await api.get<ArrayBuffer>(`/v1/health/reports/${reportId}/files.zip`, { responseType: 'arraybuffer' });
  await saveAndShare(data, `report-${reportId.slice(0, 8)}.zip`, 'application/zip');
}

async function saveAndShare(data: ArrayBuffer, fileName: string, mimeType: string): Promise<void> {
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

  await Sharing.shareAsync(file.uri, { mimeType, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined, dialogTitle: 'Save report' });
}
