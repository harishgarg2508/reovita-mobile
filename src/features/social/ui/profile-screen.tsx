import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialPostsOf, useSocialProfile, useSocialUnread, type SocialProfile } from '@entities/social';

import { SOCIAL_HOME, socialFriendsHref, socialRoute } from '../model/routes';
import { friendIsQuiet, friendLabel, friendTap } from '../model/friend-button';
import { useAnswerFriendRequest, useBlockHandle, useFriendHandle, useLeaveSocial, useUpdateSocialProfile } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

// One person's page: who they are, how many friends they have, the friend button and block, and their posts. On my own page I can edit my name and bio,
// or delete my account (which deletes my handle, posts and photos).
export function ProfileScreen({ handle }: { handle: string }) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const unread = useSocialUnread(me.joined);
  // Someone with no handle yet is asked to create one before any profile is shown.
  const profile = useSocialProfile(handle, me.joined);
  // Two tabs under the profile: posts with a photo (a grid of squares) and posts with words alone (cards).
  const queryClient = useQueryClient();
  const [postsTab, setPostsTab] = useState<'photos' | 'text'>('photos');
  const posts = useSocialPostsOf(handle, profile.isSuccess, postsTab);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => (profile.data?.is_me ? router.replace(SOCIAL_HOME) : goBackOr(router, SOCIAL_HOME))} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: p.text }]}>@{handle}</Text>
        {me.joined ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Social activity" hitSlop={8} onPress={() => router.push(socialRoute('/social/activity'))} style={[styles.round, styles.bell, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="notifications-outline" size={19} color={p.text} />
            {(unread.data?.unread ?? 0) + (unread.data?.requests ?? 0) > 0 ? <View style={[styles.dot, { backgroundColor: p.red, borderColor: p.card }]} /> : null}
          </Pressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>

      {me.isPending ? (
        <ActivityIndicator color={p.accent} style={{ marginTop: 60 }} />
      ) : me.notJoined ? (
        <View style={styles.joinGutter}>
          <JoinPanel />
        </View>
      ) : profile.isPending ? (
        <ActivityIndicator color={p.accent} style={{ marginTop: 60 }} />
      ) : profile.isError ? (
        <View style={styles.missing}>
          <Text style={[styles.missingTitle, { color: p.text }]}>Nobody found</Text>
          <Text style={[styles.missingBody, { color: p.muted }]}>There is no one with the handle @{handle}. Check the spelling and try again.</Text>
        </View>
      ) : (
        <PostFeed
          query={posts}
          layout={postsTab === 'photos' ? 'grid' : 'list'}
          edgeToEdge
          header={
            <View>
              <View style={styles.headerPad}>
                <ProfileHeader profile={profile.data} onLeft={() => goBackOr(router, SOCIAL_HOME)} />
              </View>
              <View style={[styles.postTabs, { borderBottomColor: p.border }]}>
                {(
                  [
                    ['photos', 'images-outline', 'images', 'Posts with photos'],
                    ['text', 'document-text-outline', 'document-text', 'Posts with words only'],
                  ] as const
                ).map(([key, icon, filled, label]) => (
                  <Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: postsTab === key }} onPress={() => {
                      // A tab always loads from the server: its list is emptied first, so its loader shows and no old posts are seen.
                      if (key !== postsTab) void queryClient.resetQueries({ queryKey: queryKeys.social.postsOf(handle, key) });
                      setPostsTab(key);
                    }} style={[styles.postTab, postsTab === key && { borderBottomColor: p.text }]}>
                    <Ionicons name={postsTab === key ? filled : icon} size={24} color={postsTab === key ? p.text : p.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          }
          emptyTitle={postsTab === 'photos' ? 'No photos yet' : 'No words-only posts yet'}
          emptyBody={profile.data.is_me ? (postsTab === 'photos' ? 'Posts with a photo will show here.' : 'Posts with words alone will show here.') : 'They have not shared any yet.'}
          bottomPadding={insets.bottom + SOCIAL_DOCK_SPACE + 16}
        />
      )}

      <SocialDock active={profile.data?.is_me ? 'profile' : undefined} />
    </View>
  );
}

function ProfileHeader({ profile, onLeft }: { profile: SocialProfile; onLeft: () => void }) {
  const p = usePalette();
  const router = useRouter();
  const friend = useFriendHandle();
  const answer = useAnswerFriendRequest();
  const block = useBlockHandle();
  const leave = useLeaveSocial();
  const update = useUpdateSocialProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [confirmLeave, setConfirmLeave] = useState(false);

  return (
    <View style={[styles.head, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
        <Text style={[styles.avatarText, { color: p.accent }]}>{profile.handle.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={[styles.name, { color: p.text }]}>{profile.display_name || `@${profile.handle}`}</Text>
      {profile.display_name ? <Text style={[styles.sub, { color: p.muted }]}>@{profile.handle}</Text> : null}
      {profile.bio ? <Text style={[styles.bio, { color: p.text }]}>{profile.bio}</Text> : null}

      <View style={styles.counts}>
        <Count value={profile.posts_count} label="Posts" />
        <Count value={profile.friends_count} label="Friends" onPress={() => router.push(socialFriendsHref(profile.handle))} />
        {profile.is_me && typeof profile.blocked_count === 'number' ? <Count value={profile.blocked_count} label="Blocked" onPress={() => router.push(socialRoute('/social/blocked'))} /> : null}
      </View>

      {profile.is_me ? (
        editing ? (
          <View style={styles.edit}>
            <TextInput value={name} onChangeText={setName} maxLength={40} placeholder="Display name" placeholderTextColor={p.muted} style={[styles.field, { color: p.text, borderColor: p.border, backgroundColor: p.input }]} accessibilityLabel="Display name" />
            <TextInput value={bio} onChangeText={setBio} maxLength={160} multiline placeholder="A line about you" placeholderTextColor={p.muted} style={[styles.field, styles.bioField, { color: p.text, borderColor: p.border, backgroundColor: p.input }]} accessibilityLabel="Bio" />
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
                <Text style={[styles.btnText, { color: p.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={update.isPending}
                onPress={() => update.mutate({ displayName: name, bio }, { onSuccess: () => setEditing(false) })}
                style={[styles.btn, { backgroundColor: p.accent }]}>
                {update.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Save</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
              <Text style={[styles.btnText, { color: p.text }]}>Edit profile</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmLeave(true)} style={[styles.btn, { backgroundColor: p.redSoft }]}>
              <Text style={[styles.btnText, { color: p.red }]}>Delete account</Text>
            </Pressable>
          </View>
        )
      ) : profile.has_blocked ? (
        <Pressable accessibilityRole="button" disabled={block.isPending} onPress={() => block.mutate({ handle: profile.handle, block: false })} style={[styles.btn, styles.full, { borderColor: p.border, borderWidth: 1 }]}>
          <Text style={[styles.btnText, { color: p.text }]}>{block.isPending ? 'Please wait...' : 'Unblock'}</Text>
        </Pressable>
      ) : (
        <View style={styles.askBlock}>
          {profile.incoming_request_id ? (
            <>
              <Text style={[styles.sub, { color: p.muted, textAlign: 'center' }]}>{profile.display_name || `@${profile.handle}`} sent you a friend request</Text>
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  disabled={answer.isPending}
                  onPress={() => answer.mutate({ id: profile.incoming_request_id as string, accept: true })}
                  style={[styles.btn, { backgroundColor: p.accent }]}>
                  {answer.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Accept</Text>}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={answer.isPending}
                  onPress={() => answer.mutate({ id: profile.incoming_request_id as string, accept: false })}
                  style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
                  <Text style={[styles.btnText, { color: p.text }]}>Decline</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            disabled={friend.isPending}
            onPress={() => friend.mutate(friendTap({ handle: profile.handle, is_friend: profile.is_friend, requested: profile.request_sent }))}
            style={[styles.btn, friendIsQuiet({ is_friend: profile.is_friend, requested: profile.request_sent }) ? { borderColor: p.border, borderWidth: 1 } : { backgroundColor: p.accent }]}>
            {friend.isPending ? (
              <ActivityIndicator color={friendIsQuiet({ is_friend: profile.is_friend, requested: profile.request_sent }) ? p.accent : '#FFFFFF'} />
            ) : (
              <Text style={[styles.btnText, { color: friendIsQuiet({ is_friend: profile.is_friend, requested: profile.request_sent }) ? p.text : '#FFFFFF' }]}>
                {friendLabel({ is_friend: profile.is_friend, requested: profile.request_sent })}
              </Text>
            )}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => block.mutate({ handle: profile.handle, block: true })} style={[styles.btn, { backgroundColor: p.redSoft }]}>
            <Text style={[styles.btnText, { color: p.red }]}>Block</Text>
          </Pressable>
        </View>
        </View>
      )}

      <ConfirmDialog
        visible={confirmLeave}
        title="Delete account?"
        message="Your social account is deleted: your handle, posts, kudos, friends and photos. Your health information and your Reovita account are not affected. You can create a new social account later with a new handle."
        confirmLabel="Delete"
        busy={leave.isPending}
        onConfirm={() => leave.mutate(undefined, { onSuccess: onLeft, onSettled: () => setConfirmLeave(false) })}
        onCancel={() => setConfirmLeave(false)}
      />
    </View>
  );
}

// A count. With onPress it opens the list behind the number (the friends).
function Count({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `${label}: ${value}` : undefined} disabled={!onPress} onPress={onPress} hitSlop={6} style={styles.count}>
      <Text style={[styles.countValue, { color: p.text }]}>{value}</Text>
      <Text style={[styles.sub, { color: onPress ? p.accent : p.muted }, onPress && { fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  bell: { borderWidth: 1 },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  joinGutter: { paddingHorizontal: 16, paddingTop: 12 },
  missing: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 28, gap: 6 },
  missingTitle: { fontSize: 18, fontWeight: '800' },
  missingBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  head: { borderWidth: 1, borderRadius: 24, padding: 18, alignItems: 'center', gap: 6, marginBottom: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  sub: { fontSize: 12.5 },
  bio: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  counts: { flexDirection: 'row', gap: 28, marginVertical: 10 },
  count: { alignItems: 'center' },
  countValue: { fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  btn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  full: { alignSelf: 'stretch', flex: 0 },
  headerPad: { paddingHorizontal: 16 },
  postTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 2 },
  postTab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  askBlock: { alignSelf: 'stretch', gap: 10 },
  btnText: { fontSize: 14, fontWeight: '700' },
  edit: { alignSelf: 'stretch', gap: 10 },
  field: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 15 },
  bioField: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
});
