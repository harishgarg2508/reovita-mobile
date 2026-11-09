import { useRouter } from 'expo-router';
import { goBackOr } from '@shared/ui';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReportInterpretation } from '@entities/report';
import { isApiError } from '@shared/api';
import { DISCLAIMER_V1 } from '@shared/config/constants';
import { Chip } from '@shared/ui/chip';
import { Skeleton } from '@shared/ui/skeleton';

const STATUS_COLOR: Record<string, string> = {
  Normal: '#3D5500',
  Watch: '#8A6A12',
  High: '#C22F43',
  Low: '#C22F43',
  Critical: '#C22F43',
};

// Interpretation of one report, read directly from GET /v1/health/reports/{id}/interpretation.
export function InterpretationScreen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const interpretation = useReportInterpretation(reportId);

  // No interpretation yet: the report still has to be confirmed. Open the review screen to do that.
  const notConfirmed = isApiError(interpretation.error, 'interpretation_not_found');
  useEffect(() => {
    if (notConfirmed) {
      router.replace({ pathname: '/(app)/reports/[id]', params: { id: reportId } });
    }
  }, [notConfirmed, reportId, router]);

  const output = interpretation.data?.output_json;
  const explanations = (output?.explanations ?? []) as { text: string; status?: string; biomarker_code?: string }[];

  const errorText = interpretation.isError
    ? isApiError(interpretation.error, 'interpretation_not_found')
      ? 'This report has no explanation yet.'
      : isApiError(interpretation.error, 'report_not_found')
        ? 'This report could not be found.'
        : 'We could not load the explanation. Try again.'
    : null;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Interpretation</Text>
        <View style={styles.backBtn} />
      </View>

      {interpretation.isLoading ? (
        <>
          <Skeleton height={96} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </>
      ) : null}

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      {output?.summary ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.body}>{output.summary}</Text>
        </View>
      ) : null}

      {explanations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          {explanations.map((item, index) => (
            <View key={`${item.biomarker_code ?? 'item'}-${index}`} style={styles.card}>
              {item.status || item.biomarker_code ? (
                <View style={styles.cardHeader}>
                  {item.status ? (
                    <Text style={[styles.status, { color: STATUS_COLOR[item.status] ?? '#171717' }]}>{item.status}</Text>
                  ) : null}
                  {item.biomarker_code ? (
                    <Chip label={item.biomarker_code} selected={false} onPress={() => undefined} />
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.body}>{item.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {output?.action_points && output.action_points.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to do next</Text>
          {output.action_points.map((point, index) => (
            <View key={`${index}-${point}`} style={styles.card}>
              <Text style={styles.body}>{point}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {interpretation.data ? <Text style={styles.disclaimer}>{DISCLAIMER_V1}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
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
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEAEF',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  code: {
    fontSize: 12,
    fontWeight: '600',
    color: '#655F74',
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3B3F47',
  },
  error: {
    fontSize: 14,
    color: '#C22F43',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8E929A',
    marginTop: 8,
  },
});
