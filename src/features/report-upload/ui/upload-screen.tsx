import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LlmConsentSheet, useGrantLlmConsent } from '@entities/consent';
import { useReportList } from '@entities/report';
import { isApiError } from '@shared/api';
import { ReportDropZone } from '@shared/ui/report-drop-zone';
import { StepHeaderBadge } from '@shared/ui/step-header-badge';

import { useUploadReport } from '../model/use-upload-report';
import { ReportList } from './report-list';
import { UploadWaiting } from './upload-waiting';

const ERROR_TEXT: Record<string, string> = {
  unsupported_file_type: 'Only PDF, JPEG and PNG files are accepted.',
  duplicate_report: 'This report was already uploaded.',
  rate_limited: 'Too many uploads. Wait a moment and try again.',
};

type UploadFile = { uri: string; name: string; type: string };

// Upload screen with the same layout as onboarding Step 4 ("Your First Report").
export function UploadScreen({ autoPick = false }: { autoPick?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const upload = useUploadReport();

  // Opens the file picker straight away when the screen is reached from "Choose file".
  useEffect(() => {
    if (autoPick) void onPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const grantLlm = useGrantLlmConsent();
  const reports = useReportList();
  const reportItems = reports.data?.pages.flatMap((page) => page.items) ?? [];
  const hasReports = reportItems.length > 0;
  const [llmSheetOpen, setLlmSheetOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadFile[]>([]);
  // Set once the upload is accepted and queued. The waiting screen then follows the report's status.
  const [reportId, setReportId] = useState<string | null>(null);

  async function onPick() {
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

    startUpload(files);
  }

  function startUpload(files: UploadFile[]) {
    upload.mutate(
      { files },
      {
        onSuccess: (result) => {
          // Same file uploaded before: the existing report is returned, so show its interpretation directly.
          if (result.duplicate) {
            router.replace({ pathname: '/(app)/reports/interpretation/[id]', params: { id: result.report_id } });
            return;
          }
          setReportId(result.report_id);
        },
        onError: (err) => {
          // Reading a lab report uses the AI service, so llm_processing consent is needed first.
          if (isApiError(err, 'llm_consent_required')) {
            setPendingFiles(files);
            setLlmSheetOpen(true);
          }
        },
      },
    );
  }

  async function onAllowLlm() {
    try {
      await grantLlm.mutateAsync();
    } catch {
      return; // The sheet stays open so the user can try again.
    }
    setLlmSheetOpen(false);
    startUpload(pendingFiles);
  }

  const error = upload.error;
  const needsLlmConsent = isApiError(error, 'llm_consent_required');
  const message = needsLlmConsent
    ? null
    : isApiError(error)
      ? ERROR_TEXT[error.code] ?? error.message
      : error
        ? 'Upload failed. Try again.'
        : null;

  if (reportId) {
    return <UploadWaiting reportId={reportId} onLater={() => router.replace('/(app)/(tabs)/dashboard')} />;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../../shared/assets/images/reovita-sprout.png')}
              style={styles.brandMark}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Reovita</Text>
          </View>
          <Text style={styles.title}>{hasReports ? 'Your Reports' : 'Your First Report'}</Text>
          <Text style={styles.subtitle}>
            {hasReports ? 'Upload another lab report to get instant interpretation.' : 'Upload a lab report to get instant interpretation'}
          </Text>
        </View>
        {hasReports ? null : (
          <View style={styles.headerRight}>
            <StepHeaderBadge step={4} size={82} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ReportDropZone onChoose={onPick} disabled={upload.isPending} />
        {hasReports ? (
          <View style={styles.listWrap}>
            <ReportList
              items={reportItems}
              hasMore={reports.hasNextPage}
              loadingMore={reports.isFetchingNextPage}
              onLoadMore={() => void reports.fetchNextPage()}
              onOpen={(id) => router.push({ pathname: '/(app)/reports/interpretation/[id]', params: { id } })}
            />
          </View>
        ) : null}
        {upload.isPending ? <Text style={styles.uploading}>Uploading and scanning report...</Text> : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </View>
      <LlmConsentSheet
        visible={llmSheetOpen}
        pending={grantLlm.isPending}
        onAllow={onAllowLlm}
        onDecline={() => setLlmSheetOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 8,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  brandMark: {
    width: 28,
    height: 24,
  },
  brandName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#1B152B',
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: '#1B152B',
    marginTop: 2,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#655F74',
  },
  body: {
    marginTop: 18,
    marginBottom: 24,
  },
  listWrap: {
    marginTop: 20,
  },
  uploading: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#7545ED',
    textAlign: 'center',
    marginTop: 16,
  },
  error: {
    fontFamily: 'Poppins_400Regular',
    color: '#C22F43',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
  },
});
