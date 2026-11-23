import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConsentGrants, useGrantConsentType, useRevokeConsent, type ConsentType } from '@entities/consent';
import { useCurrentSubject } from '@entities/subject';
import { useDeactivateAccount } from '@features/account-deactivate';
import { ProfileDetailsCard } from '@features/profile-details';
import { AddProfileSheet, ProfileMenu } from '@features/profile-switch';
import { tapConfirm, useScrollToTopOnFocus } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { Gap, Rule, Type, usePalette, type Palette } from '@shared/ui/theme';
import { Skeleton } from '@shared/ui/skeleton';
import { PlanCard } from '@features/subscription';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { useSubscription } from '@entities/subscription';

// What turning each permission off costs the user. Shown in the popup before the change.
const REVOKE_COPY: Partial<Record<ConsentType, { title: string; message: string; confirmLabel: string; destructive: boolean }>> = {
  health_data: {
    title: 'Turn off health data access?',
    message:
      'Your dashboard, health reports, health score and timeline will not be available until you turn this back on. Your data is kept.',
    confirmLabel: 'Turn off',
    destructive: true,
  },
  llm_processing: {
    title: 'Turn off LLM processing?',
    message: 'Reports will not be interpreted by AI, and daily briefings will stop. You can turn it back on anytime.',
    confirmLabel: 'Turn off',
    destructive: true,
  },
};

// Consent types the subject can switch here. Each maps to one consent record on the server.
const PERMISSIONS: { type: ConsentType; title: string; body: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    type: 'health_data',
    title: 'Health Data Access',
    body: 'Allow this app to view your health records (e.g. steps, heart rate, reports).',
    icon: 'heart-outline',
  },
  {
    type: 'llm_processing',
    title: 'LLM Processing',
    body: 'Allow AI features to analyze your health data and provide personalized insights.',
    icon: 'sparkles-outline',
  },
];

