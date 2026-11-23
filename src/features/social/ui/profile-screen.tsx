import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useRef, type ComponentRef } from 'react';
import {
  Modal,
  Image,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { isApiError, queryKeys } from '@shared/api';
import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import {
  formatSocialCount,
  useMyHandle,
  useSocialConsistency,
  useSocialPicture,
  useSocialPostsOf,
  useSocialProfile,
  type SocialProfile,
} from '@entities/social';

import { SOCIAL_HOME, socialFriendsHref, socialRoute } from '../model/routes';
import { friendIsQuiet, friendLabel, friendTap } from '../model/friend-button';
import {
  useAnswerFriendRequest,
  useBlockHandle,
  useFriendHandle,
  useNudgeFriend,
  useSetPicture,
  useUpdateSocialProfile,
} from '../model/use-social-actions';
import { pickPicture } from '../model/pick-picture';
import { ConsistencyCard } from './consistency-card';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';
import { SOCIAL_DOCK_SPACE } from './social-dock';

// A bio longer than this shows one line with "...more" (about one line of the card's width).
const BIO_PREVIEW_CHARS = 34;

export type ProfileTab = 'photos' | 'text' | 'consistency';

export function ProfileScreen({ handle }: { handle: string }) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const profile = useSocialProfile(handle, me.joined);
  const queryClient = useQueryClient();
  const [postsTab, setPostsTab] = useState<ProfileTab>('photos');
  const posts = useSocialPostsOf(handle, profile.isSuccess && postsTab !== 'consistency', postsTab === 'photos' ? 'photos' : 'text');
  const cover = useSocialPicture(handle, 'cover', profile.data?.has_cover === true);
  const setCover = useSetPicture('cover');
  // Tapping the cover asks what to do: see it, or change it (my own). The viewer shows the whole picture.
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [coverViewerOpen, setCoverViewerOpen] = useState(false);
  const hasCover = profile.data?.has_cover === true;
  const canTapCover = hasCover || profile.data?.is_me === true;
  const [coverError, setCoverError] = useState<string | null>(null);

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);

  async function changeCover() {
    setCoverError(null);
    try {
      const picked = await pickPicture();
      if (picked) setCover.set.mutate({ handle, photo: picked });
    } catch (err) {
      setCoverError((err as Error).message);
    }
  }

  const handleBack = () => {
    if (profile.data?.is_me) {
      router.replace(SOCIAL_HOME);
    } else {
      goBackOr(router, SOCIAL_HOME);
    }
  };

  const postTabsConfig = [
    ['photos', 'images-outline', 'images', 'Photos'],
    ['text', 'document-text-outline', 'document-text', 'Words'],
    ['consistency', 'flame-outline', 'flame', 'Activity'],
  ] as const;

  const topSection = profile.data ? (
    <View>
      {/* Cover Banner with Floating Navigation */}
      <View style={styles.bannerContainer}>
        {/* Atmospheric Dark Cover Art */}
        <Svg width="100%" height={190} viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#13101E" />
              <Stop offset="40%" stopColor="#221A36" />
              <Stop offset="75%" stopColor="#1B2433" />
              <Stop offset="100%" stopColor="#0F141B" />
            </LinearGradient>
            <RadialGradient id="coverGlow" cx="45%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
              <Stop offset="60%" stopColor="#3B82F6" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#coverGrad)" />
          <Circle cx="180" cy="50" r="140" fill="url(#coverGlow)" />
        </Svg>

        {cover.data && profile.data.has_cover ? <Image source={{ uri: cover.data }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Cover" /> : null}

        {canTapCover ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cover picture" onPress={() => (profile.data?.is_me ? setCoverMenuOpen(true) : setCoverViewerOpen(true))} style={StyleSheet.absoluteFill} />
        ) : null}

        {/* The person's own cover can be changed with this button, on the cover itself. */}
        {profile.data.is_me ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Change cover" disabled={setCover.set.isPending} onPress={() => setCoverMenuOpen(true)} hitSlop={8} style={styles.coverEdit}>
            {setCover.set.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera-outline" size={18} color="#FFFFFF" />}
          </Pressable>
        ) : null}

        {/* Floating Top Bar on Banner */}
        <View style={[styles.floatingBar, { top: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={handleBack} hitSlop={8} style={styles.circleNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>

          {/* Right menu action: my settings (saved, activity, notifications, blocked, delete account) */}
          <View style={styles.floatingBarRight}>
            {profile.data.is_me ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                hitSlop={8}
                onPress={() => router.push(socialRoute('/social/settings'))}
                style={styles.circleNavBtn}>
                <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {coverError ? <Text style={styles.pictureError}>{coverError}</Text> : null}

      {/* Overlapping Profile Card */}
      <ProfileHeader
        profile={profile.data}
        onSelectTab={(tab) => {
          tapSelection();
          setPostsTab(tab);
        }}
      />

      {/* Post & Activity Tabs */}
      <View style={[styles.postTabs, { borderBottomColor: p.border, backgroundColor: p.card }]}>
        {postTabsConfig.map(([key, icon, filled, label]) => {
          const active = postsTab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                tapSelection();
                if (key !== postsTab && key !== 'consistency') {
                  void queryClient.resetQueries({ queryKey: queryKeys.social.postsOf(handle, key) });
                }
                setPostsTab(key);
              }}
              style={[
                styles.postTab,
                active && [styles.postTabActive, { borderBottomColor: p.text }],
              ]}>
              <Ionicons name={active ? filled : icon} size={20} color={active ? p.text : p.muted} />
              <Text style={[styles.postTabLabel, { color: active ? p.text : p.muted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: p.bg }]}>
      {me.isPending ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={p.accent} size="large" />
        </View>
      ) : me.needsJoin ? (
        <View style={[styles.joinGutter, { paddingTop: insets.top + 16 }]}>
          <JoinPanel />
        </View>
      ) : profile.isPending ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={p.accent} size="large" />
        </View>
      ) : profile.isError ? (
        <View style={[styles.missing, { paddingTop: insets.top + 60 }]}>
          <Text style={[styles.missingTitle, { color: p.text }]}>Nobody found</Text>
          <Text style={[styles.missingBody, { color: p.muted }]}>
            There is no one with the handle @{handle}. Check the spelling and try again.
          </Text>
        </View>
      ) : postsTab === 'consistency' ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: insets.bottom + SOCIAL_DOCK_SPACE + 20 }}
          showsVerticalScrollIndicator={false}>
          {topSection}
          <View style={styles.consistencyWrapper}>
            <ConsistencyCard handle={profile.data.handle} canShare={profile.data.is_me} />
          </View>
        </ScrollView>
      ) : (
        <PostFeed
          query={posts}
          layout={postsTab === 'photos' ? 'grid' : 'list'}
          edgeToEdge
          header={topSection ?? undefined}
          emptyTitle={postsTab === 'photos' ? 'No photos yet' : 'No words-only posts yet'}
          emptyBody={
            profile.data.is_me
              ? postsTab === 'photos'
                ? 'Photos you share in posts will show here in a grid.'
                : 'Posts with words alone will show here.'
              : 'They have not shared any yet.'
          }
          bottomPadding={insets.bottom + SOCIAL_DOCK_SPACE + 16}
        />
      )}

      <BottomSheet visible={coverMenuOpen} onClose={() => setCoverMenuOpen(false)}>
        <View style={styles.coverMenu}>
          {hasCover ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCoverMenuOpen(false);
                setCoverViewerOpen(true);
              }}
              style={styles.coverMenuRow}>
              <Ionicons name="eye-outline" size={20} color={p.text} />
              <Text style={[styles.coverMenuText, { color: p.text }]}>See cover picture</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setCoverMenuOpen(false);
              void changeCover();
            }}
            style={styles.coverMenuRow}>
            <Ionicons name="image-outline" size={20} color={p.text} />
            <Text style={[styles.coverMenuText, { color: p.text }]}>{hasCover ? 'Change cover picture' : 'Add a cover picture'}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <Modal visible={coverViewerOpen && !!cover.data} animationType="fade" transparent onRequestClose={() => setCoverViewerOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setCoverViewerOpen(false)} style={styles.viewer}>
          {cover.data ? <Image source={{ uri: cover.data }} style={styles.viewerImage} resizeMode="contain" accessibilityLabel="Cover picture" /> : null}
        </Pressable>
      </Modal>

    </View>
  );
}

