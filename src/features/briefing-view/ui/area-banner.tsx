import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { BriefingColors } from './briefing-theme';

// "Your area": the place name and coordinates on a soft green card, with a small sun and leaves at the right.
export function AreaBanner({ name, coords, colors }: { name: string; coords: string; colors: BriefingColors }) {
  const leaf = colors.dark ? '#24452F' : '#CFE8BF';
  const leafFar = colors.dark ? '#1B3524' : '#DDEFD0';
  return (
    <View style={[styles.card, { backgroundColor: colors.dark ? colors.card : '#EEF7E7', borderColor: colors.border }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 70" preserveAspectRatio="xMaxYMid slice">
        <Circle cx={268} cy={22} r={13} fill={colors.dark ? '#5C5230' : '#F7E49C'} opacity={0.85} />
        <Path d="M250 70 C262 44 290 40 320 30 L320 70 Z" fill={leafFar} />
        <Path d="M286 70 C292 52 306 46 320 44 L320 70 Z" fill={leaf} />
      </Svg>
      <View style={[styles.pin, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.accent} />
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, overflow: 'hidden' },
  pin: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  name: { fontSize: 15.5, fontWeight: '800' },
  coords: { fontSize: 12.5 },
});
