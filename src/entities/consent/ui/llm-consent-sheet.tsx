import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { Button } from '@shared/ui/button';

// Asks for AI processing consent before a report is interpreted. Swipe down or tap outside to decline.
export function LlmConsentSheet({
  visible,
  pending,
  onAllow,
  onDecline,
}: {
  visible: boolean;
  pending: boolean;
  onAllow: () => void;
  onDecline: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onDecline}>
      <View style={styles.content}>
        <Text style={styles.title}>Allow AI to explain your report</Text>
        <Text style={styles.body}>
          To explain your results, VITA sends the values from this report to an AI model. You can withdraw this
          consent at any time.
        </Text>
      </View>
      <Button label={pending ? 'Saving...' : 'Allow'} disabled={pending} onPress={onAllow} />
      <Pressable accessibilityRole="button" onPress={onDecline} disabled={pending} style={styles.later}>
        <Text style={styles.laterText}>Not now</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#171717' },
  body: { fontSize: 14, lineHeight: 20, color: '#60646C' },
  later: { alignItems: 'center', paddingVertical: 8 },
  laterText: { fontSize: 14, fontWeight: '600', color: '#1F6F3F' },
});
