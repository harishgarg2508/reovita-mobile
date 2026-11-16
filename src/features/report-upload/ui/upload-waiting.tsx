import { ReportProcessingPanel } from '@shared/ui/processing-panel';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isReportReady, useReportStatus } from '@entities/report';
import { Skeleton } from '@shared/ui/skeleton';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

// Shown right after an upload. The report is read in the background; the app learns about each
// status change over the server's event stream, and opens the report once the observations are ready.
export function UploadWaiting({ reportId, onLater }: { reportId: string; onLater: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useReportStatus(reportId);

  useEffect(() => {
    // Ready, or needing action (a retake or a failure): the report screen shows the right panel for each.
    if (isReportReady(status) || status === 'NEEDS_RETAKE' || status === 'FAILED') {
      router.replace({ pathname: '/(app)/reports/[id]', params: { id: reportId } });
    }
  }, [status, reportId, router]);

  return <ReportProcessingPanel onLater={onLater} />;
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: colors.card,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  error: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
  },
  spacer: {
    flex: 1,
  },
  laterBtn: {
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  laterText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: colors.accent,
  },
});
