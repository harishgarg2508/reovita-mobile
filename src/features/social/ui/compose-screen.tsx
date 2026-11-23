import { SOCIAL_TOPICS } from '@entities/social';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';

import { SOCIAL_HOME } from '../model/routes';
import { useCreatePost } from '../model/use-social-actions';

const MAX_CHARS = 500;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
// The most pictures in one post (the server allows the same).
const MAX_PHOTOS = 5;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SPACING = 2;
const TILE_SIZE = Math.floor((SCREEN_WIDTH - GRID_SPACING * 2) / 3);

type Photo = { uri: string; name: string; type: string };
type ComposeMode = 'gallery' | 'camera' | 'caption';

export function ComposeScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const create = useCreatePost();

  // Screen flow modes: 'gallery' (media picker) -> 'camera' (live viewfinder) -> 'caption' (details & share)
  const [mode, setMode] = useState<ComposeMode>('gallery');
  const [text, setText] = useState('');
  // Up to MAX_PHOTOS pictures, in the order they were chosen. The first is the one shown large.
  const [photos, setPhotos] = useState<Photo[]>([]);
  const photo = photos[0] ?? null;
  const [photoError, setPhotoError] = useState<string | null>(null);
  // An optional topic, so others who care about the same habit can find the post. Tapping the chosen one again clears it.
  const [topic, setTopic] = useState<string | null>(null);
  // Add my check-in streak for the topic as a stamp on the post (it also checks me in for that habit today).
  const [stamp, setStamp] = useState(false);

  // Camera settings
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [showGrid, setShowGrid] = useState(true);
  const [takingPicture, setTakingPicture] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const canPost = (text.trim().length > 0 || photo !== null) && !create.isPending;

  // Pick photos from device files or gallery, up to MAX_PHOTOS in all.
  async function pickPhoto() {
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setPhotoError(`A post has up to ${MAX_PHOTOS} photos. Tap one to take it out.`);
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const fit = picked.assets.filter((asset) => !asset.size || asset.size <= MAX_PHOTO_BYTES);
      const chosen = fit.slice(0, room);
      if (fit.length < picked.assets.length) setPhotoError('Photos must be under 5 MB each. Some were left out.');
      else if (fit.length > room) setPhotoError(`A post has up to ${MAX_PHOTOS} photos. The first ${room} were added.`);
      if (chosen.length === 0) return;
      setPhotos((current) => [...current, ...chosen.map((asset) => ({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' }))]);
      tapSelection();
    } catch {
      setPhotoError('Could not open photos.');
    }
  }

  // Snap photo from the live camera viewfinder
  async function snapPhoto() {
    if (!cameraRef.current || takingPicture) return;
    setTakingPicture(true);
    tapConfirm();
    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (captured?.uri) {
        setPhotos((current) => (current.length >= MAX_PHOTOS ? current : [...current, { uri: captured.uri, name: `camera-post-${current.length + 1}.jpg`, type: 'image/jpeg' }]));
        setMode('gallery');
      }
    } catch {
      setPhotoError('Could not capture photo. Try again.');
    } finally {
      setTakingPicture(false);
    }
  }

  function handleClose() {
    goBackOr(router, SOCIAL_HOME);
  }

  function submit() {
    if (!canPost) return;
    tapConfirm();
    create.mutate(
      { body: text.trim(), topic, stamp: stamp && topic !== null, photos },
      { onSuccess: () => goBackOr(router, SOCIAL_HOME) },
    );
  }

  // -------------------------------------------------------------
  // 1. LIVE CAMERA SCREEN (Image 1)
  // -------------------------------------------------------------
  if (mode === 'camera') {
    return (
      <View style={[styles.screenDark, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
        {/* Camera Top Bar */}
        <View style={styles.cameraTopBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to gallery" onPress={() => setMode('gallery')} hitSlop={10}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Flash ${flash === 'on' ? 'off' : 'on'}`}
            onPress={() => setFlash((f) => (f === 'on' ? 'off' : 'on'))}
            hitSlop={10}>
            <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle rule of thirds grid"
            onPress={() => setShowGrid((g) => !g)}
            hitSlop={10}>
            <Ionicons name={showGrid ? 'grid' : 'grid-outline'} size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Viewfinder with 3x3 Rule of Thirds Grid Overlay */}
        <View style={styles.viewfinderBox}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              facing={facing}
              flash={flash}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={44} color="#FFFFFF" />
              <Text style={styles.permissionTitle}>Camera access required</Text>
              <Text style={styles.permissionSubtitle}>Allow access to take photos for your posts.</Text>
              <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.permissionBtn}>
                <Text style={styles.permissionBtnText}>Enable Camera</Text>
              </Pressable>
            </View>
          )}

          {/* 3x3 Rule-of-Thirds Grid Lines */}
          {showGrid ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={[styles.gridLineH, { top: '33.33%' }]} />
              <View style={[styles.gridLineH, { top: '66.67%' }]} />
              <View style={[styles.gridLineV, { left: '33.33%' }]} />
              <View style={[styles.gridLineV, { left: '66.67%' }]} />
            </View>
          ) : null}
        </View>

        {/* Camera Bottom Controls Bar */}
        <View style={styles.cameraBottomBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Gallery" onPress={() => setMode('gallery')} style={styles.cameraSideBtn}>
            <Ionicons name="images-outline" size={28} color="#FFFFFF" />
          </Pressable>

          {/* Shutter Button & POST Label */}
          <View style={styles.shutterContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture photo"
              disabled={takingPicture || !permission?.granted}
              onPress={() => void snapPhoto()}
              style={styles.shutterOuter}>
              {takingPicture ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </Pressable>
            <Text style={styles.postModeText}>Post</Text>
          </View>

          {/* Camera Reverse / Flip Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            onPress={() => {
              tapSelection();
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
            }}
            style={styles.cameraSideBtn}>
            <Ionicons name="camera-reverse-outline" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------
  // 2. CAPTION & SHARE STEP (Final review & publish)
  // -------------------------------------------------------------
  if (mode === 'caption') {
    return (
      <View style={[styles.screenDark, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => setMode('gallery')} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>New post</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share post"
            accessibilityState={{ disabled: !canPost, busy: create.isPending }}
            disabled={!canPost}
            onPress={submit}
            style={[styles.shareActionBtn, !canPost && { opacity: 0.45 }]}>
            {create.isPending ? (
              <ActivityIndicator color="#1F7A4D" size="small" />
            ) : (
              <Text style={styles.shareActionText}>Share</Text>
            )}
          </Pressable>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.captionScroll} keyboardShouldPersistTaps="handled">
          {/* Preview & Caption Input Row */}
          <View style={styles.captionInputRow}>
            {photo ? (
              <View>
                <Image source={{ uri: photo.uri }} style={styles.captionThumb} resizeMode="cover" />
                {photos.length > 1 ? (
                  <View style={styles.thumbCount}>
                    <Text style={styles.photoNumber}>{photos.length}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.captionThumbPlaceholder}>
                <Ionicons name="text" size={24} color="#888888" />
              </View>
            )}
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.slice(0, MAX_CHARS))}
              multiline
              placeholder="Write a caption..."
              autoFocus
              placeholderTextColor="#7E7A94"
              style={styles.captionTextInput}
              accessibilityLabel="Post caption"
              maxLength={MAX_CHARS}
            />
          </View>

          <Text style={styles.charCounter}>{text.length}/{MAX_CHARS}</Text>

          <Text style={styles.topicHeading}>Topic (optional)</Text>
          <View style={styles.topicRow}>
            {SOCIAL_TOPICS.map((t) => {
              const on = topic === t.value;
              return (
                <Pressable key={t.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setTopic(on ? null : t.value)} style={[styles.topicPill, on && styles.topicPillOn]}>
                  <Text style={[styles.topicPillText, on && styles.topicPillTextOn]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {topic ? (
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: stamp }} onPress={() => setStamp((v) => !v)} style={styles.stampRow}>
              <Ionicons name={stamp ? 'checkbox' : 'square-outline'} size={20} color={stamp ? '#1F7A4D' : '#A09CB8'} />
              <Text style={styles.stampLabel}>Add my streak as a check-in stamp (checks me in today)</Text>
            </Pressable>
          ) : null}

          <View style={styles.captionDivider} />

          {/* Privacy Note */}
          <View style={styles.privacyNoteBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#A09CB8" />
            <Text style={styles.privacyNoteText}>
              Posts are public on Social. Keep private medical records, lab reports, and exact locations out of what you share.
            </Text>
          </View>

          {create.isError ? (
            <Text style={styles.errorText}>{(create.error as Error).message}</Text>
          ) : null}

          {/* Big Share Button at Bottom */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publish post"
            disabled={!canPost}
            onPress={submit}
            style={[styles.bigShareBtn, !canPost && { opacity: 0.45 }]}>
            {create.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.bigShareBtnText}>Share Post</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------
  // 3. MEDIA SELECTOR / GALLERY SCREEN (Image 2)
  // -------------------------------------------------------------
  return (
    <View style={[styles.screenDark, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
      {/* Top Header Bar: [X]  New post  [Next] */}
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} hitSlop={10}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>New post</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next"
          onPress={() => {
            tapSelection();
            setMode('caption');
          }}
          hitSlop={10}>
          <Text style={styles.nextActionText}>Next</Text>
        </Pressable>
      </View>

      {/* Top Half: Large Selected Media Preview */}
      <View style={styles.previewContainer}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons name="image-outline" size={48} color="#555555" />
            <Text style={styles.emptyPreviewText}>Select a photo below or take one</Text>
          </View>
        )}
      </View>

      {/* Middle Bar: [Recents v]   [Select] */}
      <View style={styles.middleBar}>
        <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={styles.recentsSelector}>
          <Text style={styles.recentsText}>Recents</Text>
          <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={styles.selectPillBtn}>
          <Ionicons name="copy-outline" size={15} color="#FFFFFF" />
          <Text style={styles.selectPillText}>{photos.length > 0 ? `Select ${photos.length}/${MAX_PHOTOS}` : 'Select'}</Text>
        </Pressable>
      </View>

      {photoError ? <Text style={styles.errorTextBanner}>{photoError}</Text> : null}

      {/* Lower Section: 3-Column Grid */}
      <ScrollView contentContainerStyle={styles.galleryGrid} showsVerticalScrollIndicator={false}>
        {/* Tile 1: Camera Tile with Camera Icon */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open camera"
          onPress={() => {
            tapSelection();
            setMode('camera');
          }}
          style={styles.cameraTile}>
          <Ionicons name="camera" size={32} color="#FFFFFF" />
        </Pressable>

        {/* Tile 2: the chosen photos, numbered in order. Tap one to take it out. */}
        {photos.map((chosen, index) => (
          <Pressable
            key={chosen.uri}
            accessibilityRole="button"
            accessibilityLabel={`Photo ${index + 1}, tap to remove`}
            onPress={() => {
              tapSelection();
              setPhotos((current) => current.filter((item) => item.uri !== chosen.uri));
              setPhotoError(null);
            }}
            style={[styles.photoTile, styles.selectedPhotoTile]}>
            <Image source={{ uri: chosen.uri }} style={styles.tileImage} resizeMode="cover" />
            <View style={styles.activeCheckBadge}>
              <Text style={styles.photoNumber}>{index + 1}</Text>
            </View>
          </Pressable>
        ))}

        {/* Tile 3: Browse Photos / Gallery Tile */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse photos"
          onPress={() => void pickPhoto()}
          style={styles.browseTile}>
          <Ionicons name="images-outline" size={28} color="#AAAAAA" />
          <Text style={styles.browseTileText}>Browse</Text>
        </Pressable>

        {/* Tile 4: Text-only post option */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Text post"
          onPress={() => {
            tapSelection();
            setPhotos([]);
            setMode('caption');
          }}
          style={styles.browseTile}>
          <Ionicons name="create-outline" size={28} color="#AAAAAA" />
          <Text style={styles.browseTileText}>Text</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  photoNumber: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  thumbCount: { position: 'absolute', right: 4, bottom: 4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)' },
  screenDark: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Top Header Bars
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  nextActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F7A4D',
  },
  shareActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shareActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F7A4D',
  },
  // Large Media Preview (Image 2)
  previewContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.95,
    backgroundColor: '#121214',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyPreviewText: {
    fontSize: 14,
    color: '#777777',
    fontWeight: '500',
  },
  // Middle Bar
  middleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  recentsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#262626',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  selectPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 3-Column Gallery Grid
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  cameraTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedPhotoTile: {
    borderWidth: 2,
    borderColor: '#1F7A4D',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1F7A4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: '#161618',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  browseTileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  // Live Camera UI (Image 1)
  cameraTopBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  viewfinderBox: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#111111',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  cameraBottomBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cameraSideBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterContainer: {
    alignItems: 'center',
    gap: 12,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  postModeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  permissionSubtitle: {
    fontSize: 13.5,
    color: '#A09CB8',
    textAlign: 'center',
    lineHeight: 19,
  },
  permissionBtn: {
    backgroundColor: '#1F7A4D',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  permissionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Caption & Share Screen
  captionScroll: {
    padding: 16,
    gap: 14,
  },
  captionInputRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  captionThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  captionThumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#222226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 4 },
  stampLabel: { flex: 1, color: '#C9C5DC', fontSize: 13 },
  topicHeading: { color: '#A09CB8', fontSize: 12.5, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  topicPill: { paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#3A3650', justifyContent: 'center' },
  topicPillOn: { backgroundColor: '#1F7A4D', borderColor: '#1F7A4D' },
  topicPillText: { color: '#C9C5DC', fontSize: 12.5, fontWeight: '600' },
  topicPillTextOn: { color: '#FFFFFF' },
  captionTextInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#7E7A94',
    textAlign: 'right',
  },
  captionDivider: {
    height: 1,
    backgroundColor: '#222226',
  },
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#181622',
    borderRadius: 14,
    padding: 14,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#A09CB8',
  },
  bigShareBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1F7A4D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  bigShareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    color: '#E34255',
    textAlign: 'center',
  },
  errorTextBanner: {
    fontSize: 13,
    color: '#E34255',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
