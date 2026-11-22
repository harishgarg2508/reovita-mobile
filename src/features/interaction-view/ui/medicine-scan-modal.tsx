import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActiveConsent, useGrantConsentType } from '@entities/consent';
import type { MedicineScanPhoto, ScannedMedicine } from '@entities/interaction-finding';
import { tapConfirm, tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';

import { useMedicineScan } from '../model/use-medicine-scan';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const FAILURES: Record<string, string> = {
  no_medicine_found: 'I could not find a medicine in that photo. Hold the pack close, in good light, with the name facing the camera.',
  llm_unavailable: 'The scanning service is busy right now. Try again in a moment.',
  rate_limited: 'You have scanned a lot today. Try again tomorrow.',
  unsupported_file: 'Only JPEG and PNG photos can be scanned.',
  photo_too_large: 'That photo is too big. Choose one under 5 MB.',
  llm_consent_required: 'Allow the scanning service first, then try again.',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  // Called with the medicine the person chose from what was read.
  onPick: (picked: { alias: string; ingredient_ids: string[] }) => void;
}

// Scan a medicine strip, box or bottle with the camera (or a photo from the phone). The person agrees once to send the photo to the scanning service; the photo
// is sent once and never saved. The names read from it are listed, and the person taps the one to use.
export function MedicineScanModal({ visible, onClose, onPick }: Props) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const llm = useActiveConsent('llm_processing');
  const grant = useGrantConsentType();
  const scan = useMedicineScan();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [error, setError] = useState<string | null>(null);

  function close() {
    scan.reset();
    setError(null);
    onClose();
  }

  function send(photo: MedicineScanPhoto) {
    setError(null);
    scan.scan(photo);
  }

  async function agree() {
    try {
      await grant.mutateAsync('llm_processing');
    } catch {
      setError('Could not save your choice. Try again.');
    }
  }

  async function choose() {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], multiple: false, copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (asset.size && asset.size > MAX_PHOTO_BYTES) {
        setError('Choose a photo under 5 MB.');
        return;
      }
      send({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' });
    } catch {
      setError('Could not open your photos.');
    }
  }

  async function snap() {
    if (!cameraRef.current) return;
    tapConfirm();
    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (captured?.uri) send({ uri: captured.uri, name: 'medicine-scan.jpg', type: 'image/jpeg' });
    } catch {
      setError('Could not take the photo. Try again.');
    }
  }

  function use(medicine: ScannedMedicine) {
    if (!medicine.match) return;
    tapSelection();
    onPick(medicine.match);
    close();
  }

  const showCamera = llm.granted && scan.phase === 'idle';
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.screen, { backgroundColor: showCamera && permission?.granted ? '#000000' : p.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10}>
            <Ionicons name="close" size={28} color={showCamera && permission?.granted ? '#FFFFFF' : p.text} />
          </Pressable>
        </View>

        {llm.isPending ? <ActivityIndicator color={p.accent} style={styles.center} /> : null}

        {!llm.isPending && !llm.granted ? (
          <View style={styles.panel}>
            <Ionicons name="scan-outline" size={44} color={p.accent} />
            <Text style={[styles.title, { color: p.text }]}>Scan a medicine pack</Text>
            <Text style={[styles.body, { color: p.muted }]}>
              To read the name on a strip, box or bottle, the photo is sent once to the scanning service. It is not saved, and only the names printed on the pack are kept for a few minutes so you can pick one.
            </Text>
            <Pressable accessibilityRole="button" disabled={grant.isPending} onPress={() => void agree()} style={[styles.primary, { backgroundColor: p.accent }]}>
              {grant.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Allow and continue</Text>}
            </Pressable>
          </View>
        ) : null}

        {showCamera ? (
          permission?.granted ? (
            <>
              <CameraView ref={cameraRef} facing="back" style={styles.camera} />
              <Text style={styles.hint}>Hold the pack close so the name is in view</Text>
              <View style={styles.shutterRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo" onPress={() => void choose()} hitSlop={10} style={styles.side}>
                  <Ionicons name="images-outline" size={28} color="#FFFFFF" />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={() => void snap()} style={styles.shutter}>
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.side} />
              </View>
            </>
          ) : (
            <View style={styles.panel}>
              <Ionicons name="camera-outline" size={44} color={p.accent} />
              <Text style={[styles.body, { color: p.muted, textAlign: 'center' }]}>Allow the camera to take a photo of the pack, or choose a photo you already have.</Text>
              <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={[styles.primary, { backgroundColor: p.accent }]}>
                <Text style={styles.primaryText}>Allow camera</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void choose()} style={[styles.secondary, { borderColor: p.border }]}>
                <Text style={[styles.secondaryText, { color: p.text }]}>Choose a photo</Text>
              </Pressable>
            </View>
          )
        ) : null}

        {scan.phase === 'working' ? (
          <View style={styles.panel}>
            <ActivityIndicator color={p.accent} size="large" />
            <Text style={[styles.body, { color: p.muted }]}>Reading the pack...</Text>
          </View>
        ) : null}

        {scan.phase === 'failed' ? (
          <View style={styles.panel}>
            <Ionicons name="alert-circle-outline" size={40} color={p.red} />
            <Text style={[styles.body, { color: p.text, textAlign: 'center' }]}>{FAILURES[scan.failure ?? ''] ?? 'The scan could not be done. Try again.'}</Text>
            <Pressable accessibilityRole="button" onPress={scan.reset} style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {scan.phase === 'done' && scan.result ? (
          <View style={styles.panel}>
            <Text style={[styles.title, { color: p.text }]}>Which medicine?</Text>
            <Text style={[styles.body, { color: p.muted, textAlign: 'center' }]}>Tap the one to check. Check the name against your pack.</Text>
            {scan.result.medicines.map((m, index) => (
              <Pressable
                key={`${m.brand}-${m.generic}-${index}`}
                accessibilityRole="button"
                disabled={!m.match}
                onPress={() => use(m)}
                style={[styles.row, { backgroundColor: p.card, borderColor: m.match ? p.accent : p.border, opacity: m.match ? 1 : 0.6 }]}>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: p.text }]}>{m.brand || m.generic}</Text>
                  <Text numberOfLines={2} style={[styles.rowSub, { color: p.muted }]}>
                    {[m.brand ? m.generic : '', m.strength].filter(Boolean).join(' · ') || 'Read from the pack'}
                  </Text>
                  <Text style={[styles.rowSub, { color: m.match ? p.accent : p.muted }]}>{m.match ? `Matched: ${m.match.alias}` : 'Not found in our drug list'}</Text>
                </View>
                {m.match ? <Ionicons name="chevron-forward" size={18} color={p.muted} /> : null}
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={scan.reset} hitSlop={8}>
              <Text style={[styles.link, { color: p.muted }]}>Scan another pack</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={[styles.error, { color: p.red }]}>{error}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'flex-start' },
  center: { marginTop: 40 },
  panel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  primary: { alignSelf: 'stretch', height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondary: { alignSelf: 'stretch', height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  camera: { flex: 1, marginHorizontal: 8, borderRadius: 18, overflow: 'hidden' },
  hint: { color: '#FFFFFF', textAlign: 'center', fontSize: 13, marginTop: 10 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 12 },
  side: { width: 40, alignItems: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFFFFF' },
  row: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, padding: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowSub: { fontSize: 12.5, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  error: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, marginTop: 8 },
});
