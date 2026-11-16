import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { BriefingColors } from './briefing-theme';

// "Your area": place name and coordinates on a clean card with a delicate pin and sun/hills illustration.
export function AreaBanner({ name, coords, colors }: { name: string; coords: string; colors: BriefingColors }) {
  const hillFar = colors.dark ? '#1F3628' : '#E2EFE0';
  const hillNear = colors.dark ? '#274433' : '#CFE6C7';
  const sunColor = colors.dark ? '#5E5230' : '#FDF1B6';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 340 76" preserveAspectRatio="xMaxYMid slice">
        <Circle cx={286} cy={22} r={13} fill={sunColor} opacity={0.9} />
        <Path d="M236 76 C260 48 296 42 340 32 L340 76 Z" fill={hillFar} />
        <Path d="M276 76 C294 54 316 48 340 46 L340 76 Z" fill={hillNear} />
      </Svg>
      <View style={[styles.pinBox, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name="location-outline" size={21} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.coords, { color: colors.muted }]}>{coords}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    shadowColor: '#173620',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  pinBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  coords: {
    fontSize: 12,
  },
});
