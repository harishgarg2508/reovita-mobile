import * as DocumentPicker from 'expo-document-picker';

// The same as the server's limit for one photo.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface PickedPicture {
  uri: string;
  name: string;
  type: string;
}

// Opens the device's files and returns a JPEG or PNG under 5 MB, or null if the person cancelled. Throws an Error with a message to show when the
// file is too big or cannot be opened.
export async function pickPicture(): Promise<PickedPicture | null> {
  let picked: DocumentPicker.DocumentPickerResult;
  try {
    picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], multiple: false, copyToCacheDirectory: true });
  } catch {
    throw new Error('Could not open photos.');
  }
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (asset.size && asset.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo under 5 MB.');
  return { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' };
}
