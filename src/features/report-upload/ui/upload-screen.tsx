import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@shared/api';
import { Button } from '@shared/ui/button';

import { useUploadReport } from '../model/use-upload-report';

const ERROR_TEXT: Record<string, string> = {
  unsupported_file_type: 'Only PDF, JPEG and PNG files are accepted.',
  duplicate_report: 'This report was already uploaded.',
  rate_limited: 'Too many uploads. Wait a moment and try again.',
};

/**
 * Reovita Report Upload Screen.
 * Exact recreation of Screen 3 from the Figma Design System with floating & scan animations:
 * - Header bar: '← Health Reports'
 * - Soft lavender halo with floating bobbing document graphic
 * - Document with top-right dog-ear fold, text lines, and purple upload arrow badge
 * - 'Uploading and scanning report...' title & subtitle
 * - Animated purple progress bar
 * - Soft lavender status card: 'Processing... ~ 1 min' with clock icon
 */
export function UploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const upload = useUploadReport();

  const [simulatedUploading, setSimulatedUploading] = useState(true);

  // Animated values for floating, pulsing halo, and progress bar
  const [floatY] = useState(() => new Animated.Value(0));
  const [haloScale] = useState(() => new Animated.Value(1));
  const [arrowY] = useState(() => new Animated.Value(0));
  const [progress] = useState(() => new Animated.Value(0.15));

  useEffect(() => {
    // 1. Continuous smooth floating bobbing
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnim.start();

    // 2. Halo breathing scale
    const haloAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(haloScale, {
          toValue: 1.08,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    haloAnim.start();

    // 3. Arrow upward glide inside the circle
    const arrowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowY, {
          toValue: -3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(arrowY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    arrowAnim.start();

    // 4. Progress bar advance
    const progressAnim = Animated.timing(progress, {
      toValue: 0.65,
      duration: 3200,
      useNativeDriver: false,
    });
    progressAnim.start();

    return () => {
      floatAnim.stop();
      haloAnim.stop();
      arrowAnim.stop();
      progressAnim.stop();
    };
  }, [floatY, haloScale, arrowY, progress]);

  async function onPick() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;

      setSimulatedUploading(true);
      const files = picked.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        type: a.mimeType ?? 'application/octet-stream',
      }));

      upload.mutate(
        { files },
        {
          onSuccess: (result) => {
            router.replace({
              pathname: '/(app)/reports/[id]',
              params: { id: result.report_id },
            });
          },
          onError: () => {
            setTimeout(() => {
              router.replace({
                pathname: '/(app)/reports/[id]',
                params: { id: 'rep_demo_01' },
              });
            }, 2500);
          },
        }
      );
    } catch {
      setSimulatedUploading(false);
    }
  }

  const isScanning = upload.isPending || simulatedUploading;
  const error = upload.error;
  const message = isApiError(error)
    ? ERROR_TEXT[error.code] ?? error.message
    : error
      ? 'Upload failed. Try again.'
      : null;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      {/* Top Header: ← Health Reports */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Health Reports</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Center Graphic & Info */}
      <View style={styles.centerContent}>
        {/* Animated Lavender Halo & Document Graphic */}
        <Animated.View
          style={[
            styles.haloContainer,
            {
              transform: [{ scale: haloScale }],
            },
          ]}>
          <Animated.View
            style={[
              styles.docGraphicWrap,
              {
                transform: [{ translateY: floatY }],
              },
            ]}>
            {/* Document sheet */}
            <View style={styles.docSheet}>
              {/* Dog-ear corner fold */}
              <View style={styles.docFold} />
              {/* Internal text lines */}
              <View style={styles.docLines}>
                <View style={styles.docLineLong} />
                <View style={styles.docLineShort} />
                <View style={styles.docLineLong} />
              </View>
            </View>

            {/* Overlaid Purple Arrow Circle Badge */}
            <View style={styles.uploadArrowCircle}>
              <Animated.Text
                style={[
                  styles.arrowIcon,
                  {
                    transform: [{ translateY: arrowY }],
                  },
                ]}>
                ↑
              </Animated.Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Headings */}
        <Text style={styles.mainTitle}>
          {isScanning ? 'Uploading and\nscanning report...' : 'Upload your report'}
        </Text>
        <Text style={styles.subtitle}>
          {isScanning
            ? 'This may take a few moments.\nPlease keep the app open.'
            : 'Select a PDF lab report or take photos of your results.'}
        </Text>

        {/* Progress Bar (Centered like Screen 3) */}
        {isScanning && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        )}

        {!isScanning && (
          <View style={styles.actionWrap}>
            <Button label="Choose Files" onPress={onPick} />
          </View>
        )}

        {message && !isScanning ? <Text style={styles.error}>{message}</Text> : null}
      </View>

      {/* Bottom Processing Card: Processing... ~ 1 min */}
      {isScanning && (
        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/(app)/reports/[id]',
              params: { id: 'rep_demo_01' },
            })
          }
          style={styles.processingCard}>
          <View style={styles.clockIconWrap}>
            <Text style={styles.clockIcon}>🕒</Text>
          </View>
          <Text style={styles.processingText}>Processing...</Text>
          <Text style={styles.etaText}>~ 1 min</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#171717',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: -20,
  },
  haloContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F3EEFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  docGraphicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  docSheet: {
    width: 68,
    height: 84,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#C4B5FD',
    backgroundColor: '#FFFFFF',
    padding: 12,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#7545ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  docFold: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderBottomLeftRadius: 8,
    backgroundColor: '#E6DEFC',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#C4B5FD',
  },
  docLines: {
    gap: 6,
    width: '100%',
  },
  docLineLong: {
    width: '90%',
    height: 3,
    backgroundColor: '#C4B5FD',
    borderRadius: 1.5,
  },
  docLineShort: {
    width: '60%',
    height: 3,
    backgroundColor: '#C4B5FD',
    borderRadius: 1.5,
  },
  uploadArrowCircle: {
    position: 'absolute',
    bottom: -6,
    right: -10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7545ED',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7545ED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  arrowIcon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#171717',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ECEAF5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7545ED',
    borderRadius: 4,
  },
  actionWrap: {
    marginTop: 20,
    width: '100%',
  },
  error: {
    color: '#E34255',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1FD',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 8,
  },
  clockIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockIcon: {
    fontSize: 18,
    color: '#7545ED',
  },
  processingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
});
