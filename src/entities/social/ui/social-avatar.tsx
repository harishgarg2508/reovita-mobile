import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { useSocialPicture } from '../model/use-social';

// The round picture of a person: their profile photo when they chose one, otherwise the first letter of their handle on a soft green circle.
// The photo is read once per person and shared by every place that shows them.
export const SocialAvatar = memo(function SocialAvatar({ handle, hasAvatar, size = 44 }: { handle: string; hasAvatar: boolean; size?: number }) {
  const p = usePalette();
  const picture = useSocialPicture(handle, 'avatar', hasAvatar);
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: p.accentSoft }]}>
      {hasAvatar && picture.data ? (
        <Image source={{ uri: picture.data }} style={styles.fill} resizeMode="cover" accessibilityLabel={`Photo of @${handle}`} />
      ) : (
        <Text style={[styles.letter, { color: p.accent, fontSize: Math.round(size * 0.4) }]}>{handle.slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  letter: { fontWeight: '800' },
});
