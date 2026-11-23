import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, useScrollToTopOnFocus } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useActiveConsent, useGrantConsentType } from '@entities/consent';
import { useDeleteFoodScan, useFoodScans, type FoodScanKind, type FoodScanView, type MealScanResult, type ScanPhoto } from '@entities/food-scan';

import { useScanFood } from '../model/use-scan-food';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const COPY: Record<FoodScanKind, { title: string; intro: string; working: string; empty: string; cta: string }> = {
  meal: {
    title: 'Scan my meal',
    intro: 'Take a photo of your plate. You get an estimate of the calories, protein, carbohydrate and fat, and how the meal sits in your day.',
    working: 'Looking at your meal...',
    empty: 'Your scanned meals show here.',
    cta: 'Scan this meal',
  },
  fridge: {
    title: 'Scan my fridge',
    intro: 'Take a photo of your fridge or kitchen shelf. You get the food that was seen and a few simple meals you can make from it.',
    working: 'Looking at your fridge...',
    empty: 'Your scanned fridges show here.',
    cta: 'Scan this photo',
  },
};

const FAILURES: Record<string, string> = {
  no_food_found: 'I could not find food in that photo. Try again with the food in view and good light.',
  llm_unavailable: 'The scanning service is busy right now. Try again in a moment.',
  rate_limited: 'You have scanned a lot today. Try again tomorrow.',
  unsupported_file: 'Only JPEG and PNG photos can be scanned.',
  photo_too_large: 'That photo is too big. Choose one under 5 MB.',
  food_image_consent_required: 'Allow food photos first, then try again.',
  llm_consent_required: 'Allow food photos first, then try again.',
};

