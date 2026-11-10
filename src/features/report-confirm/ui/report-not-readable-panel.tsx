import * as DocumentPicker from 'expo-document-picker';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useReplaceReportFile } from '@entities/report';
import { isApiError } from '@shared/api';

const VIOLET = '#7545ED';

// Shown when OCR could not read the stored file. The user uploads a new copy into the same report.
export function ReportNotReadablePanel({ reportId }: { reportId: string }) {
  const replace = useReplaceReportFile();
  const [message, setMessage] = useState<string | null>(null);

  async function onUpload() {
    setMessage(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;

    const files = picked.assets.map((a) => ({
      uri: a.uri,
      name: a.name,
      type: a.mimeType ?? 'application/octet-stream',
    }));
    replace.mutate(
      { reportId, files },
      {
        onError: (err) => {
          if (isApiError(err, 'duplicate_report')) {
            setMessage('This file is already uploaded to another report.');
          } else if (isApiError(err, 'report_not_replaceable')) {
            setMessage('This report is already being read.');
          } else {
            setMessage('The new file could not be uploaded. Please try again.');
          }
        },
      },
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>We could not read this report</Text>
      <Text style={styles.body}>
        The file may be blurry, cropped, or not a lab report. Upload a clearer copy and we will read it again.
      </Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onUpload}
        disabled={replace.isPending}
        style={[styles.button, replace.isPending && styles.buttonDisabled]}>
        {replace.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Upload a new file</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F1A2E', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 14, color: '#5B5470', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  error: { fontSize: 13, color: '#C22F43', textAlign: 'center', marginBottom: 12 },
  button: {
    backgroundColor: VIOLET,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
