import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isReportReady, useReportStatus } from '@entities/report';
import { Skeleton } from '@shared/ui/skeleton';

// Shown right after an upload. The report is read in the background; the app learns about each
// status change over the server's event stream, and opens the report once the observations are ready.
export function UploadWaiting({ reportId, onLater }: { reportId: string; onLater: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useReportStatus(reportId);

  useEffect(() => {
    if (isReportReady(status)) {
      router.replace({ pathname: '/(app)/reports/[id]', params: { id: reportId } });
    }
  }, [status, reportId, router]);

  const needsAction = status === 'NEEDS_RETAKE' || status === 'FAILED';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      <Text style={styles.title}>Your report is being read</Text>

      {needsAction ? (
        <Text style={styles.error}>
          {status === 'NEEDS_RETAKE'
            ? 'This photo is too blurry to read. Upload a clearer copy.'
            : 'We could not read this report. Please upload it again.'}
        </Text>
      ) : (
        <>
          <Text style={styles.subtitle}>
            We&apos;ll notify you when your observations are ready. You can wait here or come back later.
          </Text>
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </>
      )}

      <View style={styles.spacer} />

      <Pressable accessibilityRole="button" onPress={onLater} style={styles.laterBtn}>
        <Text style={styles.laterText}>Come back later</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#171717',
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#60646C',
  },
  error: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#C22F43',
  },
  spacer: {
    flex: 1,
  },
  laterBtn: {
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EDF7',
  },
  laterText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#1F6F3F',
  },
});