// Scan My Meal and Scan My Fridge. The person agrees once to send food photos to the scanning service, then takes or chooses a photo and scans it. The
// photo is sent once and never saved on the server; only the answer is kept, and it can be deleted from the list below.
export function ScanScreen({ kind }: { kind: FoodScanKind }) {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = COPY[kind];
  const food = useActiveConsent('food_image');
  const llm = useActiveConsent('llm_processing');
  const grant = useGrantConsentType();
  const scan = useScanFood(kind);
  const history = useFoodScans(kind);
  const remove = useDeleteFoodScan();
  // The photo chosen and not scanned yet. Scanning it clears this, so the screen is fresh again when the person comes back from the answer.
  const [chosen, setChosen] = useState<ScanPhoto | null>(null);
  // The photo being scanned. While the scan runs it is shown; if the scan fails it comes back so the person can try the same photo again.
  const [scanning, setScanning] = useState<ScanPhoto | null>(null);
  const photo = chosen ?? (scan.phase === 'working' || scan.phase === 'failed' ? scanning : null);
  const setPhoto = setChosen;
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [deleting, setDeleting] = useState<FoodScanView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // A finished scan opens its answer, once.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (scan.phase === 'done' && scan.scanId && opened.current !== scan.scanId) {
      opened.current = scan.scanId;
      router.push({ pathname: '/(app)/food-scan/[id]', params: { id: scan.scanId } } as Href);
    }
  }, [scan.phase, scan.scanId, router]);

  const consented = food.granted && llm.granted;
  const consentLoading = food.isPending || llm.isPending;

  async function agree() {
    try {
      if (!food.granted) await grant.mutateAsync('food_image');
      if (!llm.granted) await grant.mutateAsync('llm_processing');
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
      setPhoto({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' });
    } catch {
      setError('Could not open your photos.');
    }
  }

  async function snap() {
    if (!cameraRef.current) return;
    tapConfirm();
    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (captured?.uri) {
        setPhoto({ uri: captured.uri, name: `${kind}-scan.jpg`, type: 'image/jpeg' });
        setCameraOpen(false);
      }
    } catch {
      setError('Could not take the photo. Try again.');
    }
  }

  const back = () => goBackOr(router, '/(app)/(tabs)/dashboard' as Href);

  if (cameraOpen) {
    return (
      <View style={[styles.cameraScreen, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.cameraBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={() => setCameraOpen(false)} hitSlop={10}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
        {permission?.granted ? (
          <CameraView ref={cameraRef} facing="back" style={styles.camera} />
        ) : (
          <View style={styles.cameraAsk}>
            <Ionicons name="camera-outline" size={44} color="#FFFFFF" />
            <Text style={styles.cameraAskText}>Allow the camera to take a photo of your food.</Text>
            <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Allow camera</Text>
            </Pressable>
          </View>
        )}
        {permission?.granted ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={() => void snap()} style={styles.shutter}>
            <View style={styles.shutterInner} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>{copy.title}</Text>
        {/* The clock opens every earlier scan of this kind, the same button as on Dietary guidance. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={kind === 'fridge' ? 'My earlier fridge scans' : 'My earlier meal scans'}
          hitSlop={8}
          onPress={() => router.push((kind === 'fridge' ? '/(app)/fridge-history' : '/(app)/meal-history') as Href)}
          style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="time-outline" size={19} color={p.text} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: p.muted }]}>{copy.intro}</Text>

        {consentLoading ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}

        {!consentLoading && !consented ? (
          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[styles.cardTitle, { color: p.text }]}>Allow food photos</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              To read a photo, it is sent once to our AI service, together with your diet type and goal if you chose them. The photo is kept with the answer on your account, so you can see it next to the result, and you can delete the scan (and its photo) any time. You can take this permission back in Settings.
            </Text>
            <Pressable accessibilityRole="button" disabled={grant.isPending} onPress={() => void agree()} style={[styles.primary, { backgroundColor: p.accent }]}>
              {grant.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>I agree</Text>}
            </Pressable>
          </View>
        ) : null}

        {consented && scan.phase === 'working' ? (
          <View style={[styles.card, styles.center, { backgroundColor: p.card, borderColor: p.border }]}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" /> : null}
            <ActivityIndicator color={p.accent} />
            <Text style={[styles.cardText, { color: p.muted }]}>{copy.working}</Text>
          </View>
        ) : null}

        {consented && scan.phase !== 'working' ? (
          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
            {photo ? (
              <>
                <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
                <Pressable accessibilityRole="button" onPress={() => { scan.reset(); setScanning(photo); setChosen(null); scan.scan(photo); }} style={[styles.primary, { backgroundColor: p.accent }]}>
                  <Text style={styles.primaryText}>{copy.cta}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => { scan.reset(); setScanning(null); setChosen(null); }} style={[styles.secondary, { borderColor: p.accent, borderWidth: 1.5 }]}>
                  <Text style={[styles.secondaryText, { color: p.text }]}>Use a different photo</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable accessibilityRole="button" onPress={() => { setError(null); setCameraOpen(true); }} style={[styles.primary, { backgroundColor: p.accent }]}>
                  <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Take a photo</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => void choose()} style={[styles.secondary, { borderColor: p.accent, borderWidth: 1.5 }]}>
                  <Ionicons name="image-outline" size={18} color={p.text} />
                  <Text style={[styles.secondaryText, { color: p.text }]}>Choose a photo</Text>
                </Pressable>
              </>
            )}
            {scan.failure ? <Text style={[styles.error, { color: p.red }]}>{FAILURES[scan.failure] ?? 'Something went wrong. Try again in a moment.'}</Text> : null}
          </View>
        ) : null}
        {error ? <Text style={[styles.error, { color: p.red }]}>{error}</Text> : null}

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: p.text, marginTop: 0 }]}>Recent scans</Text>
          {(history.data?.length ?? 0) > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={kind === 'fridge' ? 'See all fridge scans' : 'See all meal scans'} hitSlop={8} onPress={() => router.push((kind === 'fridge' ? '/(app)/fridge-history' : '/(app)/meal-history') as Href)}>
              <Text style={[styles.seeAll, { color: p.accent }]}>See all</Text>
            </Pressable>
          ) : null}
        </View>
        {history.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 12 }} /> : null}
        {history.data?.length === 0 ? <Text style={[styles.cardText, { color: p.muted }]}>{copy.empty}</Text> : null}
        {history.data?.map((item) => (
          // The row is not one button holding another: the open area and the delete button are side by side (a button cannot contain a button on the web).
          <View key={item.id} style={[styles.historyRow, { backgroundColor: p.card, borderColor: p.border }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/(app)/food-scan/[id]', params: { id: item.id } } as Href)}
              style={styles.historyText}>
              <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text }]}>{kind === 'meal' ? (item.result as MealScanResult).dish_name : `${'ingredients' in item.result ? item.result.ingredients.length : 0} foods seen`}</Text>
              <Text style={[styles.cardText, { color: p.muted }]}>
                {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {kind === 'meal' ? ` · ${(item.result as MealScanResult).total.calories} kcal` : ''}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete scan" hitSlop={8} onPress={() => setDeleting(item)}>
              <Ionicons name="trash-outline" size={18} color={p.muted} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this scan?"
        message="It is removed from your history. This cannot be undone."
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSettled: () => setDeleting(null) });
        }}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 8 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 40, height: 40 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, letterSpacing: -0.2 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  intro: { fontSize: 14, lineHeight: 20 },
  card: { padding: 4, gap: 12 },
  center: { alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardText: { fontSize: 13.5, lineHeight: 19 },
  preview: { width: '100%', height: 220, borderRadius: 14 },
  primary: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  secondary: { height: 46, borderRadius: 23, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { fontSize: 14.5, fontWeight: '700' },
  error: { fontSize: 13, lineHeight: 18 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  seeAll: { fontSize: 14, fontWeight: '800' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 4 },
  historyText: { flex: 1, minWidth: 0, gap: 2 },
  cameraScreen: { flex: 1, backgroundColor: '#000000', gap: 12 },
  cameraBar: { paddingHorizontal: 16 },
  camera: { flex: 1 },
  cameraAsk: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  cameraAskText: { color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  shutter: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
});
