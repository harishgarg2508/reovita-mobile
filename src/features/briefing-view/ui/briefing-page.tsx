import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@shared/ui';
import { useActiveConsent, useGrantConsentType } from '@entities/consent';

import { useBriefingLive } from '../model/use-briefing-live';
import { formatCoords, useCurrentPlace } from '../model/current-place';
import { shareLocationForBriefing } from '../model/share-location';
import type { BriefingCard } from '../model/briefing-api';
import { feelsLikeNote, fmt, place, SCALES, type Tone } from '../model/reading-labels';
import { AqiGauge } from './aqi-gauge';
import { AreaBanner } from './area-banner';
import { useBriefingColors, type BriefingColors } from './briefing-theme';
import { MetricTile } from './metric-tile';

const SEVERITY_TONE: Record<BriefingCard['severity'], Tone> = { info: 'good', caution: 'watch', high: 'high' };

// The six US AQI bands, for the "Learn more" list.
const AQI_GUIDE: { range: string; label: string; color: string }[] = [
  { range: '0–50', label: 'Good', color: '#2E9E5B' },
  { range: '51–100', label: 'Moderate', color: '#E0C22B' },
  { range: '101–150', label: 'Unhealthy for sensitive groups', color: '#E8742B' },
  { range: '151–200', label: 'Unhealthy', color: '#D6334A' },
  { range: '201–300', label: 'Very unhealthy', color: '#8E3A9D' },
  { range: '301 and above', label: 'Hazardous', color: '#7E1F3A' },
];

