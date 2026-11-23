import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_SPACE, SOCIAL_TYPE } from '@entities/social';

// What each part of Move is for and how to use it, shown in a drawer from an info icon.
interface HelpTopic {
  title: string;
  purpose: string;
  steps: string[];
}

export type HelpKey = 'move' | 'journeys' | 'pods' | 'quests';

export const HELP: Record<HelpKey, HelpTopic> = {
  move: {
    title: 'Check in today',
    purpose: 'Check in to the healthy habits you kept today. Each day you check in keeps your streak going, so you can see how steady you are.',
    steps: [
      'Tap Check in today.',
      'Tap each habit you did. Tap it again to take it back.',
      'Check in at least once before midnight, India time, to keep your streak. A day is the calendar day, not 12 or 24 hours since your last check-in.',
      'If you miss a whole day, the streak starts again from 1.',
    ],
  },
  journeys: {
    title: 'Journeys',
    purpose: 'A journey is a route on a 3D map that you and your friends walk together. Your steps and check-ins move you along it.',
    steps: ['Pick a map and start a journey.', 'Invite friends to join you.', 'Keep moving and checking in to travel further along the route.'],
  },
  pods: {
    title: 'Pods',
    purpose: 'A pod is a small private group with a weekly target. It helps you keep going by doing it together with people you choose.',
    steps: ['Make a pod, or accept an invitation.', 'Invite the friends you want in it.', 'Meet the weekly target together to build the pod streak.'],
  },
  quests: {
    title: 'Quests and leaderboard',
    purpose: 'Quests are monthly goals you can finish. The leaderboard ranks you and your friends for the week or the month.',
    steps: ['See the goals for this month.', 'Check in and move to make progress on them.', 'Switch the leaderboard between week and month to compare with friends.'],
  },
};

// The drawer with the purpose and the steps of one topic.
export function HelpSheet({ topic, onClose }: { topic: HelpKey | null; onClose: () => void }) {
  const p = usePalette();
  return (
    <BottomSheet visible={topic !== null} onClose={onClose}>
      {topic ? (
        <View style={styles.help}>
          <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>{HELP[topic].title}</Text>
          <Text style={[SOCIAL_TYPE.body, { color: p.muted }]}>{HELP[topic].purpose}</Text>
          <Text style={[SOCIAL_TYPE.bodyStrong, { color: p.text }]}>How to use it</Text>
          {HELP[topic].steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <Text style={[SOCIAL_TYPE.bodyStrong, { color: p.accent }]}>{index + 1}</Text>
              <Text style={[SOCIAL_TYPE.body, styles.flex, { color: p.text }]}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </BottomSheet>
  );
}

// The info icon that sits beside a screen title, with its own drawer.
export function FeatureHelpButton({ topic }: { topic: HelpKey }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`How ${HELP[topic].title} works`} hitSlop={10} onPress={() => setOpen(true)} style={styles.button}>
        <Ionicons name="information-circle-outline" size={22} color={p.muted} />
      </Pressable>
      <HelpSheet topic={open ? topic : null} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  button: { padding: 2, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  help: { gap: SOCIAL_SPACE.inner },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});
