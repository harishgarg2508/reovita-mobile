import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useRetryReport } from '@entities/report';
import { isApiError } from '@shared/api';

const VIOLET = '#1F6F3F';

// Shown when OCR could not read the stored file. Runs OCR again on the same file (no new upload).
export function ReportNotReadablePanel({ reportId }: { reportId: string }) {
  const retry = useRetryReport();
  const [message, setMessage] = useState<string | null>(null);

  function onRetry() {
    setMessage(null);
    retry.mutate(reportId, {
      onError: (err) => {
        if (isApiError(err, 'report_not_retryable')) {
          setMessage('This report is already being read.');
        } else {
          setMessage('We could not start the reading again. Please try again.');
        }
      },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>We could not read this report</Text>
      <Text style={styles.body}>
        Try reading the stored file again. If it keeps failing, the file may be blurry or not a lab report.
      </Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        disabled={retry.isPending}
        style={[styles.button, retry.isPending && styles.buttonDisabled]}>
        {retry.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Try reading again</Text>}
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
