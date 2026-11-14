import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { api } from './client';

export interface OpenableFile {
  name: string;
  mime_type: string;
}

// Opens a file the API serves behind sign-in. The download needs the sign-in token, so the bytes are fetched through
// the API client. On web the file opens in a new tab. On the phone it is saved to the cache and handed to the share
// sheet, where the user can pick a viewer.
export async function openApiFile(path: string, file: OpenableFile & { id: string }): Promise<void> {
  const { data } = await api.get<ArrayBuffer>(path, { responseType: 'arraybuffer' });

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([data], { type: file.mime_type }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const uri = `${FileSystem.cacheDirectory ?? ''}${file.id}-${file.name}`;
  await FileSystem.writeAsStringAsync(uri, btoa(binary), { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: file.mime_type, dialogTitle: file.name });
}
