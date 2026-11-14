import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@shared/api';
import { usePalette, type Palette } from '@shared/ui/theme';

import { fetchAccessStatus, fetchAccessSummary, openAccessFile, requestAccess, type AccessFile, type AccessSummary } from '../model/access-api';

type Phase =
  | { kind: 'choose' }
  | { kind: 'code' }
  | { kind: 'scanning' }
  | { kind: 'waiting'; id: string }
  | { kind: 'summary'; summary: AccessSummary; requestId: string }
  | { kind: 'message'; text: string }
  | { kind: 'denied' };

// Scan a subject's QR code. The subject is asked to approve. Nothing is shown until they do.
type ScanParams = { qr?: string; code?: string };

function phaseFromParams(params: ScanParams): Phase {
  if (params.qr === 'true') return { kind: 'scanning' };
  if (params.code === 'true') return { kind: 'code' };
  return { kind: 'choose' };
}

export function ScanScreen() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const params = useLocalSearchParams<ScanParams>();
  const [phase, setPhase] = useState<Phase>(() => phaseFromParams(params));
  // Follow the URL: a change to ?qr or ?code switches the screen.
  useEffect(() => {
    setPhase(phaseFromParams(params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.qr, params.code]);
  // Back to the two options: clears the query, so the address shows /scan again.
  const resetToChoose = () => {
    setPhase({ kind: 'choose' });
    router.setParams({ qr: undefined, code: undefined });
  };
  const toDashboard = () => router.replace('/(app)/(tabs)/dashboard');
  const onHeaderBack = () => (phase.kind === 'choose' ? toDashboard() : resetToChoose());

  // Opens one medical history file of the approved subject. Shows an alert if the download fails.
  async function viewFile(requestId: string, file: AccessFile) {
    try {
      await openAccessFile(requestId, file);
    } catch {
      Alert.alert('Could not open this file', 'Check your connection and try again.');
    }
  }
  const [typedCode, setTypedCode] = useState('');
  // An error for the typed code, shown under the field so the user can correct it.
  const [codeError, setCodeError] = useState<string | null>(null);
  // True while the access request for a typed code is being sent, so the button shows a loader.
  const [asking, setAsking] = useState(false);
  const busy = useRef(false);

  // While waiting, check the answer every 2 seconds.
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    const id = phase.id;
    const timer = setInterval(async () => {
      try {
        const { status } = await fetchAccessStatus(id);
        if (status === 'approved') {
          clearInterval(timer);
          const summary = await fetchAccessSummary(id);
          setPhase({ kind: 'summary', summary, requestId: id });
        } else if (status === 'denied') {
          clearInterval(timer);
          setPhase({ kind: 'denied' });
        } else if (status === 'expired') {
          clearInterval(timer);
          setPhase({ kind: 'message', text: 'No answer in time. Scan again to ask once more.' });
        }
      } catch {
        clearInterval(timer);
        setPhase({ kind: 'message', text: 'Could not check the request. Try again.' });
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [phase]);

  async function onScanned(data: string, source: 'qr' | 'code' = 'qr') {
    if (busy.current) return;
    busy.current = true;
    setCodeError(null);
    try {
      const { id } = await requestAccess(data.trim());
      setPhase({ kind: 'waiting', id });
    } catch (err) {
      const text = isApiError(err, 'own_code')
        ? 'This is your own code. Ask someone else to scan it.'
        : isApiError(err, 'subject_not_found')
        ? 'No subject has this code. Check the code and try again.'
        : 'Could not send the request. Try again.';
      if (source === 'code') {
        // Stay on the code screen so the user can correct the code.
        setCodeError(text);
      } else {
        setPhase({ kind: 'message', text });
      }
    } finally {
      busy.current = false;
    }
  }

  const header = (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onHeaderBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color={p.text} />
      </Pressable>
      <Text style={styles.title}>Scan a code</Text>
    </View>
  );

  if (phase.kind === 'choose') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={toDashboard} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={22} color={p.accent} />
          </Pressable>
          <Text style={styles.brand}>Reovita</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Ionicons name="qr-code-outline" size={56} color={p.accent} />
          </View>
        </View>
        <Text style={styles.heroTitle}>Scan a code</Text>
        <Text style={styles.heroSub}>How do you want to find the subject?</Text>
        <Pressable accessibilityRole="button" onPress={() => router.setParams({ qr: 'true', code: undefined })} style={styles.bigPrimary}>
          <Ionicons name="scan-outline" size={26} color="#FFFFFF" />
          <Text style={styles.bigPrimaryText}>Scan QR code</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.setParams({ code: 'true', qr: undefined })} style={styles.bigSecondary}>
          <Ionicons name="keypad-outline" size={26} color={p.accent} />
          <Text style={styles.bigSecondaryText}>Enter code</Text>
          <Ionicons name="chevron-forward" size={20} color={p.accent} />
        </Pressable>
      </ScrollView>
    );
  }

  if (phase.kind === 'code') {
    const trimmed = typedCode.trim();
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onHeaderBack} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={22} color={p.accent} />
          </Pressable>
          <Text style={styles.brand}>Reovita</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Ionicons name="keypad-outline" size={56} color={p.accent} />
          </View>
        </View>
        <Text style={styles.heroTitle}>Enter code</Text>
        <Text style={styles.heroSub}>Type the subject's code, for example VT-1234-AB.</Text>
        <View style={styles.codeInputWrap}>
          <TextInput
            value={typedCode}
            onChangeText={setTypedCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="VT-1234-AB"
            placeholderTextColor={p.muted}
            style={styles.bigCodeInput}
          />
          {typedCode.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear code" onPress={() => setTypedCode('')} hitSlop={8} style={styles.clearBtn}>
              <Ionicons name="close" size={18} color={p.accent} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: asking, disabled: trimmed.length === 0 || asking }}
          disabled={trimmed.length === 0 || asking}
          onPress={async () => {
            setAsking(true);
            try {
              await onScanned(trimmed, 'code');
            } finally {
              setAsking(false);
            }
          }}
          style={[styles.bigPrimary, (trimmed.length === 0 || asking) && styles.disabled]}>
          {asking ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="lock-open-outline" size={24} color="#FFFFFF" />}
          <Text style={styles.bigPrimaryText}>{asking ? 'Asking...' : 'Ask for access'}</Text>
          {asking ? null : <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />}
        </Pressable>
        {codeError ? <Text style={styles.codeErrorText}>{codeError}</Text> : null}
      </ScrollView>
    );
  }

  if (phase.kind === 'summary') {
    const sum = phase.summary;
    const score = sum.score?.total ?? null;
    const alerts = buildAlerts(sum);
    const bp = sum.vitals.bp;
    const weight = sum.vitals.weight;
    const conditions = (sum.conditions ?? []).length ? (sum.conditions ?? []).map(conditionLabel) : ['None recorded'];
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.summaryContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        {header}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={p.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.codeLine}>{sum.codename}</Text>
            <Text style={styles.metaText}>
              {[sum.age !== null ? `${sum.age} years` : null, sum.sex ? capitalize(sum.sex) : null, sum.bmi !== null ? `BMI ${sum.bmi}` : null]
                .filter(Boolean)
                .join(' · ') || 'Profile not filled yet'}
            </Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <ScoreDial score={score} p={p} />
          <View style={styles.flex}>
            <Text style={styles.scoreTitle}>Overall Health Score</Text>
            <Text style={[styles.scoreBadge, { color: scoreColorFor(score) }]}>{scoreLabel(score)}</Text>
          </View>
        </View>

        <View style={styles.partsRow}>
          <PartTile label="Lifestyle" value={sum.score?.parts?.lifestyle ?? null} styles={styles} />
          <PartTile label="Conditions" value={sum.score?.parts?.conditions ?? null} styles={styles} />
          <PartTile label="Reports" value={sum.score?.parts?.reports ?? null} styles={styles} />
        </View>

        {alerts.length > 0 ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertHead}>Health Alerts</Text>
            {alerts.map((a) => (
              <View key={a.title} style={styles.alertRow}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertBody}>{a.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.twoCol}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Lifestyle</Text>
            <LifestyleRow label="Smoking" value={capitalize(sum.lifestyle?.smoking)} styles={styles} />
            <LifestyleRow label="Exercise" value={capitalize(sum.lifestyle?.exercise)} styles={styles} />
            <LifestyleRow label="Stress" value={sum.lifestyle?.stress != null ? `${sum.lifestyle.stress} / 5` : '-'} styles={styles} />
            <LifestyleRow label="Sleep" value={sum.lifestyle?.sleep != null ? `${sum.lifestyle.sleep} hours` : '-'} styles={styles} />
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Medical conditions</Text>
            <View style={styles.chipWrap}>
              {conditions.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.boxFull}>
          <Text style={styles.boxTitle}>Latest vitals</Text>
          <LifestyleRow label="Weight" value={weight ? `${weight.kg} kg` : '-'} styles={styles} />
          <LifestyleRow label="Blood pressure" value={bp ? `${bp.sys} / ${bp.dia} mmHg` : '-'} styles={styles} />
        </View>

        <View style={styles.boxFull}>
          <Text style={styles.boxTitle}>Family history</Text>
          {(sum.family_history ?? []).length === 0 ? (
            <Text style={styles.alertBody}>No family history recorded.</Text>
          ) : (
            (sum.family_history ?? []).map((f, i) => (
              <LifestyleRow
                key={`${f.relation}-${f.condition}-${i}`}
                label={RELATION_LABEL[f.relation] ?? capitalize(f.relation)}
                value={FAMILY_LABEL[f.condition] ?? capitalize(f.condition)}
                styles={styles}
              />
            ))
          )}
        </View>

        <View style={styles.boxFull}>
          <Text style={styles.boxTitle}>Medications</Text>
          {(sum.medications ?? []).length === 0 ? (
            <Text style={styles.alertBody}>No medications recorded.</Text>
          ) : (
            (sum.medications ?? []).map((m, i) => (
              <LifestyleRow key={`${m.name ?? 'medicine'}-${i}`} label={m.name ?? 'Medicine'} value={m.dose ?? '-'} styles={styles} />
            ))
          )}
        </View>

        <View style={styles.boxFull}>
          <Text style={styles.boxTitle}>Medical history</Text>
          {(sum.medical_history ?? []).length === 0 ? (
            <Text style={styles.alertBody}>No medical history entries yet.</Text>
          ) : (
            (sum.medical_history ?? []).map((h) => (
              <View key={h.id} style={styles.historyEntry}>
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineDate}>
                    {formatShortDate(h.occurred_on)}
                    {h.occurred_time ? ` · ${h.occurred_time}` : ''}
                  </Text>
                  <Text style={styles.timelineText}>{h.title}</Text>
                </View>
                {(h.medicines ?? []).length > 0 ? (
                  <Text style={styles.alertBody}>
                    {(h.medicines ?? []).map((m) => (m.dose ? `${m.name} (${m.dose})` : m.name)).join(', ')}
                  </Text>
                ) : null}
                {(h.files ?? []).map((file: AccessFile) => (
                  <View key={file.id} style={styles.summaryFile}>
                    <Ionicons name={file.kind === 'report' ? 'document-text-outline' : 'medkit-outline'} size={16} color={p.accent} />
                    <View style={styles.flex}>
                      <Text style={styles.alertTitle} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.alertBody}>{file.kind === 'report' ? 'Report' : 'Prescription'}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${file.name}`}
                      onPress={() => void viewFile(phase.requestId, file)}
                      hitSlop={8}>
                      <Ionicons name="eye-outline" size={18} color={p.accent} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
          {(sum.timeline ?? []).map((t, i) => (
            <View key={`${t.date}-${i}`} style={styles.timelineRow}>
              <Text style={styles.timelineDate}>{formatShortDate(t.date)}</Text>
              <Text style={styles.timelineText}>
                {t.flagged > 0 ? `${t.flagged} result${t.flagged === 1 ? '' : 's'} outside range` : 'All results in range'}
              </Text>
            </View>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={resetToChoose} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Scan Another</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (phase.kind === 'waiting') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onHeaderBack} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={22} color={p.accent} />
          </Pressable>
          <Text style={styles.brand}>Reovita</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <ActivityIndicator color={p.accent} size="large" />
          </View>
        </View>
        <Text style={styles.heroTitle}>Waiting for approval</Text>
        <Text style={styles.heroSub}>The subject is reviewing your request. This usually takes a few seconds.</Text>
      </ScrollView>
    );
  }

  if (phase.kind === 'message' || phase.kind === 'denied') {
    const denied = phase.kind === 'denied';
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onHeaderBack} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={22} color={p.accent} />
          </Pressable>
          <Text style={styles.brand}>Reovita</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Ionicons name={denied ? 'ban-outline' : 'close-circle-outline'} size={56} color={p.red} />
          </View>
        </View>
        <Text style={styles.heroTitle}>{denied ? 'Access denied' : 'Request ended'}</Text>
        <Text style={styles.heroSub}>{denied ? 'The subject denied this request. Scan their code again to ask once more.' : phase.text}</Text>
        <Pressable accessibilityRole="button" onPress={resetToChoose} style={styles.fitBtn}>
          <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
          <Text style={styles.fitBtnText} numberOfLines={1}>Scan again</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Scanning: ask for camera permission first.
  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + 12 }]}>
        {header}
        <Text style={styles.body}>Allow the camera to scan a Reovita code.</Text>
        <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {header}
      <View style={styles.cameraBox}>
        <CameraView
          facing="back"
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => void onScanned(data)}
        />
      </View>
      <Text style={styles.body}>Point the camera at the QR code on the subject's phone.</Text>
    </View>
  );
}

function scoreLabel(score: number | null): string {
  if (score === null) return 'Not calculated yet';
  if (score >= 70) return 'Good Health';
  if (score >= 40) return 'Needs Care';
  return 'Needs Attention';
}

// The one-word status shown inside the ring instead of the number.
function scoreShortLabel(score: number | null): string {
  if (score === null) return '-';
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Care';
  return 'Attention';
}

function scoreColorFor(score: number | null): string {
  if (score === null) return '#655F74';
  if (score >= 70) return '#1F7A3E';
  if (score >= 40) return '#B26A00';
  return '#C22F43';
}

function capitalize(value: string | null | undefined): string {
  if (!value) return '-';
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Family history condition and relation labels, as the onboarding form shows them.
const FAMILY_LABEL: Record<string, string> = {
  diabetes: 'Diabetes',
  cvd: 'Heart disease',
  cancer: 'Cancer',
  thyroid: 'Thyroid',
  kidney: 'Kidney disease',
};
const RELATION_LABEL: Record<string, string> = { father: 'Father', mother: 'Mother', sibling: 'Sibling(s)', wife: 'Wife' };

function conditionLabel(tag: string): string {
  const labels: Record<string, string> = {
    diabetes: 'Diabetes',
    hypertension: 'Hypertension',
    thyroid: 'Thyroid',
    cvd: 'Heart disease',
    ckd: 'Kidney disease',
    other: 'Other',
  };
  return labels[tag] ?? capitalize(tag);
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Plausibility checks on the latest vitals. A reading that fails them is flagged for review, not rejected.
function buildAlerts(sum: AccessSummary): { title: string; body: string }[] {
  const alerts: { title: string; body: string }[] = [];
  const bp = sum.vitals.bp;
  if (bp && (bp.sys >= 180 || bp.sys < 90 || bp.dia >= 120 || bp.dia < 60)) {
    alerts.push({
      title: 'Blood pressure reading needs verification',
      body: `Latest recorded values are ${bp.sys} systolic and ${bp.dia} diastolic. These are unusual and may indicate an incorrect entry.`,
    });
  }
  const weights = (sum.vitals.readings ?? []).filter((r) => r.type === 'weight_kg').map((r) => r.value);
  if (weights.length >= 2) {
    const spread = Math.max(...weights) - Math.min(...weights);
    if (spread > 5) {
      alerts.push({
        title: 'Weight discrepancy',
        body: `Recent weight readings differ by ${Math.round(spread * 10) / 10} kg. The latest entry may need review.`,
      });
    }
  }
  return alerts;
}

function ScoreDial({ score, p }: { score: number | null; p: Palette }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const fraction = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={104} height={104} viewBox="0 0 104 104">
        <Circle cx="52" cy="52" r={radius} stroke={p.border} strokeWidth={9} fill="none" />
        <Circle
          cx="52"
          cy="52"
          r={radius}
          stroke={scoreColorFor(score)}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 14, fontWeight: '800', color: scoreColorFor(score) }}>{scoreShortLabel(score)}</Text>
    </View>
  );
}

function PartTile({ label, value, styles }: { label: string; value: number | null; styles: Styles }) {
  return (
    <View style={styles.partTile}>
      <Text style={[styles.partValue, { color: scoreColorFor(value) }]}>{scoreShortLabel(value)}</Text>
      <Text style={styles.partLabel}>{label}</Text>
    </View>
  );
}

function LifestyleRow({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.lifestyleRow}>
      <Text style={styles.lifestyleLabel}>{label}</Text>
      <Text style={styles.lifestyleValue}>{value}</Text>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    container: { flex: 1, backgroundColor: p.bg, paddingHorizontal: 20, gap: 14, paddingBottom: 24 },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
    title: { fontSize: 24, fontWeight: '800', color: p.textStrong },
    body: { fontSize: 14, lineHeight: 20, color: p.muted, textAlign: 'center' },
    metaText: { fontSize: 14, lineHeight: 20, color: p.muted, textAlign: 'left' },
    label: { fontSize: 12.5, color: p.muted, marginTop: 8 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: p.textStrong },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 18, gap: 4 },
    cameraBox: { flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' },
    primaryBtn: { height: 48, borderRadius: 16, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    fitBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 26, paddingHorizontal: 28, backgroundColor: '#1F6F3F' },
    fitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flexShrink: 0 },
    secondaryBtn: { height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: p.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    secondaryText: { fontSize: 15, fontWeight: '700', color: p.accent },
    codeInput: { alignSelf: 'stretch', height: 52, borderRadius: 16, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, paddingHorizontal: 16, fontSize: 18, color: p.textStrong, letterSpacing: 1 },
    disabled: { opacity: 0.5 },
    flex: { flex: 1 },
    summaryContent: { paddingHorizontal: 20, gap: 14 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    codeLine: { fontSize: 20, fontWeight: '800', color: p.textStrong },
    scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 22, backgroundColor: p.card, borderWidth: 1, borderColor: p.border },
    scoreTitle: { fontSize: 15, fontWeight: '700', color: p.textStrong },
    scoreBadge: { fontSize: 14, fontWeight: '700', marginTop: 4 },
    partsRow: { flexDirection: 'row', gap: 10 },
    partTile: { flex: 1, padding: 12, borderRadius: 18, backgroundColor: p.card, borderWidth: 1, borderColor: p.border, alignItems: 'center', gap: 2 },
    partValue: { fontSize: 16, fontWeight: '800', color: p.textStrong },
    partLabel: { fontSize: 12, color: p.muted },
    alertCard: { padding: 14, borderRadius: 18, backgroundColor: p.redSoft, borderWidth: 1, borderColor: '#F3B5BE', gap: 10 },
    alertHead: { fontSize: 15, fontWeight: '800', color: p.red },
    alertRow: { gap: 2 },
    alertTitle: { fontSize: 13, fontWeight: '700', color: p.textStrong },
    alertBody: { fontSize: 12.5, lineHeight: 18, color: p.muted },
    historyEntry: { gap: 4 },
    summaryFile: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface },
    twoCol: { flexDirection: 'row', gap: 10 },
    box: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: p.card, borderWidth: 1, borderColor: p.border, gap: 8 },
    // Full-width cards: no flex, so their height follows their content and they never overlap the button below.
    boxFull: { padding: 14, borderRadius: 18, backgroundColor: p.card, borderWidth: 1, borderColor: p.border, gap: 8 },
    boxTitle: { fontSize: 14, fontWeight: '800', color: p.textStrong },
    lifestyleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
    lifestyleLabel: { fontSize: 12.5, color: p.muted },
    lifestyleValue: { fontSize: 12.5, fontWeight: '700', color: p.textStrong },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: p.accentSoft },
    chipText: { fontSize: 12, fontWeight: '700', color: p.accent },
    timelineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    timelineDate: { fontSize: 12.5, fontWeight: '700', color: p.textStrong },
    timelineText: { fontSize: 12.5, color: p.muted, flexShrink: 1, textAlign: 'right' },
    codeErrorText: { fontSize: 14, fontWeight: '600', color: p.red, textAlign: 'center' },
    codeInputWrap: { position: 'relative', justifyContent: 'center' },
    clearBtn: { position: 'absolute', right: 16, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.accentSoft },
    bigCodeInput: { height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: p.accent, backgroundColor: p.card, paddingLeft: 24, paddingRight: 52, fontSize: 18, color: p.textStrong, letterSpacing: 1, textAlign: 'center' },
    centerBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    codeSubmit: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 0 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    backCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: p.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.border },
    brand: { fontSize: 18, fontWeight: '800', color: p.textStrong },
    hero: { alignItems: 'center', marginTop: 8 },
    heroCircle: { width: 200, height: 200, borderRadius: 100, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 30, fontWeight: '800', color: p.textStrong, textAlign: 'center', marginTop: 12 },
    heroSub: { fontSize: 15, color: p.muted, textAlign: 'center', marginBottom: 8 },
    bigPrimary: { height: 62, borderRadius: 31, backgroundColor: p.accent, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 14 },
    bigPrimaryText: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    bigSecondary: { height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: p.accent, backgroundColor: p.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 14 },
    bigSecondaryText: { flex: 1, fontSize: 17, fontWeight: '700', color: p.accent },
    tipCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: p.accentSoft, marginTop: 8 },
    tipText: { flex: 1, fontSize: 13, lineHeight: 19, color: p.text },
  });
}
