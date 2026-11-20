import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { REPORT_REASONS, type SocialPost } from '@entities/social';

// The menu of one post, in the swipe-down bottom drawer: delete my own post, or report it and block its author. A report asks for a reason first.
export function PostMenu({
  post,
  onClose,
  onDelete,
  onReport,
  onBlock,
}: {
  post: SocialPost | null;
  onClose: () => void;
  onDelete: (post: SocialPost) => void;
  onReport: (post: SocialPost, reason: string) => void;
  onBlock: (post: SocialPost) => void;
}) {
  const p = usePalette();
  const [reporting, setReporting] = useState(false);

  function close() {
    setReporting(false);
    onClose();
  }

  return (
    <BottomSheet visible={post !== null} onClose={close}>
      <View style={styles.list}>
        {post && !reporting ? (
          post.is_mine ? (
            <Row label="Delete post" color={p.red} onPress={() => { close(); onDelete(post); }} />
          ) : (
            <>
              <Row label="Report post" color={p.text} onPress={() => setReporting(true)} />
              <Row label={`Block @${post.handle}`} color={p.red} onPress={() => { close(); onBlock(post); }} />
            </>
          )
        ) : null}
        {post && reporting ? (
          <>
            <Text style={[styles.heading, { color: p.text }]}>Why are you reporting this?</Text>
            {REPORT_REASONS.map((reason) => (
              <Row key={reason.value} label={reason.label} color={p.text} onPress={() => { close(); onReport(post, reason.value); }} />
            ))}
          </>
        ) : null}
        <Row label="Cancel" color={p.muted} onPress={close} />
      </View>
    </BottomSheet>
  );
}

function Row({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Text style={[styles.rowText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  heading: { fontSize: 15, fontWeight: '800', paddingVertical: 8 },
  row: { height: 50, justifyContent: 'center' },
  rowText: { fontSize: 15.5, fontWeight: '600' },
});
