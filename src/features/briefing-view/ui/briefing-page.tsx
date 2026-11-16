import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ConfirmDialog } from '@shared/ui';
import { useActiveConsent, useGrantConsentType } from '@entities/consent';

import { useBriefingLive } from '../model/use-briefing-live';
import { formatCoords, useCurrentPlace } from '../model/current-place';
import { shareLocationForBriefing } from '../model/share-location';
import type { BriefingCard } from '../model/briefing-api';
import { feelsLikeNote, fmt, place, SCALES } from '../model/reading-labels';
import { AqiGauge } from './aqi-gauge';
import { AreaBanner } from './area-banner';
import { useBriefingColors, type BriefingColors } from './briefing-theme';
import { MetricTile } from './metric-tile';

// The six US AQI bands, for the "Learn more" list.
const AQI_GUIDE: { range: string; label: string; color: string }[] = [
  { range: '0–50', label: 'Good', color: '#2E9E5B' },
  { range: '51–100', label: 'Moderate', color: '#E0C22B' },
  { range: '101–150', label: 'Unhealthy for Sensitive Groups', color: '#E8742B' },
  { range: '151–200', label: 'Unhealthy', color: '#D6334A' },
  { range: '201–300', label: 'Very Unhealthy', color: '#8E3A9D' },
  { range: '301+', label: 'Hazardous', color: '#7E1F3A' },
];

