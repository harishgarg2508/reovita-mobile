import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollToTopOnFocus } from '@shared/lib';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useSetTestPlan, useSubscription } from '@entities/subscription';

import { usePlayBilling } from '../model/use-play-billing';

// The Google Play part of the plan: the product to sell and the id that ties a purchase to this account (null where billing is not set up).
function data_google(data: { billing?: { google_play: { products: string[]; account_id: string | null } | null } } | undefined) {
  return data?.billing?.google_play ?? null;
}

// What every account has, in plain words. These are shown on the Free side of the comparison.
const FREE_FEATURES = ['Upload lab reports', 'Health score and trends', 'Medication check', 'Health log', 'Social', 'Your codename and QR'];

// Free or Premium. The free plan uploads lab reports and has the basics; Premium adds Scan my meal, Scan my fridge, Dietary guidance, the daily briefing,
// Social, and every kind of upload. A screen of a Premium feature shows this one in its place for a free account, with `feature` saying which one was
// opened. There is no payment provider yet: where the server has test mode on, a button turns Premium on and off with no payment; elsewhere the
// Subscribe button says it is not open yet.
export function PlanScreen({ feature }: { feature?: string }) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const plan = useSubscription();
  const { activate, cancel } = useSetTestPlan();
  const google = data_google(plan.data);
  const billing = usePlayBilling({ productId: google?.products[0] ?? null, accountId: google?.account_id ?? null });
  const data = plan.data;
  const busy = activate.isPending || cancel.isPending;
  const back = () => goBackOr(router, '/(app)/(tabs)/dashboard' as Href);
  const until = data?.current_period_end ? new Date(data.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Your plan</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {feature ? (
          <View style={[styles.locked, { backgroundColor: p.accentSoft }]}>
            <Ionicons name="lock-closed" size={18} color={p.accent} />
            <Text style={[styles.lockedText, { color: p.text }]}>{feature} is part of Premium.</Text>
          </View>
        ) : null}

        <View style={[styles.hero, { backgroundColor: p.accent }]}>
          <Ionicons name="diamond" size={30} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Reovita Premium</Text>
          <Text style={styles.heroText}>Everything in Reovita in one plan: scan your food, get your guidance, and join Social.</Text>
          {data ? (
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{data.premium ? `You have Premium${until ? ` until ${until}` : ''}` : 'You are on the Free plan'}</Text>
            </View>
          ) : null}
        </View>

        {plan.isPending ? <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} /> : null}
        {plan.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load your plan. Try again in a moment.</Text> : null}

        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
          <Text style={[styles.cardTitle, { color: p.text }]}>Free</Text>
          {FREE_FEATURES.map((label) => (
            <View key={label} style={styles.line}>
              <Ionicons name="checkmark-circle-outline" size={19} color={p.muted} />
              <Text style={[styles.lineText, { color: p.text }]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.accent, borderWidth: 1.5 }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: p.text }]}>Premium</Text>
            <Text style={[styles.cardHint, { color: p.muted }]}>Everything in Free, plus</Text>
          </View>
          {(data?.features ?? []).map((item) => (
            <View key={item.key} style={styles.line}>
              <Ionicons name="checkmark-circle" size={19} color={p.accent} />
              <Text style={[styles.lineText, { color: p.text }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {data && !data.premium ? (
          <>
            {billing.available && google ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={billing.busy || !billing.ready}
                  onPress={() => void billing.buy()}
                  style={[styles.primary, { backgroundColor: p.accent }, (billing.busy || !billing.ready) && { opacity: 0.6 }]}>
                  {billing.busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{billing.price ? `Subscribe · ${billing.price}` : 'Subscribe'}</Text>}
                </Pressable>
                <Text style={[styles.note, { color: p.muted }]}>Paid through Google Play. It renews until you cancel it there.</Text>
                <Pressable accessibilityRole="button" disabled={billing.busy} onPress={() => void billing.restore()} hitSlop={8}>
                  <Text style={[styles.restore, { color: p.accent }]}>Restore my purchase</Text>
                </Pressable>
              </>
            ) : google ? (
              <>
                <View style={[styles.primary, { backgroundColor: p.accent, opacity: 0.55 }]}>
                  <Text style={styles.primaryText}>Subscribe</Text>
                </View>
                <Text style={[styles.note, { color: p.muted }]}>Subscribe in the Reovita app on your Android phone.</Text>
              </>
            ) : null}
            {billing.message ? <Text style={[styles.note, { color: p.red }]}>{billing.message}</Text> : null}
            {data.test_mode ? (
              <>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => activate.mutate()} style={[styles.secondary, { borderColor: p.border }]}>
                  {activate.isPending ? <ActivityIndicator color={p.accent} /> : <Text style={[styles.secondaryText, { color: p.text }]}>Turn on Premium (test)</Text>}
                </Pressable>
                <Text style={[styles.note, { color: p.muted }]}>Test mode: no payment is taken.</Text>
              </>
            ) : null}
            {!google && !data.test_mode ? (
              <>
                <View style={[styles.primary, { backgroundColor: p.accent, opacity: 0.55 }]}>
                  <Text style={styles.primaryText}>Subscribe</Text>
                </View>
                <Text style={[styles.note, { color: p.muted }]}>Subscriptions are not open yet. You will see the price here when they are.</Text>
              </>
            ) : null}
          </>
        ) : null}

        {data?.premium && data.provider === 'google_play' && data.billing?.manage_url ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(data.billing?.manage_url as string)} style={[styles.secondary, { borderColor: p.border }]}>
              <Text style={[styles.secondaryText, { color: p.text }]}>Manage subscription in Google Play</Text>
            </Pressable>
            <Text style={[styles.note, { color: p.muted }]}>{data.auto_renewing ? 'It renews by itself until you cancel it in Google Play.' : 'It will not renew. You keep Premium until the date above.'}</Text>
          </>
        ) : null}

        {data?.premium && data.test_mode && data.provider === 'test' ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => cancel.mutate()} style={[styles.secondary, { borderColor: p.border }]}>
            {cancel.isPending ? <ActivityIndicator color={p.accent} /> : <Text style={[styles.secondaryText, { color: p.text }]}>Go back to Free (test)</Text>}
          </Pressable>
        ) : null}
        {activate.isError || cancel.isError ? <Text style={[styles.note, { color: p.red }]}>Could not change the plan. Try again in a moment.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontFamily: 'Poppins_600SemiBold' },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14 },
  lockedText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  hero: { borderRadius: 22, padding: 20, gap: 8, alignItems: 'flex-start' },
  heroTitle: { fontSize: 24, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  heroText: { fontSize: 14, lineHeight: 20, color: '#FFFFFF', opacity: 0.92 },
  heroChip: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  heroChipText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  cardHead: { gap: 2 },
  cardTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  cardHint: { fontSize: 12.5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineText: { flex: 1, fontSize: 14.5 },
  primary: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15.5, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  secondary: { height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14.5, fontFamily: 'Poppins_600SemiBold' },
  note: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  restore: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
});
