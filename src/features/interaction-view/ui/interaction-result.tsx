import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { InteractionCheck, InteractionFinding } from '@entities/interaction-finding';
import { usePalette, type Palette } from '@shared/ui/theme';

const SEVERITY_ORDER = ['Contraindicated', 'Major', 'Moderate', 'Minor'];

// The outcome of a check, with what was actually checked: an unavailable check never looks like a safe result. Used for the person's own list and for a lookup of two medicines.
export function InteractionResult({ data }: { data: InteractionCheck }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const groups = useMemo(() => groupBySeverity(data.findings), [data.findings]);
  const tone = data.status === 'findings' ? p.red : data.status === 'no_findings' ? p.accent : p.muted;
  const icon: keyof typeof Ionicons.glyphMap =
    data.status === 'findings' ? 'warning' : data.status === 'no_findings' ? 'checkmark-circle' : 'information-circle';

  return (
    <>
      <View style={[styles.card, { borderColor: tone }]}>
        <View style={styles.statusRow}>
          <Ionicons name={icon} size={20} color={tone} />
          <Text style={[styles.statusText, { color: tone }]}>{data.message}</Text>
        </View>
        {data.unmatched_medications.length > 0 ? (
          <Text style={styles.muted}>
            Not checked, because we could not match them yet: {data.unmatched_medications.join(', ')}.
          </Text>
        ) : null}
      </View>

      {groups.map(([severity, items]) => (
        <View key={severity} style={styles.card}>
          <Text style={styles.cardTitle}>{severity}</Text>
          {items.map((f, index) => (
            <View key={`${f.medication_a}-${f.medication_b}-${index}`} style={styles.finding}>
              <Text style={styles.pair}>
                {f.medication_a} + {f.medication_b}
              </Text>
              {f.mechanism ? <Text style={styles.muted}>{f.mechanism}</Text> : null}
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.disclaimer}>{data.disclaimer}</Text>
    </>
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
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: p.textStrong },
    statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    statusText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    muted: { fontSize: 12.5, color: p.muted, lineHeight: 18 },
    finding: { gap: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    pair: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    disclaimer: { fontSize: 12.5, color: p.muted, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  });
}