// Profile tab: the subject's code, the permissions, and log out. Colours come from the theme palette,
// so the page follows light and dark mode.
export function ProfilePanel({ onSignOut, signingOut = false }: { onSignOut: () => void; signingOut?: boolean }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  useScrollToTopOnFocus(scrollRef);
  const router = useRouter();
  const plan = useSubscription();
  const subject = useCurrentSubject();
  const consents = useConsentGrants();
  const revoke = useRevokeConsent();
  const grant = useGrantConsentType();
  const deactivate = useDeactivateAccount();

  // The popup currently open: deactivation, or turning a permission off.
  const [dialog, setDialog] = useState<null | { kind: 'deactivate' } | { kind: 'revoke'; type: ConsentType }>(null);

  // Hides the account and its data. Nothing is deleted, and signing in again with Recover restores it.
  function confirmDeactivate() {
    setDialog({ kind: 'deactivate' });
  }

  function onDialogConfirm() {
    if (!dialog) return;
    if (dialog.kind === 'deactivate') {
      deactivate.mutate(undefined, {
        onSuccess: () => {
          setDialog(null);
          onSignOut();
        },
      });
      return;
    }
    revoke.mutate(dialog.type, { onSuccess: () => setDialog(null), onError: () => setDialog(null) });
  }

  const dialogCopy =
    dialog?.kind === 'deactivate'
      ? {
          title: 'Deactivate your account?',
          message:
            'Your account and health data will be hidden, and you will not be able to use the app until you recover it. Nothing is deleted. Sign in again and choose Recover to restore it.',
          confirmLabel: 'Deactivate',
          destructive: true,
        }
      : dialog?.kind === 'revoke'
        ? REVOKE_COPY[dialog.type] ?? {
            title: 'Turn off this permission?',
            message: 'The app will stop using this data until you turn it on again.',
            confirmLabel: 'Turn off',
            destructive: true,
          }
        : null;

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const codename = subject.data?.codename;
  // The profile list that opens from the profile card, and the sheet for adding a profile.
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);

  async function copyCode() {
    if (!codename) return;
    tapConfirm();
    await Clipboard.setStringAsync(codename);
    setCopied(true);
  }

  function shareCode() {
    if (!codename) return;
    tapConfirm();
    void Share.share({ message: `My Reovita code: ${codename}` });
  }

  // Switch on: grant right here. Switch off: show the warning popup, then revoke when the user confirms.
  function togglePermission(type: ConsentType, granted: boolean) {
    if (!granted) {
      grant.mutate(type);
      return;
    }
    setDialog({ kind: 'revoke', type });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Gap.group, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Show this code to link your health records.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" hitSlop={8} onPress={() => setProfilesOpen(true)} style={styles.groupBtn}>
          <Ionicons name="people-outline" size={22} color={p.accent} />
          {/* The chevron says the icon opens something. */}
          <Ionicons name="chevron-forward" size={14} color={p.accent} />
        </Pressable>
      </View>

      {/* The group icon at the top right of the page opens the profiles in a bottom drawer: pick the profile in use, or add one. */}
      <BottomSheet visible={profilesOpen} onClose={() => setProfilesOpen(false)}>
        <Text style={styles.title}>Profiles</Text>
        <ProfileMenu
          onClose={() => setProfilesOpen(false)}
          onAdd={() => {
            // A free account is taken to the plan screen. Otherwise the sheet for the new profile opens on top of this drawer, which stays where it is.
            if (plan.locked) {
              setProfilesOpen(false);
              setTimeout(() => router.push('/(app)/subscription' as never), 250);
            } else {
              setAddingProfile(true);
            }
          }}
        />
        <AddProfileSheet visible={addingProfile} onClose={() => setAddingProfile(false)} />
      </BottomSheet>

      {/* The plan: Free or Premium */}
      <PlanCard />

      {/* Code card: QR on the left, code and actions on the right, log out below. */}
      <View style={styles.codeSection}>
        {subject.isLoading ? (
          <Skeleton height={150} />
        ) : (
        <View style={styles.codeRow}>
          {codename ? (
            <View style={styles.qrBox}>
              {/* The QR keeps a white background and black modules in both themes, so it scans. */}
              <QRCode value={codename} size={132} color="#171717" backgroundColor="#FFFFFF" />
            </View>
          ) : null}
          <View style={styles.codeSide}>
            <Text style={styles.codeLabel}>Your unique code</Text>
            <Text selectable style={styles.code}>
              {codename ?? '-'}
            </Text>
            <Pressable accessibilityRole="button" onPress={copyCode} disabled={!codename} style={styles.outlineBtn}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={p.accent} />
              <Text style={styles.outlineBtnText}>{copied ? 'Copied' : 'Copy code'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={shareCode} disabled={!codename} style={styles.solidBtn}>
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
              <Text style={styles.solidBtnText}>Share code</Text>
            </Pressable>
          </View>
        </View>
        )}
        {subject.isError ? <Text style={styles.error}>Could not load your code. Reopen this tab to try again.</Text> : null}
      </View>

      {/* My details: the basics, history and lifestyle saved in onboarding, each with an Edit action. */}
      <ProfileDetailsCard />

      {/* Permissions: toggles follow the consent records on the server. */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <Text style={styles.sectionLine}>You can control what data and features are accessible to this application.</Text>

        {consents.isLoading ? <Skeleton height={72} /> : null}
        <View style={styles.permList}>
          {PERMISSIONS.map((item) => {
            const granted = consents.granted.has(item.type);
            return (
              <View key={item.type} style={styles.permRow}>
                <View style={styles.permIcon}>
                  <Ionicons name={item.icon} size={22} color={p.accent} />
                </View>
                <View style={styles.permText}>
                  <Text style={styles.permRowTitle}>{item.title}</Text>
                  <Text style={styles.permRowBody}>{item.body}</Text>
                </View>
                <Switch
                  accessibilityLabel={item.title}
                  value={granted}
                  disabled={grant.isPending || revoke.isPending}
                  onValueChange={() => togglePermission(item.type, granted)}
                  trackColor={{ false: p.border, true: p.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            );
          })}
        </View>
        {consents.isError ? <Text style={styles.error}>Could not load your permissions.</Text> : null}
      </View>

      {/* Log out sits outside the danger zone, above it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: signingOut, disabled: signingOut }}
        disabled={signingOut}
        onPress={onSignOut}
        style={[styles.logout, signingOut && { opacity: 0.6 }]}>
        {signingOut ? (
          <ActivityIndicator size="small" color={p.red} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color={p.red} />
            <Text style={styles.logoutText}>Log out</Text>
          </>
        )}
      </Pressable>

      {/* Danger zone: deactivating hides the account. It is recoverable, so nothing is deleted. */}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerBody}>
          Deactivating hides your account and health data from the app. Nothing is deleted, and you can recover it anytime by
          signing in and choosing Recover.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={confirmDeactivate}
          disabled={deactivate.isPending}
          style={styles.dangerBtn}>
          <Text style={styles.dangerBtnText}>{deactivate.isPending ? 'Deactivating...' : 'Deactivate account'}</Text>
        </Pressable>
        {deactivate.isError ? <Text style={styles.error}>Could not deactivate the account. Try again.</Text> : null}
      </View>
      <ConfirmDialog
        visible={dialog !== null}
        title={dialogCopy?.title ?? ''}
        message={dialogCopy?.message ?? ''}
        confirmLabel={dialogCopy?.confirmLabel ?? 'Confirm'}
        destructive={dialogCopy?.destructive ?? true}
        busy={deactivate.isPending || revoke.isPending}
        onConfirm={onDialogConfirm}
        onCancel={() => setDialog(null)}
      />
    </ScrollView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    container: { paddingHorizontal: Gap.edge, gap: Gap.group },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerText: { flex: 1, gap: 4 },
    groupBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44, paddingHorizontal: 8 },
    title: { ...Type.display, color: p.textStrong },
    subtitle: { ...Type.body, color: p.muted },
    // The QR and the code: no frame around them. The QR keeps a thin frame because it is a picture.
    codeSection: { gap: Gap.inner },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qrBox: { padding: 12, borderRadius: 16, borderWidth: Rule, borderColor: p.border, backgroundColor: '#FFFFFF' },
    codeSide: { flex: 1, gap: 10 },
    codeLabel: { ...Type.small, color: p.muted },
    code: { ...Type.title, color: p.textStrong },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: p.accent },
    outlineBtnText: { ...Type.label, color: p.accent },
    solidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 22, backgroundColor: p.accent },
    solidBtnText: { ...Type.label, color: '#FFFFFF' },
    section: { gap: 4 },
    sectionTitle: { ...Type.title, color: p.textStrong },
    sectionLine: { ...Type.small, color: p.muted },
    permList: { marginTop: Gap.inner, borderTopWidth: Rule, borderTopColor: p.border },
    permRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: Rule, borderBottomColor: p.border },
    permIcon: { width: 28, alignItems: 'center' },
    permText: { flex: 1, gap: 2 },
    permRowTitle: { ...Type.bodyStrong, color: p.textStrong },
    permRowBody: { ...Type.small, color: p.muted },
    // Log out: an outline in the danger colour, not a pink slab.
    logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, borderWidth: 1, borderColor: p.red },
    logoutText: { ...Type.bodyStrong, color: p.red },
    error: { ...Type.small, color: p.red },
    dangerSection: { borderTopWidth: Rule, borderTopColor: p.border, paddingTop: Gap.group, gap: Gap.inner },
    dangerTitle: { ...Type.title, color: p.red },
    dangerBody: { ...Type.small, color: p.muted },
    dangerBtn: { height: 48, borderRadius: 24, backgroundColor: p.red, alignItems: 'center', justifyContent: 'center' },
    dangerBtnText: { ...Type.bodyStrong, color: '#FFFFFF' },
  });
}
