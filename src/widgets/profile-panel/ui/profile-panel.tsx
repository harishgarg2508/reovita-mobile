import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConsentGrants, useGrantConsentType, useRevokeConsent, type ConsentType } from '@entities/consent';
import { useCurrentSubject } from '@entities/subject';
import { useDeactivateAccount } from '@features/account-deactivate';
import { ProfileDetailsCard } from '@features/profile-details';
import { tapConfirm } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';
import { Skeleton } from '@shared/ui/skeleton';

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
export function ProfilePanel({ onSignOut }: { onSignOut: () => void }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Show this code to link your health records.</Text>
        </View>
      </View>

      {/* Code card: QR on the left, code and actions on the right, log out below. */}
      <View style={styles.card}>
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
            <View style={styles.codeLabelRow}>
              <Ionicons name="qr-code-outline" size={16} color={p.accent} />
              <Text style={styles.codeLabel}>Your Unique Code</Text>
            </View>
            <Text selectable style={styles.code}>
              {codename ?? '-'}
            </Text>
            <Pressable accessibilityRole="button" onPress={copyCode} disabled={!codename} style={styles.outlineBtn}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={p.accent} />
              <Text style={styles.outlineBtnText}>{copied ? 'Copied' : 'Copy Code'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={shareCode} disabled={!codename} style={styles.solidBtn}>
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
              <Text style={styles.solidBtnText}>Share Code</Text>
            </Pressable>
          </View>
        </View>
        )}
        {subject.isError ? <Text style={styles.error}>Could not load your code. Reopen this tab to try again.</Text> : null}

        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color={p.red} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {/* My details: the basics, history and lifestyle saved in onboarding, each with an Edit action. */}
      <ProfileDetailsCard />

      {/* Permissions card: toggles follow the consent records on the server. */}
      <View style={styles.card}>
        <View style={styles.permHeader}>
          <View style={styles.lockBubble}>
            <Ionicons name="lock-closed-outline" size={22} color={p.accent} />
          </View>
          <View style={styles.permHeaderText}>
            <Text style={styles.permTitle}>Permissions</Text>
            <Text style={styles.permSubtitle}>You can control what data and features are accessible to this application.</Text>
          </View>
        </View>

        {consents.isLoading ? <Skeleton height={72} /> : null}
        {PERMISSIONS.map((item) => {
          const granted = consents.granted.has(item.type);
          return (
            <View key={item.type} style={styles.permRow}>
              <View style={styles.permIcon}>
                <Ionicons name={item.icon} size={20} color={p.accent} />
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
        {consents.isError ? <Text style={styles.error}>Could not load your permissions.</Text> : null}
      </View>

      {/* Danger zone: deactivating hides the account. It is recoverable, so nothing is deleted. */}
      <View style={styles.dangerCard}>
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
    scroll: { flex: 1, backgroundColor: p.surface },
    container: { paddingHorizontal: 18, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerText: { flex: 1, gap: 4 },
    title: { fontSize: 28, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.accent },
    bell: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: p.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: p.border,
      padding: 18,
      gap: 16,
    },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    qrBox: {
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: '#FFFFFF',
    },
    codeSide: { flex: 1, gap: 10 },
    codeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    codeLabel: { fontSize: 13, color: p.accent },
    code: { fontSize: 24, fontWeight: '800', color: p.textStrong, letterSpacing: 0.5 },
    outlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: p.accent,
    },
    outlineBtnText: { fontSize: 14, fontWeight: '600', color: p.accent },
    solidBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.accent,
    },
    solidBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 48,
      borderRadius: 24,
      backgroundColor: p.redSoft,
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: p.red },
    permHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    lockBubble: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: p.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permHeaderText: { flex: 1, gap: 4 },
    permTitle: { fontSize: 18, fontWeight: '800', color: p.textStrong },
    permSubtitle: { fontSize: 12.5, lineHeight: 17, color: p.muted },
    permRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: p.surface,
    },
    permIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permText: { flex: 1, gap: 2 },
    permRowTitle: { fontSize: 14.5, fontWeight: '700', color: p.textStrong },
    permRowBody: { fontSize: 12.5, lineHeight: 17, color: p.muted },
    error: { fontSize: 13, color: p.red },
    dangerCard: {
      backgroundColor: p.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: p.red,
      padding: 18,
      gap: 12,
    },
    dangerTitle: { fontSize: 18, fontWeight: '800', color: p.red },
    dangerBody: { fontSize: 12.5, lineHeight: 17, color: p.muted },
    dangerBtn: {
      height: 46,
      borderRadius: 23,
      backgroundColor: p.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });
}