// The environmental briefing: where you are, the air quality dial, weather readings, and today's guidance.
export function BriefingPage() {
  const colors = useBriefingColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { today, refresh } = useBriefingLive();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  // The one popover that is open: a reading's key, or 'aqi' for the air quality guide. Opening another closes it.
  const [openTile, setOpenTile] = useState<string | null>(null);
  const toggleTile = (key: string) => setOpenTile((current) => (current === key ? null : key));
  const closeTiles = () => setOpenTile(null);
  // Morning guidance by day, night guidance in the evening and night.
  const locationConsent = useActiveConsent('location');
  const grantConsent = useGrantConsentType();
  // The place name is read from the phone once the location is shared.
  const place_ = useCurrentPlace(today.isSuccess && !today.data?.needsLocation);

  // Location is stored only after the user agrees to the location consent (DPDP).
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
  const shownKind = defaultKind;
  const tip = shownKind === 'night' ? (night ?? morning) : (morning ?? night);
  // Both cards are built from the same reading, so the readings are shown once.
  const s = (morning ?? night)?.snapshot ?? null;
  // The gases the provider gave a reading for.
  const gases = s
    ? ([
        { symbol: 'NO₂', name: 'Nitrogen dioxide', value: s.no2 },
        { symbol: 'O₃', name: 'Ozone', value: s.o3 },
        { symbol: 'SO₂', name: 'Sulphur dioxide', value: s.so2 },
        { symbol: 'CO', name: 'Carbon monoxide', value: s.co },
      ].filter((gas) => gas.value != null) as { symbol: string; name: string; value: number }[])
    : [];

  return (
    <View style={styles.pageWrap}>
      {/* Delicate decorative botanical leaves at the top right behind the header */}
      <View style={styles.topDecoration} pointerEvents="none">
        <Svg width={140} height={120} viewBox="0 0 140 120" fill="none">
          <Path
            d="M140 10 C108 14 84 46 94 82 C108 52 128 36 140 30 Z"
            fill={colors.dark ? '#335240' : '#8EB996'}
            opacity={colors.dark ? 0.22 : 0.36}
          />
          <Path
            d="M136 62 C114 72 98 96 108 120 C122 100 132 86 140 82 Z"
            fill={colors.dark ? '#254532' : '#A3C8AA'}
            opacity={colors.dark ? 0.18 : 0.28}
          />
        </Svg>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 },
        ]}>
        {/* While a popover is open, a tap anywhere else closes it. The tiles sit above this layer, so they close it too. */}
        {openTile ? <Pressable accessibilityLabel="Close" style={styles.clickAway} onPress={closeTiles} /> : null}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{'Environmental\nBriefing'}</Text>
            <Text style={styles.subtitle}>{shownKind === 'night' ? 'Evening' : 'Morning'} atmospheric overview.</Text>
          </View>
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
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
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
            {s.aqi != null ? (
              <AirQualityCard
                aqi={s.aqi}
                colors={colors}
                styles={styles}
                open={openTile === 'aqi'}
                onToggle={() => toggleTile('aqi')}
              />
            ) : null}

            <View style={styles.grid}>
              {s.uv_index != null ? <MetricTile label="UV Index" value={fmt.uv(s.uv_index)} scale="uv" raw={s.uv_index} colors={colors} open={openTile === 'uv'} onToggle={() => toggleTile('uv')} onClose={closeTiles} /> : null}
              {s.temperature_c != null ? (
                <MetricTile label="Temperature" value={fmt.celsius(s.temperature_c)} scale="temperature" raw={s.temperature_c} colors={colors} open={openTile === 'temperature'} onToggle={() => toggleTile('temperature')} onClose={closeTiles} />
              ) : null}
              {s.feels_like_c != null ? (
                <MetricTile
                  label="Feels Like"
                  value={fmt.celsius(s.feels_like_c)}
                  scale="feelsLike"
                  raw={s.feels_like_c}
                  colors={colors}
                  note={feelsLikeNote(s.temperature_c, s.feels_like_c)}
                  open={openTile === 'feelsLike'}
                  onToggle={() => toggleTile('feelsLike')}
                  onClose={closeTiles}
                />
              ) : null}
              {s.humidity != null ? <MetricTile label="Humidity" value={fmt.percent(s.humidity)} scale="humidity" raw={s.humidity} colors={colors} open={openTile === 'humidity'} onToggle={() => toggleTile('humidity')} onClose={closeTiles} /> : null}
            </View>

            {s.pm25 != null ? <MetricTile wide label="Fine Particulates (PM2.5)" value={fmt.micro(s.pm25)} scale="pm25" raw={s.pm25} colors={colors} open={openTile === 'pm25'} onToggle={() => toggleTile('pm25')} onClose={closeTiles} /> : null}
            {s.pm10 != null ? <MetricTile wide label="Coarse Particulates (PM10)" value={fmt.micro(s.pm10)} scale="pm10" raw={s.pm10} colors={colors} open={openTile === 'pm10'} onToggle={() => toggleTile('pm10')} onClose={closeTiles} /> : null}

            {gases.length > 0 ? (
              <View style={styles.gasCard}>
                <Text style={styles.gasTitle}>Other pollutants</Text>
                <View style={styles.gasGrid}>
                  {gases.map((gas) => (
                    <View key={gas.symbol} style={styles.gasItem}>
                      <Text style={styles.gasSymbol}>{gas.symbol}</Text>
                      <Text style={styles.gasName}>{gas.name}</Text>
                      <Text style={styles.gasValue}>{fmt.micro(gas.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <TipCard card={tip} kind={shownKind} colors={colors} styles={styles} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function AirQualityCard({
  aqi,
  colors,
  styles,
  open,
  onToggle,
}: {
  aqi: number;
  colors: BriefingColors;
  styles: Styles;
  open: boolean;
  onToggle: () => void;
}) {
  const { band, index: currentIndex } = place(SCALES.aqi, aqi);
  return (
    <View style={styles.card}>
      <View style={styles.aqiRow}>
        <AqiGauge aqi={aqi} colors={colors} />
        <View style={styles.aqiText}>
          <View style={styles.aqiHead}>
            <Text style={styles.cardTitle}>Air Quality</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About the air quality index"
              accessibilityState={{ expanded: open }}
              onPress={onToggle}
              hitSlop={8}>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color={colors.chevron} />
            </Pressable>
          </View>
          <Text style={styles.body}>{band.sentence}</Text>
        </View>
      </View>
      {open ? (
        <View style={styles.guide}>
          <Text style={styles.guideIntro}>The US Air Quality Index runs from 0 to 500. The higher it is, the more people may notice effects, starting with sensitive groups.</Text>
          <View style={styles.guideList}>
            {AQI_GUIDE.map((row, i) => {
              const current = i === currentIndex;
              return (
                <View key={row.label} style={[styles.guideRow, current && { backgroundColor: `${row.color}1F`, borderColor: `${row.color}66` }]}>
                  <View style={[styles.guideSwatch, { backgroundColor: row.color }]} />
                  <Text style={[styles.guideName, current && styles.guideNameCurrent]} numberOfLines={2}>
                    {row.label}
                  </Text>
                  <Text style={styles.guideRange}>{row.range}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Today's guidance as plain text on the page: a short title and the advice under it.
function TipCard({ card, kind, styles }: { card: BriefingCard; kind: 'morning' | 'night'; colors: BriefingColors; styles: Styles }) {
  return (
    <View style={styles.careText}>
      <Text style={styles.careTitle}>{kind === 'night' ? 'Calm Evening Care' : 'Mindful Morning Care'}</Text>
      <Text style={styles.careBody}>{card.headline ? `${card.headline}. ${card.body}` : card.body}</Text>
    </View>
  );
}

function makeStyles(c: BriefingColors) {
  return StyleSheet.create({
    pageWrap: {
      flex: 1,
      backgroundColor: c.page,
    },
    topDecoration: {
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 0,
    },
    scroll: {
      flex: 1,
      zIndex: 1,
    },
    container: {
      paddingHorizontal: 16,
      gap: 13,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 2,
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#173620',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      lineHeight: 26,
      color: c.text,
    },
    subtitle: {
      fontSize: 12.5,
      color: c.muted,
      marginTop: 2,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 12,
      shadowColor: '#173620',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 1,
    },
    cardTitle: {
      fontSize: 16.5,
      fontWeight: '800',
      letterSpacing: -0.2,
      color: c.text,
    },
    body: {
      fontSize: 12.8,
      lineHeight: 18.5,
      color: c.muted,
    },
    aqiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    aqiText: {
      flex: 1,
      gap: 8,
      alignItems: 'flex-start',
    },
    aqiHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
    },
    guide: {
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 14,
    },
    guideIntro: {
      fontSize: 12.5,
      lineHeight: 18,
      color: c.muted,
    },
    guideList: {
      gap: 6,
    },
    guideRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    guideSwatch: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    guideName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    guideNameCurrent: {
      fontWeight: '800',
    },
    guideRange: {
      fontSize: 12.5,
      fontWeight: '600',
      color: c.muted,
    },
    gasCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
    },
    gasTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: c.text,
    },
    gasGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    gasItem: {
      flexBasis: '48%',
      flexGrow: 1,
      borderRadius: 14,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 1,
    },
    gasSymbol: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    gasName: {
      fontSize: 11,
      color: c.muted,
    },
    gasValue: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      marginTop: 2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      zIndex: 16,
    },
    clickAway: {
      ...StyleSheet.absoluteFill,
      zIndex: 10,
    },
    careText: {
      gap: 4,
      paddingHorizontal: 4,
      paddingTop: 4,
    },
    careTitle: {
      fontSize: 15.5,
      fontWeight: '800',
      color: c.careCard.title,
      letterSpacing: -0.2,
    },
    careBody: {
      fontSize: 12.8,
      lineHeight: 18.5,
      color: c.careCard.body,
    },
    primaryBtn: {
      height: 46,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    error: {
      fontSize: 13,
      color: c.tone.severe,
    },
    centerBox: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
