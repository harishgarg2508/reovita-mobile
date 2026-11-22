import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { useSocialConsistency, useSocialRecap } from '@entities/social';

import { ShareCardSheet } from './share-card-sheet';

// 14 weeks of days, one column a week with Monday at the top, like a contribution grid. (98 days).
const WEEKS = 14;
const GAP = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Today in India as YYYY-MM-DD, the same day the server counts check-ins on.
function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const shift = (day: string, delta: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);

// The consistency of one person: streak and totals, 14-week activity contribution grid, and earned badges.
export function ConsistencyCard({ handle, canShare = false }: { handle: string; canShare?: boolean }) {
  const p = usePalette();
  const consistency = useSocialConsistency(handle);
  const data = consistency.data;
  const [sharing, setSharing] = useState<'streak' | 'recap' | null>(null);
  const recap = useSocialRecap(canShare);

  const columns = useMemo(() => {
    const today = istToday();
    const counts = new Map((data?.days ?? []).map((d) => [d.day, d.count]));
    // Monday of this week (0 = Monday ... 6 = Sunday).
    const weekday = (new Date(Date.parse(`${today}T00:00:00Z`)).getUTCDay() + 6) % 7;
    const thisMonday = shift(today, -weekday);
    return Array.from({ length: WEEKS }, (_, col) =>
      Array.from({ length: 7 }, (_, row) => {
        const day = shift(thisMonday, -(WEEKS - 1 - col) * 7 + row);
        return { day, future: day > today, count: counts.get(day) ?? 0 };
      }),
    );
  }, [data]);

  if (!data) return null;

  const shade = (count: number) =>
    count <= 0 ? (p.text === '#FFFFFF' ? '#222038' : '#E8E5F2') : count === 1 ? '#9ED9B8' : count === 2 ? '#4DB482' : '#1F7A4D';

  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
      {/* 4 Athletic Stat Blocks */}
      <View style={styles.stats}>
        <Stat icon="flame" color="#E8762B" value={data.streak} label="Streak" />
        <Stat icon="trophy-outline" color="#F59E0B" value={data.best_streak} label="Best" />
        <Stat icon="calendar-outline" color={p.accent} value={data.active_days} label="Days" />
        <Stat icon="checkmark-done-outline" color={p.accent} value={data.total_check_ins} label="Check-ins" />
      </View>

      {/* 14-Week Activity Heatmap */}
      <View style={styles.gridSection}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>14-Week Activity</Text>
        <View style={styles.grid} accessibilityLabel="Check-ins over the last 14 weeks">
          {columns.map((column, c) => (
            <View key={c} style={styles.column}>
              {column.map((cell) => (
                <View
                  key={cell.day}
                  style={[
                    styles.cell,
                    { backgroundColor: cell.future ? 'transparent' : shade(cell.count) },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Badges */}
      {data.badges.length > 0 ? (
        <View style={styles.badgesSection}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges}>
            {data.badges.map((badge) => (
              <View key={badge.key} style={[styles.badge, { backgroundColor: p.accentSoft }]}>
                <Ionicons name="ribbon-outline" size={14} color={p.accent} />
                <Text style={[styles.badgeText, { color: p.accent }]}>{badge.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Share Actions */}
      {canShare ? (
        <View style={styles.shareRow}>
          {data.streak > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapSelection();
                setSharing('streak');
              }}
              style={[styles.shareBtn, { borderColor: p.border, backgroundColor: p.surface }]}>
              <Ionicons name="share-outline" size={15} color={p.accent} />
              <Text style={[styles.shareText, { color: p.accent }]}>Share streak</Text>
            </Pressable>
          ) : null}
          {recap.data && recap.data.active_days > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapSelection();
                setSharing('recap');
              }}
              style={[styles.shareBtn, { borderColor: p.border, backgroundColor: p.surface }]}>
              <Ionicons name="calendar-outline" size={15} color={p.accent} />
              <Text style={[styles.shareText, { color: p.accent }]}>Share recap</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ShareCardSheet
        card={
          sharing === 'streak'
            ? { kind: 'streak', handle, streak: data.streak, best: data.best_streak, total: data.total_check_ins }
            : sharing === 'recap' && recap.data
              ? { kind: 'recap', handle, recap: recap.data }
              : null
        }
        onClose={() => setSharing(null)}
      />
    </View>
  );
}

function Stat({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: number;
  label: string;
}) {
  const p = usePalette();
  return (
    <View style={[styles.statBox, { backgroundColor: p.surface, borderColor: p.border }]}>
      <View style={styles.statTop}>
        <Ionicons name={icon} size={15} color={color} />
        <Text style={[styles.statValue, { color: p.text }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: p.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  // The 14 weeks share the whole width: each column takes an equal part, and each square fills its column and stays square.
  grid: {
    flexDirection: 'row',
    gap: GAP,
    alignSelf: 'stretch',
    paddingVertical: 4,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  cell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 3.5,
  },
  badgesSection: {
    gap: 8,
  },
  badges: {
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 28,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
