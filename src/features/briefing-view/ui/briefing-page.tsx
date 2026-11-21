import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useBriefingLive } from '../model/use-briefing-live';
import { formatCoords, useCurrentPlace } from '../model/current-place';
import { askLocationPermission, getLocationPermission, type LocationPermission } from '../model/location-permission';
import { LOCATION_FAILURE_TEXT, shareLocationForBriefing, type LocationFailure } from '../model/share-location';
import type { BriefingCard } from '../model/briefing-api';
import { feelsLikeNote, fmt, place, SCALES } from '../model/reading-labels';
import { AqiGauge } from './aqi-gauge';
import { AreaBanner } from './area-banner';
import { useBriefingColors, type BriefingColors } from './briefing-theme';
import { MetricTile } from './metric-tile';
import { useScrollToTopOnFocus } from '@shared/lib';

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
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const colors = useBriefingColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { today, refresh } = useBriefingLive();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  // Why the location could not be shared. "blocked" adds a button to the phone's settings.
  const [failure, setFailure] = useState<LocationFailure | null>(null);
  // The one popover that is open: a reading's key, or 'aqi' for the air quality guide. Opening another closes it.
  const [openTile, setOpenTile] = useState<string | null>(null);
  const toggleTile = (key: string) => setOpenTile((current) => (current === key ? null : key));
  const closeTiles = () => setOpenTile(null);
  // Morning guidance by day, night guidance in the evening and night.
  // The place name is read from the phone once the location is shared.
  const place_ = useCurrentPlace(today.isSuccess && !today.data?.needsLocation);

  // Whether the device location is allowed. It is checked each time the screen comes into view, because the person may have changed it
  // in the phone's settings. On a phone that will still show its own popup, opening the briefing asks again, once per visit.
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const askedThisVisit = useRef(false);
  const autoSaved = useRef(false);
  useFocusEffect(
    useCallback(() => {
      askedThisVisit.current = false;
      autoSaved.current = false;
      let active = true;
      void (async () => {
        let current = await getLocationPermission();
        // Each time the briefing is opened without the permission, the system's own popup is shown (the phone's native popup, or the
        // browser's prompt), once per visit. Neither shows when the system has blocked it: the phone's settings are the way then.
        if (active && current.status !== 'granted' && current.status !== 'unknown' && current.canAskAgain && !askedThisVisit.current) {
          askedThisVisit.current = true;
          current = await askLocationPermission();
        }
        if (active) setPermission(current);
      })();
      return () => {
        active = false;
      };
    }, []),
  );
  // The warning's button: the phone's popup again if it will show one, the phone's settings if not, the browser's prompt on the web.
  async function allowLocation() {
    if (Platform.OS !== 'web' && permission?.status === 'denied' && !permission.canAskAgain) {
      void Linking.openSettings();
      return;
    }
    // The phone's popup, or the browser's prompt.
    const after = await askLocationPermission();
    setPermission(after);
    if (after.status !== 'granted') return;
    // Allowed on the device: the area is saved.
    await saveLocation();
  }

  // The device's own permission (the phone's popup or the browser's prompt) is the permission to use the location.
  function onShareLocation() {
    setShareError(null);
    setFailure(null);
    void saveLocation();
  }

  async function saveLocation() {
    setSharing(true);
    try {
      const shared = await shareLocationForBriefing();
      if (!shared.ok) {
        setFailure(shared.reason);
        setShareError(LOCATION_FAILURE_TEXT[shared.reason]);
        return;
      }
      refresh();
    } catch {
      setShareError('Could not save your location. Try again.');
    } finally {
      setSharing(false);
      // Whatever the person answered, the warning now follows it.
      setPermission(await getLocationPermission());
    }
  }

  // Location is already allowed on the device but no area is saved yet: save it now, with no button press, and the briefing loads.
  // Tried once per visit, so a failure does not repeat in a loop (the button stays for a retry).
  useEffect(() => {
    if (permission?.status !== 'granted' || !today.data?.needsLocation || sharing || autoSaved.current) return;
    autoSaved.current = true;
    void saveLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.status, today.data?.needsLocation, sharing]);

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

      <ScrollView ref={scrollRef}
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

        {/* The warning is for a phone only. A browser shows its own prompt, and when it has blocked the site no message of ours can change that. */}
        {Platform.OS !== 'web' && permission && (permission.status === 'denied' || (permission.status === 'undetermined' && today.data?.needsLocation)) ? (
          <View style={styles.permissionBox} accessibilityLiveRegion="polite">
            <Ionicons name="location-outline" size={22} color="#B26A00" />
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>Location access is off</Text>
              <Text style={styles.permissionBody}>
                {permission.status === 'denied' && !permission.canAskAgain
                  ? 'Reovita cannot ask for your location again. Turn it on in your phone settings.'
                  : today.data?.location
                    ? 'You are seeing your last saved area. Allow location to update it to where you are.'
                    : 'Allow location to get the air quality, UV and weather for where you are.'}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void allowLocation()} style={styles.permissionBtn}>
                <Text style={styles.permissionBtnText}>{permission.status === 'denied' && !permission.canAskAgain ? 'Open settings' : 'Allow location'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}


        {today.isPending ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : today.data?.needsLocation ? (
          <View style={styles.locationCard}>
            <View style={styles.locationTop}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={22} color={colors.accent} />
              </View>
            </View>
            <Text style={styles.locationTitle}>Personalize your forecast</Text>
            <Text style={styles.locationBody}>
              Share your location to get real-time air quality, UV and weather conditions tailored to where you are.
            </Text>
            <Pressable accessibilityRole="button" onPress={onShareLocation} disabled={sharing} style={styles.primaryBtn}>
              {sharing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.primaryInner}>
                  <Ionicons name="navigate" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Share my location</Text>
                </View>
              )}
            </Pressable>
            {shareError ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color="#C22F43" />
                <Text style={styles.errorBoxText}>{shareError}</Text>
              </View>
            ) : null}
            {failure === 'blocked' ? (
              <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.settingsBtn}>
                <Text style={styles.settingsText}>Open settings</Text>
              </Pressable>
            ) : null}
            <View style={styles.privacyRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
              <Text style={styles.privacyText}>Your location is stored rounded to about 1 km, and used only for local weather and air readings.</Text>
            </View>
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
    locationCard: {
      backgroundColor: c.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      gap: 14,
      marginTop: 18,
      shadowColor: '#173620',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    },
    locationTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    hyperTag: { paddingHorizontal: 10, height: 24, borderRadius: 999, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    hyperTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: c.accent },
    locationTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, color: c.text },
    locationBody: { fontSize: 13.5, lineHeight: 20, color: c.muted },
    primaryInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2 },
    privacyText: { flex: 1, fontSize: 11.5, lineHeight: 16, color: c.muted },
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
      height: 52,
      borderRadius: 18,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    permissionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 18, backgroundColor: '#FFF4DD', borderWidth: 1, borderColor: '#F3D9A4' },
    permissionText: { flex: 1, gap: 6 },
    permissionTitle: { fontSize: 14.5, fontWeight: '800', color: '#7A4A00' },
    permissionBody: { fontSize: 13, lineHeight: 18, color: '#7A4A00' },
    permissionBtn: { alignSelf: 'flex-start', height: 38, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B26A00' },
    permissionBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },
    errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch', padding: 12, borderRadius: 14, backgroundColor: '#FDEEF0', borderWidth: 1, borderColor: '#F9CBD2' },
    errorBoxText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#C22F43' },
    settingsBtn: { alignSelf: 'stretch', height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.accent },
    settingsText: { fontSize: 14, fontWeight: '700', color: c.accent },
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