function ProfileHeader({
  profile,
  onSelectTab,
}: {
  profile: SocialProfile;
  onSelectTab?: (tab: ProfileTab) => void;
}) {
  const p = usePalette();
  const router = useRouter();
  const consistency = useSocialConsistency(profile.handle);
  const streak = consistency.data?.streak ?? 0;
  const friend = useFriendHandle();
  const answer = useAnswerFriendRequest();
  const block = useBlockHandle();
  const nudge = useNudgeFriend();
  // Already nudged: just now, earlier today (the server knows), or the server says the one a day is used (429 nudge_cooldown).
  const nudged = nudge.isSuccess || profile.nudged_recently || isApiError(nudge.error, 'nudge_cooldown');
  const update = useUpdateSocialProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [bioOpen, setBioOpen] = useState(false);
  const avatarPicture = useSocialPicture(profile.handle, 'avatar', profile.has_avatar);
  const setAvatar = useSetPicture('avatar');
  const removeCover = useSetPicture('cover').remove;
  const [pictureError, setPictureError] = useState<string | null>(null);
  // Tapping the round photo asks what to do: see it, or change it (my own). The viewer shows the whole picture.
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const hasAvatarPhoto = profile.has_avatar && !!avatarPicture.data;
  const canTapAvatar = hasAvatarPhoto || profile.is_me;

  async function changeAvatar() {
    setPictureError(null);
    try {
      const picked = await pickPicture();
      if (picked) setAvatar.set.mutate({ handle: profile.handle, photo: picked });
    } catch (err) {
      setPictureError((err as Error).message);
    }
  }

  return (
    <View style={[styles.profileCard, { backgroundColor: p.bg }]}>
      {/* Avatar */}
      <View style={styles.avatarStatsRow} pointerEvents="box-none">
        {/* The avatar overlaps the cover */}
        <View style={[styles.avatarRing, { borderColor: p.card }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile photo"
            disabled={!canTapAvatar}
            onPress={() => (profile.is_me ? setAvatarMenuOpen(true) : setAvatarViewerOpen(true))}
            style={[styles.avatar, { backgroundColor: p.accentSoft, borderColor: p.accent }]}>
            {avatarPicture.data && profile.has_avatar ? (
              <Image source={{ uri: avatarPicture.data }} style={styles.avatarImage} resizeMode="cover" accessibilityLabel="Profile photo" />
            ) : (
              <Text style={[styles.avatarText, { color: p.accent }]}>
                {profile.handle.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </Pressable>
          {profile.is_me ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={setAvatar.set.isPending} onPress={() => setAvatarMenuOpen(true)} hitSlop={6} style={[styles.avatarEdit, { backgroundColor: p.accent, borderColor: p.card }]}>
              {setAvatar.set.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={14} color="#FFFFFF" />}
            </Pressable>
          ) : null}
        </View>

      </View>

      {/* Name, Handle, Streak & Bio */}
      <View style={styles.infoSection}>
        <Text numberOfLines={1} style={[styles.displayName, { color: p.text }]}>
          {profile.display_name || `@${profile.handle}`}
        </Text>
        <Text style={[styles.handleSubtext, { color: p.muted }]}>@{profile.handle}</Text>

        {/* A long bio wraps inside the card, even a single long word with no spaces, and shows at most four lines. */}
        {profile.bio ? (
          <View style={styles.bioBox}>
            <Text numberOfLines={bioOpen ? undefined : 1} style={styles.bioText}>
              {profile.bio}
              {bioOpen && profile.bio.length > BIO_PREVIEW_CHARS ? (
                <Text onPress={() => setBioOpen(false)} style={[styles.bioMore, { color: p.accent }]}>{'  '}less</Text>
              ) : null}
            </Text>
            {!bioOpen && profile.bio.length > BIO_PREVIEW_CHARS ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Show the full bio" onPress={() => setBioOpen(true)} hitSlop={8}>
                <Text style={[styles.bioMore, { color: p.accent }]}>...more</Text>
              </Pressable>
            ) : null}
          </View>
        ) : profile.is_me ? (
          <Text style={[styles.bioText, styles.bioEmpty]}>Add a line about you with Edit profile.</Text>
        ) : null}
      </View>

      {/* Numbers: posts, friends and the streak (it opens the Activity tab) */}
      <View style={[styles.statsStrip, { borderColor: p.border }]}>
        <View style={styles.statCell}>
          <Text style={[styles.statNumber, { color: p.text }]}>{formatSocialCount(profile.posts_count)}</Text>
          <Text style={[styles.statName, { color: p.muted }]}>Posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: p.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Friends: ${profile.friends_count}`} onPress={() => router.push(socialFriendsHref(profile.handle))} style={styles.statCell}>
          <Text style={[styles.statNumber, { color: p.text }]}>{formatSocialCount(profile.friends_count)}</Text>
          <Text style={[styles.statName, { color: p.accent }]}>Friends</Text>
        </Pressable>
        <View style={[styles.statDivider, { backgroundColor: p.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${streak}-day streak`} onPress={() => onSelectTab?.('consistency')} style={styles.statCell}>
          <View style={styles.streakNumber}>
            <Ionicons name="flame" size={17} color={streak > 0 ? '#E8762B' : p.muted} />
            <Text style={[styles.statNumber, { color: p.text }]}>{streak}</Text>
          </View>
          <Text style={[styles.statName, { color: p.muted }]}>Day streak</Text>
        </Pressable>
      </View>

      {/* Action Buttons */}
      {profile.is_me ? (
        editing ? (
          <View style={styles.editSection}>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={40}
              placeholder="Display name"
              placeholderTextColor={p.muted}
              style={[styles.inputField, { color: p.text, borderColor: p.border, backgroundColor: p.input }]}
              accessibilityLabel="Display name"
            />
            <TextInput
              value={bio}
              onChangeText={setBio}
              maxLength={160}
              multiline
              placeholder="A line about you..."
              placeholderTextColor={p.muted}
              style={[styles.inputField, styles.bioInputField, { color: p.text, borderColor: p.border, backgroundColor: p.input }]}
              accessibilityLabel="Bio"
            />
            {pictureError ? <Text style={styles.pictureError}>{pictureError}</Text> : null}
            {profile.has_avatar || profile.has_cover ? (
              <View style={styles.removeRow}>
                {profile.has_avatar ? (
                  <Pressable accessibilityRole="button" disabled={setAvatar.remove.isPending} onPress={() => setAvatar.remove.mutate(profile.handle)}>
                    <Text style={[styles.removeText, { color: p.red }]}>Remove profile photo</Text>
                  </Pressable>
                ) : null}
                {profile.has_cover ? (
                  <Pressable accessibilityRole="button" disabled={removeCover.isPending} onPress={() => removeCover.mutate(profile.handle)}>
                    <Text style={[styles.removeText, { color: p.red }]}>Remove cover</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <View style={styles.actionsRow}>
              <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={[styles.actionPillBtn, { borderColor: p.border, borderWidth: 1 }]}>
                <Text style={[styles.actionPillText, { color: p.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={update.isPending}
                onPress={() => {
                  tapConfirm();
                  update.mutate({ displayName: name, bio }, { onSuccess: () => setEditing(false) });
                }}
                style={[styles.actionPillBtn, { backgroundColor: p.accent }]}>
                {update.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.actionPillText, { color: '#FFFFFF' }]}>Save</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={[styles.actionPillBtn, { backgroundColor: p.accent }]}>
              <View style={styles.pillContent}>
                <Ionicons name="pencil-outline" size={15} color="#FFFFFF" />
                <Text style={styles.primaryPillText}>Edit profile</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Activity"
              onPress={() => onSelectTab?.('consistency')}
              style={[styles.actionPillBtn, styles.secondaryPillBtn, { borderColor: p.border, backgroundColor: p.surface }]}>
              <View style={styles.pillContent}>
                <Ionicons name="flame-outline" size={16} color={p.text} />
                <Text style={[styles.actionPillText, { color: p.text }]}>Activity</Text>
              </View>
            </Pressable>
          </View>
        )
      ) : profile.has_blocked ? (
        <Pressable
          accessibilityRole="button"
          disabled={block.isPending}
          onPress={() => block.mutate({ handle: profile.handle, block: false })}
          style={[styles.actionPillBtn, { backgroundColor: p.accent }]}>
          <Text style={styles.primaryPillText}>{block.isPending ? 'Please wait...' : 'Unblock'}</Text>
        </Pressable>
      ) : (
        <View style={styles.visitorActions}>
          {profile.incoming_request_id ? (
            <View style={styles.actionsRow}>
              <Pressable
                accessibilityRole="button"
                disabled={answer.isPending}
                onPress={() => {
                  tapConfirm();
                  answer.mutate({ id: profile.incoming_request_id as string, accept: true });
                }}
                style={[styles.actionPillBtn, { backgroundColor: p.accent }]}>
                {answer.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryPillText}>Accept Request</Text>}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={answer.isPending}
                onPress={() => answer.mutate({ id: profile.incoming_request_id as string, accept: false })}
                style={[styles.actionPillBtn, { borderColor: p.border, borderWidth: 1 }]}>
                <Text style={[styles.actionPillText, { color: p.text }]}>Decline</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={friend.isPending}
              onPress={() => {
                tapConfirm();
                friend.mutate(friendTap({ handle: profile.handle, is_friend: profile.is_friend, requested: profile.request_sent }));
              }}
              style={[
                styles.actionPillBtn,
                friendIsQuiet({ is_friend: profile.is_friend, requested: profile.request_sent })
                  ? [styles.secondaryPillBtn, { borderColor: p.border, backgroundColor: p.surface }]
                  : { backgroundColor: p.accent },
              ]}>
              {friend.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.actionPillText,
                    {
                      color: friendIsQuiet({ is_friend: profile.is_friend, requested: profile.request_sent })
                        ? p.text
                        : '#FFFFFF',
                    },
                  ]}>
                  {friendLabel({ is_friend: profile.is_friend, requested: profile.request_sent })}
                </Text>
              )}
            </Pressable>
            {profile.is_friend ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send a check-in nudge"
                disabled={nudge.isPending || nudged}
                onPress={() => nudge.mutate(profile.handle)}
                style={[styles.actionPillBtn, styles.secondaryPillBtn, { borderColor: p.border, backgroundColor: p.surface }]}>
                {nudge.isPending ? <ActivityIndicator color={p.accent} /> : <Text style={[styles.actionPillText, { color: p.text }]}>{nudged ? 'Nudged' : 'Nudge'}</Text>}
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => block.mutate({ handle: profile.handle, block: true })}
              style={[styles.actionPillBtn, { backgroundColor: p.redSoft }]}>
              <Text style={[styles.actionPillText, { color: p.red }]}>Block</Text>
            </Pressable>
          </View>
        </View>
      )}

      <BottomSheet visible={avatarMenuOpen} onClose={() => setAvatarMenuOpen(false)}>
        <View style={styles.coverMenu}>
          {hasAvatarPhoto ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAvatarMenuOpen(false);
                setAvatarViewerOpen(true);
              }}
              style={styles.coverMenuRow}>
              <Ionicons name="eye-outline" size={20} color={p.text} />
              <Text style={[styles.coverMenuText, { color: p.text }]}>See profile picture</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAvatarMenuOpen(false);
              void changeAvatar();
            }}
            style={styles.coverMenuRow}>
            <Ionicons name="image-outline" size={20} color={p.text} />
            <Text style={[styles.coverMenuText, { color: p.text }]}>{hasAvatarPhoto ? 'Change profile picture' : 'Add a profile picture'}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <Modal visible={avatarViewerOpen && hasAvatarPhoto} animationType="fade" transparent onRequestClose={() => setAvatarViewerOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setAvatarViewerOpen(false)} style={styles.viewer}>
          {avatarPicture.data ? <Image source={{ uri: avatarPicture.data }} style={styles.viewerImage} resizeMode="contain" accessibilityLabel="Profile picture" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  joinGutter: { flex: 1, paddingHorizontal: 16 },
  missing: { alignItems: 'center', paddingHorizontal: 28, gap: 8 },
  missingTitle: { fontSize: 18, fontWeight: '800' },
  missingBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  // Banner & Top Floating Controls
  bannerContainer: {
    width: '100%',
    height: 190,
    position: 'relative',
    overflow: 'hidden',
  },
  floatingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  floatingBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Overlapping Profile Card
  profileCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -38,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: -48,
  },
  statColumn: {
    alignItems: 'center',
    width: 82,
    // A margin, not padding: padding made the column's touchable area reach up over the cover and block its camera button.
    marginTop: 52,
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8BA6',
  },
  avatarRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    // The photo is clipped to the circle, and the circle has a colored border.
    overflow: 'hidden',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEdit: { position: 'absolute', right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  statsStrip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 28 },
  statNumber: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  statName: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 18 },
  streakNumber: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coverMenu: { gap: 2 },
  coverMenuRow: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  coverMenuText: { fontSize: 15.5, fontWeight: '600' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  coverEdit: { position: 'absolute', right: 14, bottom: 52, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  pictureError: { fontSize: 12.5, color: '#E34255', textAlign: 'center', paddingVertical: 4 },
  removeRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingVertical: 4 },
  removeText: { fontSize: 13, fontWeight: '700' },
  bioBox: { alignItems: 'center', alignSelf: 'stretch' },
  bioMore: { fontSize: 13.5, fontWeight: '700', marginTop: 2 },
  avatarText: {
    fontSize: 38,
    fontWeight: '800',
  },
  infoSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  displayName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#8E8BA6',
    paddingHorizontal: 16,
    marginTop: 2,
    maxWidth: '100%',
    // Browsers: break a long word with no spaces instead of letting it run past the card.
    ...({ overflowWrap: 'anywhere', wordBreak: 'break-word' } as object),
  },
  bioEmpty: { fontStyle: 'italic', opacity: 0.8 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8BA6',
  },
  handleSubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: -2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  streakBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 16,
  },
  actionPillBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPillText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryPillBtn: {
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  visitorActions: {
    alignSelf: 'stretch',
    gap: 10,
  },
  editSection: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 14,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
  },
  bioInputField: {
    height: 84,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  overflowMenu: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    marginTop: 12,
    gap: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  consistencyWrapper: {
    paddingTop: 8,
  },
  postTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postTab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 2,
  },
  postTabActive: {
    borderBottomWidth: 2,
  },
  postTabLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
