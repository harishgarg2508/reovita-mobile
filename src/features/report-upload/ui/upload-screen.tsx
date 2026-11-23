import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useMemo } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LlmConsentSheet, useGrantLlmConsent } from '@entities/consent';
import { isDocumentReport, useReportList, type ReportType } from '@entities/report';
import { isApiError } from '@shared/api';
import { ReportDropZone } from '@shared/ui/report-drop-zone';
import { usePalette } from '@shared/ui/theme';
import { StepHeaderBadge } from '@shared/ui/step-header-badge';

import { useUploadReport } from '../model/use-upload-report';
import { Skeleton } from '@shared/ui/skeleton';
import { ReportList } from './report-list';
import { ReportTypeSheet } from './report-type-sheet';
import { UploadWaiting } from './upload-waiting';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

const ERROR_TEXT: Record<string, string> = {
  unsupported_file_type: 'Only PDF, JPEG and PNG files are accepted.',
  duplicate_report: 'This report was already uploaded.',
  rate_limited: 'Too many uploads. Wait a moment and try again.',
};

type UploadFile = { uri: string; name: string; type: string };
// What the person said they are uploading, kept with the files while the consent sheet or the upload is in progress.
type UploadKind = { reportType: ReportType; typeLabel: string };

// Upload screen with the same layout as onboarding Step 4 ("Your First Report").
export function UploadScreen({ autoPick = false }: { autoPick?: boolean }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const upload = useUploadReport();
  const p = usePalette();
  const [infoOpen, setInfoOpen] = useState(false);

  // Asks what is being uploaded. The file picker opens only once a type is chosen.
  // Open from the start when the screen is reached from "Choose file".
  const [typeSheetOpen, setTypeSheetOpen] = useState(autoPick);
  const [kind, setKind] = useState<UploadKind>({ reportType: 'blood_report', typeLabel: '' });
  const grantLlm = useGrantLlmConsent();
  const reports = useReportList();
  const reportItems = reports.data?.pages.flatMap((page) => page.items) ?? [];
  const hasReports = reportItems.length > 0;
  const [llmSheetOpen, setLlmSheetOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadFile[]>([]);
  // Set once the upload is accepted and queued. The waiting screen then follows the report's status.
  const [reportId, setReportId] = useState<string | null>(null);

  // Opening the screen always shows the upload area and the report list. The waiting view is only for an upload
  // made on this visit, so it is cleared each time the screen gains focus.
  useFocusEffect(useCallback(() => setReportId(null), []));

  async function onPick(chosen: UploadKind) {
    setKind(chosen);
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

    startUpload(files, chosen);
  }

  function startUpload(files: UploadFile[], chosen: UploadKind) {
    upload.mutate(
      { files, reportType: chosen.reportType, typeLabel: chosen.typeLabel },
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
    startUpload(pendingFiles, kind);
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
    return <UploadWaiting reportId={reportId} readsAsDocument={isDocumentReport({ report_type: kind.reportType })} onLater={() => router.replace('/(app)/(tabs)/dashboard')} />;
  }

  return (
    // Fixed page: the header and upload area stay put. Only the reports list scrolls.
    <View
      style={[
        styles.container,
        {
          backgroundColor: p.bg,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        },
      ]}>
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../../../assets/images/app-icon/reovita-logo.webp')}
              style={styles.brandMark}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, { color: p.text }]}>Reovita</Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: p.text }]}>{hasReports ? 'Your reports' : 'Your first report'}</Text>
            {hasReports ? (
              <Pressable accessibilityRole="button" accessibilityLabel="About your reports" onPress={() => setInfoOpen(true)} hitSlop={8}>
                <Ionicons name="information-circle-outline" size={22} color={p.muted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.subtitle, { color: p.muted }]}>
            {hasReports ? 'Upload another lab report to get instant interpretation.' : 'Upload a lab report to get instant interpretation'}
          </Text>
        </View>
        {hasReports ? null : (
          <View style={styles.headerRight}>
            <StepHeaderBadge step={4} size={82} />
          </View>
        )}
      </View>

      <View style={[styles.body, styles.bodyFill]}>
        <ReportDropZone onChoose={() => setTypeSheetOpen(true)} disabled={upload.isPending} />
        {reports.isPending ? (
          <View style={[styles.listWrap, { gap: 10 }]}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        ) : null}
        {upload.isPending ? <Text style={styles.uploading}>Uploading and scanning report...</Text> : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
        {hasReports ? (
          <View style={styles.listFill}>
            {/* The ten most recent here. The full, paged list opens from "More". */}
            <ReportList
              items={reportItems.slice(0, 10)}
              hasMore={false}
              loadingMore={false}
              onLoadMore={() => undefined}
              onOpen={(id) => router.push({ pathname: '/(app)/reports/[id]', params: { id } })}
              footer={
                reportItems.length > 10 || reports.hasNextPage ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Show all reports"
                    onPress={() => router.push('/(app)/reports/list')}
                    style={[styles.moreRow, { borderColor: p.border }]}>
                    <Text style={[styles.moreText, { color: p.accent }]}>See all reports</Text>
                    <Ionicons name="chevron-forward" size={18} color={p.accent} />
                  </Pressable>
                ) : null
              }
            />
          </View>
        ) : null}
      </View>
      <ReportTypeSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        onChoose={(reportType, typeLabel) => {
          setTypeSheetOpen(false);
          void onPick({ reportType, typeLabel });
        }}
      />
      <LlmConsentSheet
        visible={llmSheetOpen}
        pending={grantLlm.isPending}
        onAllow={onAllowLlm}
        onDecline={() => setLlmSheetOpen(false)}
      />
      <Modal visible={infoOpen} animationType="fade" transparent onRequestClose={() => setInfoOpen(false)}>
        <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: p.card, borderColor: p.border }]} onPress={() => undefined}>
            <Text style={[styles.dialogTitle, { color: p.text }]}>Your reports are encrypted</Text>
            <Text style={[styles.dialogBody, { color: p.muted }]}>
              Every report is encrypted before it is stored, and only you can read it. It stays private and is never used for advertising.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setInfoOpen(false)} style={styles.dialogButton}>
              <Text style={styles.dialogButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    flexGrow: 1,
    backgroundColor: colors.card,
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
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  body: {
    marginTop: 18,
    marginBottom: 24,
  },
  bodyFill: {
    flex: 1,
    minHeight: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 12, 24, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as object) : {}), },
  dialog: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 22, gap: 12 },
  dialogTitle: { fontSize: 18, fontWeight: '800' },
  dialogBody: { fontSize: 14, lineHeight: 20 },
  dialogButton: { alignSelf: 'flex-end', paddingHorizontal: 18, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentFill },
  dialogButtonText: { fontSize: 14, fontWeight: '700', color: colors.onAccent },
  listWrap: {
    flex: 1,
    marginTop: 20,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moreText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  listFill: {
    flex: 1,
    minHeight: 0,
    marginTop: 20,
  },
  uploading: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.accent,
    textAlign: 'center',
    marginTop: 16,
  },
  error: {
    fontFamily: 'Poppins_400Regular',
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
  },
});
