import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { InteractionCheck, InteractionFinding } from '@entities/interaction-finding';
import { usePalette, type Palette } from '@shared/ui/theme';

const SEVERITY_ORDER = ['Contraindicated', 'Major', 'Moderate', 'Minor'];

function severityBadge(severity: string) {
  const s = severity.toLowerCase();
  if (s.includes('contraindicat')) return { bg: '#FEE2E2', border: '#EF4444', text: '#B91C1C', label: 'Contraindicated' };
  if (s.includes('major')) return { bg: '#FFEDD5', border: '#F97316', text: '#C2410C', label: 'Major' };
  if (s.includes('moderat')) return { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309', label: 'Moderate' };
  return { bg: '#E0F2FE', border: '#38BDF8', text: '#0369A1', label: 'Minor' };
}

// The outcome of a check, with what was actually checked: an unavailable check never looks like a safe result.
export function InteractionResult({ data }: { data: InteractionCheck }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const groups = useMemo(() => groupBySeverity(data.findings), [data.findings]);
  const hasFindings = data.status === 'findings';
  const isSafe = data.status === 'no_findings';

  const tone = hasFindings ? p.red : isSafe ? '#10B981' : p.muted;
  const icon: keyof typeof Ionicons.glyphMap =
    hasFindings ? 'warning' : isSafe ? 'checkmark-circle' : 'information-circle';

  return (
    <View style={styles.container}>
      {/* Top Verdict Card */}
      <View
        style={[
          styles.verdictCard,
          {
            borderColor: tone,
            backgroundColor: hasFindings ? p.redSoft : isSafe ? p.accentSoft : p.card,
          },
        ]}>
        <View style={styles.verdictRow}>
          <View style={[styles.verdictIconCircle, { backgroundColor: hasFindings ? p.redSoft : isSafe ? p.accentSoft : p.surface }]}>
            <Ionicons name={icon} size={22} color={tone} />
          </View>
          <View style={styles.verdictTextCol}>
            <Text style={[styles.verdictTitle, { color: tone }]}>
              {hasFindings ? 'Interactions Detected' : isSafe ? 'No Known Interactions' : 'Check Status'}
            </Text>
            <Text style={[styles.verdictMessage, { color: p.text }]}>{data.message}</Text>
          </View>
        </View>

        {data.unmatched_medications.length > 0 ? (
          <View style={[styles.unmatchedBox, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Ionicons name="help-circle-outline" size={16} color={p.muted} />
            <Text style={[styles.unmatchedText, { color: p.muted }]}>
              Not checked (unmatched in clinical database): {data.unmatched_medications.join(', ')}.
            </Text>
          </View>
        ) : null}
      </View>

      {/* Severity Groups */}
      {groups.map(([severity, items]) => {
        const badge = severityBadge(severity);
        return (
          <View key={severity} style={[styles.severityCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.severityHeader}>
              <View style={[styles.severityPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={[styles.severityPillText, { color: badge.text }]}>{badge.label}</Text>
              </View>
              <Text style={[styles.itemCountText, { color: p.muted }]}>
                {items.length} {items.length === 1 ? 'finding' : 'findings'}
              </Text>
            </View>

            {items.map((f, index) => (
              <View
                key={`${f.medication_a}-${f.medication_b}-${index}`}
                style={[styles.findingItem, index > 0 && { borderTopWidth: 1, borderTopColor: p.border }]}>
                <View style={styles.pairRow}>
                  <View style={[styles.medBadge, { backgroundColor: p.surface, borderColor: p.border }]}>
                    <Ionicons name="medkit-outline" size={13} color={p.accent} />
                    <Text numberOfLines={1} style={[styles.medBadgeText, { color: p.textStrong }]}>
                      {f.medication_a}
                    </Text>
                  </View>
                  <Text style={[styles.pairPlus, { color: p.muted }]}>+</Text>
                  <View style={[styles.medBadge, { backgroundColor: p.surface, borderColor: p.border }]}>
                    <Ionicons name="medkit-outline" size={13} color={p.accent} />
                    <Text numberOfLines={1} style={[styles.medBadgeText, { color: p.textStrong }]}>
                      {f.medication_b}
                    </Text>
                  </View>
                </View>
                {f.mechanism ? (
                  <Text style={[styles.mechanismText, { color: p.text }]}>{f.mechanism}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function groupBySeverity(findings: InteractionFinding[]): [string, InteractionFinding[]][] {
  const map = new Map<string, InteractionFinding[]>();
  for (const f of findings) map.set(f.severity, [...(map.get(f.severity) ?? []), f]);
  return [...map.entries()].sort(([a], [b]) => {
    const ia = SEVERITY_ORDER.indexOf(a);
    const ib = SEVERITY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { gap: 12, marginTop: 4 },
    verdictCard: {
      borderRadius: 20,
      borderWidth: 1.5,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    verdictRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    verdictIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    verdictTextCol: { flex: 1, gap: 3 },
    verdictTitle: { fontSize: 16, fontWeight: '800' },
    verdictMessage: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    unmatchedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
    },
    unmatchedText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
    severityCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    severityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    severityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    severityPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    itemCountText: { fontSize: 12.5, fontWeight: '600' },
    findingItem: { gap: 8, paddingTop: 10 },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    medBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      maxWidth: '45%',
    },
    medBadgeText: { fontSize: 13, fontWeight: '700' },
    pairPlus: { fontSize: 14, fontWeight: '800' },
    mechanismText: { fontSize: 13.5, lineHeight: 19 },
  });
}
