import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { ABOUT, place, SCALES, type ScaleName, type Tone } from '../model/reading-labels';
import type { BriefingColors } from './briefing-theme';

export type TileIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export function getStatusChipColors(label: string, tone: Tone, colors: BriefingColors) {
  if (colors.dark) {
    if (label === 'Above ideal' || tone === 'severe') {
      return { bg: '#3B171D', text: '#FF7A8E', dot: '#FF6B81' };
    }
    if (label === 'Elevated' || tone === 'high') {
      return { bg: '#382015', text: '#FF9D66', dot: '#FF8A48' };
    }
    return colors.tones[tone];
  }
  if (label === 'Above ideal' || tone === 'severe') {
    return { bg: '#FDECEE', text: '#D6334A', dot: '#D6334A' };
  }
  if (label === 'Elevated') {
    return { bg: '#FFF0E6', text: '#C25A12', dot: '#E8742B' };
  }
  return colors.tones[tone];
}

// A soft pill with the band's name, e.g. "Moderate", "Comfortable", or "Above ideal".
export function StatusChip({ label, tone, colors, dot }: { label: string; tone: Tone; colors: BriefingColors; dot?: boolean }) {
  const chipColors = getStatusChipColors(label, tone, colors);
  return (
    <View style={[styles.chip, { backgroundColor: chipColors.bg }]}>
      {dot ? <View style={[styles.chipDot, { backgroundColor: chipColors.dot }]} /> : null}
      <Text style={[styles.chipText, { color: chipColors.text }]}>{label}</Text>
    </View>
  );
}

interface MetricVisual {
  bg: (dark: boolean) => string;
  color: (dark: boolean) => string;
  iconName: TileIcon;
}

const SCALE_VISUALS: Record<ScaleName, MetricVisual> = {
  uv: {
    bg: (d) => (d ? '#2E2211' : '#FEF6E9'),
    color: () => '#D98A2C',
    iconName: 'weather-sunny',
  },
  temperature: {
    bg: (d) => (d ? '#162E20' : '#EBF6EE'),
    color: () => '#2E9E5B',
    iconName: 'thermometer',
  },
  feelsLike: {
    bg: (d) => (d ? '#132B27' : '#E8F5F2'),
    color: () => '#329B85',
    iconName: 'weather-windy',
  },
  humidity: {
    bg: (d) => (d ? '#162E20' : '#E8F6EE'),
    color: () => '#2E9E5B',
    iconName: 'water-outline',
  },
  pm25: {
    bg: (d) => (d ? '#162F21' : '#EAF5EB'),
    color: () => '#2E9E5B',
    iconName: 'grain',
  },
  pm10: {
    bg: (d) => (d ? '#162F21' : '#EAF5EB'),
    color: () => '#2E9E5B',
    iconName: 'grain',
  },
  aqi: {
    bg: (d) => (d ? '#162F21' : '#EAF5EB'),
    color: () => '#2E9E5B',
    iconName: 'air-filter',
  },
};

// The small (i) at the right of a tile. It opens a popover next to it that says what the reading measures.
function InfoButton({ open, onPress, label, colors }: { open: boolean; onPress: () => void; label: string; colors: BriefingColors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`About ${label}`}
      onPress={onPress}
      hitSlop={10}>
      <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={19} color={open ? colors.accent : colors.chevron} />
    </Pressable>
  );
}

interface Props {
  label: string;
  icon?: TileIcon;
  value: string;
  scale: ScaleName;
  raw: number;
  colors: BriefingColors;
  wide?: boolean;
  note?: string | null;
  // Which tile has its popover open is decided by the page, so only one is open at a time.
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function MetricTile({ label, icon, value, scale, raw, colors, wide, note, open, onToggle, onClose }: Props) {
  const band = place(SCALES[scale], raw).band;
  const visual = SCALE_VISUALS[scale];
  const iconName = icon ?? visual.iconName;
  const iconBg = visual.bg(colors.dark);
  const iconColor = visual.color(colors.dark);

  // The popover fades and eases in when it opens and fades out when it closes. It stays on screen until the fade has finished.
  const [fade] = useState(() => new Animated.Value(0));
  const [showing, setShowing] = useState(false);
  useEffect(() => {
    const id = fade.addListener(({ value }) => setShowing(value > 0.01));
    Animated.timing(fade, { toValue: open ? 1 : 0, duration: open ? 180 : 130, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => {
      fade.removeListener(id);
      fade.stopAnimation();
    };
  }, [open, fade]);

  return (
    <Pressable
      accessible
      accessibilityLabel={`${label}: ${value}, ${band.label}`}
      onPress={onClose}
      // An open popover must draw above the tiles that come after this one.
      style={[
        styles.tile,
        wide ? styles.wide : styles.half,
        { backgroundColor: colors.card, borderColor: colors.border },
        open && styles.tileOpen,
      ]}>
      {wide ? (
        <View style={styles.wideRow}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
          </View>
          <View style={styles.wideBody}>
            <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
              {label}
            </Text>
            <View style={styles.wideValueRow}>
              <Text style={[styles.wideValue, { color: colors.text }]} numberOfLines={1}>
                {value}
              </Text>
              <StatusChip label={band.label} tone={band.tone} colors={colors} />
            </View>
          </View>
          <InfoButton open={open} onPress={onToggle} label={label} colors={colors} />
        </View>
      ) : (
        <View style={styles.gridRow}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName} size={19} color={iconColor} />
          </View>
          <View style={styles.gridBody}>
            <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
              {value}
            </Text>
            <StatusChip label={band.label} tone={band.tone} colors={colors} />
          </View>
        </View>
      )}
      {!wide ? (
        <View style={styles.infoCorner}>
          <InfoButton open={open} onPress={onToggle} label={label} colors={colors} />
        </View>
      ) : null}

      {open || showing ? (
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[
            styles.popover,
            wide ? styles.popoverWide : styles.popoverHalf,
            { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.dark ? '#000000' : '#173620' },
            {
              opacity: fade,
              transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }, { scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
            },
          ]}>
          {/* Tapping the popover itself keeps it open. */}
          <Pressable onPress={() => undefined} accessibilityLiveRegion="polite" style={styles.popoverBody}>
            <View style={[styles.popoverArrow, { backgroundColor: colors.card, borderColor: colors.border }]} />
            <Text style={[styles.popoverTitle, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.aboutText, { color: colors.muted }]}>{ABOUT[scale]}</Text>
            {note ? <Text style={[styles.aboutText, { color: colors.muted }]}>{note}.</Text> : null}
          </Pressable>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    zIndex: 15,
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
    shadowColor: '#173620',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  half: {
    flexBasis: '47.5%',
    flexGrow: 1,
  },
  wide: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gridBody: {
    flex: 1,
    gap: 3,
    alignItems: 'flex-start',
  },
  gridValue: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideBody: {
    flex: 1,
    gap: 2,
    alignItems: 'flex-start',
  },
  wideValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wideValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 11.8,
    fontWeight: '500',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  chipDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tileOpen: {
    zIndex: 30,
    elevation: 12,
  },
  popover: {
    position: 'absolute',
    top: 44,
    right: 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 14,
    zIndex: 40,
  },
  popoverWide: {
    width: 250,
  },
  popoverHalf: {
    left: 6,
    top: 36,
  },
  popoverBody: {
    gap: 4,
  },
  infoCorner: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  popoverArrow: {
    position: 'absolute',
    top: -6,
    right: 10,
    width: 11,
    height: 11,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  popoverTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  aboutText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