// The environmental briefing: where you are, the air quality dial, the weather readings, and today's guidance.
export function BriefingPage() {
  const colors = useBriefingColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { today, refresh } = useBriefingLive();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [learnMore, setLearnMore] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const tipY = useRef(0);
  // Morning guidance by day, night guidance in the evening and night. The user can switch.
  const [kind, setKind] = useState<'morning' | 'night' | null>(null);
  const locationConsent = useActiveConsent('location');
  const grantConsent = useGrantConsentType();
  // The place name is read from the phone once the location is shared.
  const place_ = useCurrentPlace(today.isSuccess && !today.data?.needsLocation);

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

  const morning = today.data?.morning ?? null;
  const night = today.data?.night ?? null;
  const hour = new Date().getHours();
  const defaultKind: 'morning' | 'night' = (hour >= 18 || hour < 5) && night ? 'night' : morning ? 'morning' : 'night';
  const shownKind = kind ?? defaultKind;
  const tip = shownKind === 'night' ? (night ?? morning) : (morning ?? night);
  // Both cards are built from the same reading, so the readings are shown once.
  const s = (morning ?? night)?.snapshot ?? null;

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Environmental Briefing</Text>
          <Text style={styles.subtitle}>{shownKind === 'night' ? 'Evening' : 'Morning'} atmospheric overview.</Text>
        </View>
        {morning && night ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Showing ${shownKind} guidance. Switch to ${shownKind === 'night' ? 'morning' : 'night'}`}
            onPress={() => setKind(shownKind === 'night' ? 'morning' : 'night')}
            style={styles.kindPill}>
            <MaterialCommunityIcons name={shownKind === 'night' ? 'weather-night' : 'weather-sunny'} size={15} color={colors.toneText.watch} />
            <Text style={styles.kindText}>{shownKind === 'night' ? 'Night' : 'Morning'}</Text>
          </Pressable>
        ) : null}
      </View>

      {today.data?.location ? (
        <AreaBanner name={place_.data?.name ?? 'Your area'} coords={formatCoords(today.data.location.lat, today.data.location.lng)} colors={colors} />
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
        <ActivityIndicator color={colors.accent} />
      ) : today.data?.needsLocation ? (
        <View style={styles.card}>
          <Ionicons name="location-outline" size={28} color={colors.accent} />
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
      ) : !s || !tip ? (
        <View style={styles.card}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
          <Text style={styles.body}>Briefing unavailable right now. It will update automatically.</Text>
        </View>
      ) : (
        <>
          {s.aqi != null ? <AirQualityCard aqi={s.aqi} colors={colors} styles={styles} open={learnMore} onToggle={() => setLearnMore((v) => !v)} onGuidance={() => scrollRef.current?.scrollTo({ y: Math.max(tipY.current - 12, 0), animated: true })} /> : null}

          <View style={styles.grid}>
            {s.uv_index != null ? <MetricTile label="UV Index" icon="weather-sunny" value={fmt.uv(s.uv_index)} scale="uv" raw={s.uv_index} colors={colors} /> : null}
            {s.temperature_c != null ? <MetricTile label="Temperature" icon="thermometer" value={fmt.celsius(s.temperature_c)} scale="temperature" raw={s.temperature_c} colors={colors} /> : null}
            {s.feels_like_c != null ? (
              <MetricTile label="Feels Like" icon="weather-windy" value={fmt.celsius(s.feels_like_c)} scale="feelsLike" raw={s.feels_like_c} colors={colors} note={feelsLikeNote(s.temperature_c, s.feels_like_c)} />
            ) : null}
            {s.humidity != null ? <MetricTile label="Humidity" icon="water-percent" value={fmt.percent(s.humidity)} scale="humidity" raw={s.humidity} colors={colors} /> : null}
          </View>
          {s.pm25 != null ? <MetricTile wide label="Fine Particulates (PM2.5)" icon="blur" value={fmt.micro(s.pm25)} scale="pm25" raw={s.pm25} colors={colors} /> : null}
          {s.pm10 != null ? <MetricTile wide label="Coarse Particulates (PM10)" icon="grain" value={fmt.micro(s.pm10)} scale="pm10" raw={s.pm10} colors={colors} /> : null}
          {[
            ['NO₂', s.no2],
            ['O₃', s.o3],
            ['SO₂', s.so2],
            ['CO', s.co],
          ].some(([, v]) => v != null) ? (
            <Text style={styles.gases}>
              {(
                [
                  ['NO₂', s.no2],
                  ['O₃', s.o3],
                  ['SO₂', s.so2],
                  ['CO', s.co],
                ] as [string, number | null | undefined][]
              )
                .filter(([, v]) => v != null)
                .map(([name, v]) => `${name} ${fmt.micro(v as number)}`)
                .join('  ·  ')}
            </Text>
          ) : null}

          <View onLayout={(e) => (tipY.current = e.nativeEvent.layout.y)}>
            <TipCard card={tip} kind={shownKind} colors={colors} styles={styles} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function AirQualityCard({ aqi, colors, styles, open, onToggle, onGuidance }: { aqi: number; colors: BriefingColors; styles: Styles; open: boolean; onToggle: () => void; onGuidance: () => void }) {
  const band = place(SCALES.aqi, aqi).band;
  return (
    <View style={styles.card}>
      <View style={styles.aqiRow}>
        <AqiGauge aqi={aqi} colors={colors} />
        <View style={styles.aqiText}>
          <View style={styles.aqiHead}>
            <Text style={styles.cardTitle}>Air Quality</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="About the air quality index" accessibilityState={{ expanded: open }} onPress={onToggle} hitSlop={8}>
              <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.body}>{band.sentence}</Text>
          <Pressable accessibilityRole="button" onPress={onGuidance} style={styles.outlineBtn}>
            <Text style={styles.outlineText}>Health Guidance</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent} />
          </Pressable>
        </View>
      </View>
      {open ? (
        <View style={styles.guide}>
          <Text style={styles.body}>The US Air Quality Index (AQI) runs from 0 to 500. The higher it is, the more people may notice effects, starting with sensitive groups.</Text>
          {AQI_GUIDE.map((row) => (
            <View key={row.label} style={styles.guideRow}>
              <View style={[styles.dot, { backgroundColor: row.color }]} />
              <Text style={[styles.body, styles.guideRange]}>{row.range}</Text>
              <Text style={[styles.body, styles.guideLabel]}>{row.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// The day's guidance, from the briefing rules, in a calm card with a shield and a divider.
function TipCard({ card, kind, colors, styles }: { card: BriefingCard; kind: 'morning' | 'night'; colors: BriefingColors; styles: Styles }) {
  const tone = SEVERITY_TONE[card.severity];
  return (
    <View style={[styles.tip, { backgroundColor: `${colors.tone[tone]}18`, borderColor: `${colors.tone[tone]}4D` }]}>
      <View style={[styles.tipIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MaterialCommunityIcons name={tone === 'good' ? 'shield-check-outline' : 'shield-half-full'} size={24} color={colors.toneText[tone]} />
      </View>
      <View style={[styles.tipDivider, { backgroundColor: `${colors.tone[tone]}66` }]} />
      <View style={styles.tipText}>
        <Text style={styles.cardTitle}>{kind === 'night' ? 'Calm Evening Care' : 'Mindful Morning Care'}</Text>
        <Text style={styles.body}>
          {card.headline}. {card.body}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(c: BriefingColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.page },
    container: { paddingHorizontal: 16, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    back: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
    kindPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 7 },
    kindText: { fontSize: 13, fontWeight: '700', color: c.text },
    card: { backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    body: { fontSize: 13.5, lineHeight: 19, color: c.muted },
    aqiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    aqiText: { flex: 1, gap: 8, alignItems: 'flex-start' },
    aqiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderColor: c.accent, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
    outlineText: { fontSize: 12.5, fontWeight: '700', color: c.accent },
    guide: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 12 },
    guideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    guideRange: { width: 92 },
    guideLabel: { flex: 1 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gases: { fontSize: 12, lineHeight: 18, color: c.muted, paddingHorizontal: 4 },
    tip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 1, padding: 14 },
    tipIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    tipDivider: { width: 2, alignSelf: 'stretch', borderRadius: 1 },
    tipText: { flex: 1, gap: 3 },
    primaryBtn: { height: 46, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    error: { fontSize: 13, color: c.tone.severe },
  });
}
