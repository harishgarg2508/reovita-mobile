import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette, type Palette } from '@shared/ui/theme';
import { ConfirmDialog } from '@shared/ui';
import { useActiveConsent, useGrantConsentType } from '@entities/consent';

import { useBriefingLive } from '../model/use-briefing-live';
import { formatCoords, useCurrentPlace } from '../model/current-place';
import { shareLocationForBriefing } from '../model/share-location';
import type { BriefingCard, BriefingRow } from '../model/briefing-api';

// Daily environmental briefing: today's cards, a table of saved briefings, and live updates over SSE.
export function BriefingPage() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { today, history, refresh } = useBriefingLive();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const locationConsent = useActiveConsent('location');
  const grantConsent = useGrantConsentType();
  // The place name is read from the phone once the location is shared.
  const place = useCurrentPlace(today.isSuccess && !today.data?.needsLocation);

  // Location is stored only after the user agrees to the location consent (DPDP). The browser or phone
  // permission prompt appears after that, when the device location is read.
  function onShareLocation() {
    setShareError(null);
    if (locationConsent.granted) {
      void saveLocation();
      return;
    }
    setConsentOpen(true);
  }

  async function agreeAndShare() {
    setConsentOpen(false);
    try {
      await grantConsent.mutateAsync('location');
    } catch {
      setShareError('Could not record your consent. Try again.');
      return;
    }
    await saveLocation();
  }

  async function saveLocation() {
    setSharing(true);
    try {
      const shared = await shareLocationForBriefing();
      if (!shared) {
        setShareError('Location is off. Allow it to get your daily briefing.');
        return;
      }
      refresh();
    } catch {
      setShareError('Could not save your location. Try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={styles.title}>Daily briefing</Text>
      </View>
      <Text style={styles.subtitle}>What the air quality, UV and heat mean for you today.</Text>

      {today.data?.location ? (
        <View style={styles.placeCard}>
          <View style={styles.placeIcon}>
            <Ionicons name="location" size={20} color={p.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.placeName}>{place.data?.name ?? 'Your area'}</Text>
            <Text style={styles.body}>{formatCoords(today.data.location.lat, today.data.location.lng)}</Text>
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={consentOpen}
        title="Use your location?"
        message="Reovita uses your location to make your daily air quality, UV and heat briefing. We store it rounded to about 1 km, and you can withdraw this consent at any time in your profile."
        confirmLabel="Agree and share"
        destructive={false}
        busy={grantConsent.isPending}
        onConfirm={() => void agreeAndShare()}
        onCancel={() => setConsentOpen(false)}
      />

      {today.isPending ? (
        <ActivityIndicator color={p.accent} />
      ) : today.data?.needsLocation ? (
        <View style={styles.card}>
          <Ionicons name="location-outline" size={28} color={p.accent} />
          <Text style={styles.body}>Share your location to get the briefing for where you are.</Text>
          <Pressable accessibilityRole="button" onPress={onShareLocation} disabled={sharing} style={styles.primaryBtn}>
            {sharing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Share my location</Text>}
          </Pressable>
          {shareError ? <Text style={styles.error}>{shareError}</Text> : null}
        </View>
      ) : today.isError ? (
        <View style={styles.card}>
          <Text style={styles.body}>We could not load today&apos;s briefing. It updates automatically.</Text>
        </View>
      ) : !today.data?.morning && !today.data?.night ? (
        <View style={styles.card}>
          <Ionicons name="cloud-offline-outline" size={28} color={p.muted} />
          <Text style={styles.body}>Briefing unavailable right now. It will update automatically.</Text>
        </View>
      ) : (
        <>
          {today.data.morning ? <TodayCard title="Morning" card={today.data.morning} styles={styles} /> : null}
          {today.data.night ? <TodayCard title="Night" card={today.data.night} styles={styles} /> : null}
        </>
      )}

      <Text style={styles.sectionLabel}>Saved briefings</Text>
      <View style={styles.table}>
        <View style={[styles.tr, styles.thead]}>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colKind]}>Time</Text>
          <Text style={[styles.th, styles.colLevel]}>Level</Text>
          <Text style={[styles.th, styles.colHead]}>Summary</Text>
        </View>
        {history.isPending ? <ActivityIndicator color={p.accent} style={styles.pad} /> : null}
        {history.data?.length === 0 ? <Text style={styles.empty}>No saved briefings yet.</Text> : null}
        {(history.data ?? []).map((row) => (
          <HistoryRow key={`${row.date}-${row.kind}`} row={row} styles={styles} p={p} />
        ))}
      </View>
    </ScrollView>
  );
}

const SEVERITY: Record<BriefingCard['severity'], { label: string; fg: string; bg: string }> = {
  info: { label: 'Good', fg: '#1F7A3E', bg: '#E3F6E9' },
  caution: { label: 'Caution', fg: '#B26A00', bg: '#FFF4E0' },
  high: { label: 'High', fg: '#C22F43', bg: '#FDECEE' },
};

function TodayCard({ title, card, styles }: { title: string; card: BriefingCard; styles: Styles }) {
  const tone = SEVERITY[card.severity];
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.kind}>{title}</Text>
        <View style={[styles.chip, { backgroundColor: tone.bg }]}>
          <Text style={[styles.chipText, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>
      <Text style={styles.headline}>{card.headline}</Text>
      <Text style={styles.body}>{card.body}</Text>
    </View>
  );
}

// One saved row. Tap to show the numbers the card was built from.
function HistoryRow({ row, styles, p }: { row: BriefingRow; styles: Styles; p: Palette }) {
  const [open, setOpen] = useState(false);
  const tone = SEVERITY[row.card.severity];
  const s = row.card.snapshot;
  const details: [string, string | null][] = [
    ['US AQI', s.aqi != null ? String(s.aqi) : null],
    ['PM2.5', s.pm25 != null ? `${s.pm25} µg/m³` : null],
    ['PM10', s.pm10 != null ? `${s.pm10} µg/m³` : null],
    ['NO₂', s.no2 != null ? `${s.no2} µg/m³` : null],
    ['O₃', s.o3 != null ? `${s.o3} µg/m³` : null],
    ['SO₂', s.so2 != null ? `${s.so2} µg/m³` : null],
    ['CO', s.co != null ? `${s.co} µg/m³` : null],
    ['UV index', s.uv_index != null ? String(s.uv_index) : null],
    ['Temperature', s.temperature_c != null ? `${s.temperature_c} °C` : null],
    ['Feels like', s.feels_like_c != null ? `${s.feels_like_c} °C` : null],
    ['Humidity', s.humidity != null ? `${s.humidity}%` : null],
  ];
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={styles.tr}>
      <Text style={[styles.td, styles.colDate]}>{row.date.slice(5)}</Text>
      <Text style={[styles.td, styles.colKind]}>{row.kind === 'night' ? 'Night' : 'Morning'}</Text>
      <View style={styles.colLevel}>
        <View style={[styles.chip, { backgroundColor: tone.bg }]}>
          <Text style={[styles.chipText, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>
      <View style={styles.colHead}>
        <Text style={styles.td}>{row.card.headline}</Text>
        {open ? (
          <View style={styles.details}>
            <Text style={styles.body}>{row.card.body}</Text>
            {details
              .filter(([, v]) => v !== null)
              .map(([label, value]) => (
                <Text key={label} style={styles.detailLine}>
                  {label}: <Text style={{ color: p.textStrong }}>{value}</Text>
                </Text>
              ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    container: { paddingHorizontal: 16, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 26, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: p.textStrong, marginTop: 6 },
    card: { backgroundColor: p.card, borderRadius: 20, borderWidth: 1, borderColor: p.border, padding: 16, gap: 10 },
    placeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.card, borderRadius: 20, borderWidth: 1, borderColor: p.border, padding: 14 },
    placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    placeName: { fontSize: 17, fontWeight: '800', color: p.textStrong },
    flex: { flex: 1 },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kind: { fontSize: 13, fontWeight: '700', color: p.muted },
    headline: { fontSize: 16, fontWeight: '800', color: p.textStrong },
    body: { fontSize: 13.5, lineHeight: 19, color: p.muted },
    chip: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
    chipText: { fontSize: 12, fontWeight: '700' },
    primaryBtn: { height: 46, borderRadius: 16, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    error: { fontSize: 13, color: p.red },
    table: { backgroundColor: p.card, borderRadius: 18, borderWidth: 1, borderColor: p.border, overflow: 'hidden' },
    tr: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
      gap: 6,
    },
    thead: { backgroundColor: p.surface, borderTopWidth: 0 },
    th: { fontSize: 11.5, fontWeight: '700', color: p.muted },
    td: { fontSize: 12.5, color: p.textStrong },
    colDate: { width: 48 },
    colKind: { width: 62 },
    colLevel: { width: 62 },
    colHead: { flex: 1, gap: 4 },
    details: { gap: 4, marginTop: 6 },
    detailLine: { fontSize: 12.5, color: p.muted },
    empty: { fontSize: 13, color: p.muted, padding: 14 },
    pad: { padding: 14 },
  });
}
