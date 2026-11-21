import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { api, queryKeys } from '@shared/api';
import type { SocialPodDetail, SocialToday, SocialComment, SocialCommentPage, SocialHandle, SocialPost, SocialPostPage } from '@entities/social';

type PostPages = InfiniteData<SocialPostPage, string | undefined>;

// Changes one post in every feed that holds it (the main feed and each person's list), so a kudos shows at once everywhere.
function patchPost(queryClient: QueryClient, id: string, patch: (post: SocialPost) => SocialPost | null) {
  for (const key of [queryKeys.social.feed(), [...queryKeys.social.root, 'posts-of'], queryKeys.social.saved()]) {
    queryClient.setQueriesData<PostPages>({ queryKey: key }, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.flatMap((post) => {
                if (post.id !== id) return [post];
                const changed = patch(post);
                return changed ? [changed] : [];
              }),
            })),
          }
        : old,
    );
  }
}

function refreshPosts(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'posts-of'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.social.saved() });
}

type PictureFile = { uri: string; name: string; type: string };

async function uploadPicture(kind: 'avatar' | 'cover', photo: PictureFile): Promise<void> {
  const form = new FormData();
  // Browsers need a real Blob in FormData; the native { uri, name, type } object is ignored.
  if (Platform.OS === 'web') form.append('photo', await (await fetch(photo.uri)).blob(), photo.name);
  else form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  await api.put(`/v1/social/me/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function useCreateHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    // The person has ticked that they agree to the terms, whose version is sent with the request: the server records it.
    mutationFn: async (input: { handle: string; displayName?: string; termsVersion: string; avatar?: PictureFile | null; cover?: PictureFile | null }): Promise<SocialHandle> => {
      const { data } = await api.post<SocialHandle>('/v1/social/me', {
        handle: input.handle,
        display_name: input.displayName || undefined,
        accept_terms: true,
        terms_version: input.termsVersion,
      });
      // The photos chosen while joining are sent once the account exists. One that fails is not an error: it can be added again from the profile.
      if (input.avatar) await uploadPicture('avatar', input.avatar).catch(() => undefined);
      if (input.cover) await uploadPicture('cover', input.cover).catch(() => undefined);
      return data;
    },
    onSuccess: (handle) => {
      queryClient.setQueryData(queryKeys.social.me(), handle);
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
    },
  });
}

// Agrees again to the terms after they changed. The handle and everything on it stay.
export function useAcceptSocialTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (termsVersion: string): Promise<SocialHandle> => {
      const { data } = await api.post<SocialHandle>('/v1/social/me/terms', { terms_version: termsVersion });
      return data;
    },
    onSuccess: (handle) => {
      queryClient.setQueryData(queryKeys.social.me(), handle);
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.root });
    },
  });
}

export function useUpdateSocialProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { displayName: string; bio: string }): Promise<SocialHandle> => {
      const { data } = await api.patch<SocialHandle>('/v1/social/me', { display_name: input.displayName, bio: input.bio });
      return data;
    },
    onSuccess: (handle) => {
      queryClient.setQueryData(queryKeys.social.me(), handle);
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'profile'] });
      refreshPosts(queryClient);
    },
  });
}

// Posts text, a photo, or both. The photo is a JPEG or PNG picked on the phone.
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; topic?: string | null; stamp?: boolean; photo?: { uri: string; name: string; type: string } }): Promise<SocialPost> => {
      const form = new FormData();
      form.append('body', input.body);
      if (input.topic) form.append('topic', input.topic);
      if (input.topic && input.stamp) form.append('stamp', 'true');
      if (input.photo) {
        if (Platform.OS === 'web') {
          // Browsers need a real Blob in FormData; the native { uri, name, type } object is ignored.
          form.append('photo', await (await fetch(input.photo.uri)).blob(), input.photo.name);
        } else {
          form.append('photo', { uri: input.photo.uri, name: input.photo.name, type: input.photo.type } as unknown as Blob);
        }
      }
      const { data } = await api.post<SocialPost>('/v1/social/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    },
    onSuccess: () => {
      refreshPosts(queryClient);
      // A post with a stamp checked the person in, so their card and grid are read again.
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'check-ins'] });
    },
  });
}

// Wait this long after the last tap before sending, so a fast run of taps is one request, not many.
const KUDOS_DELAY_MS = 600;

type PendingKudos = { timer: ReturnType<typeof setTimeout>; base: boolean; desired: boolean };

// Kudos with a debounce. A tap shows at once (the heart and the count change on the spot), and the server is told once, after the person has
// stopped tapping, only if the final state differs from the one the server already has. Tapping fast on and off sends nothing at all,
// and tapping many times sends one request, so kudos cannot be spammed.
export function useToggleKudos() {
  const queryClient = useQueryClient();
  const pending = useRef(new Map<string, PendingKudos>());

  const send = useMutation({
    mutationFn: async (input: { id: string; on: boolean }) => {
      const { data } = input.on
        ? await api.put<{ kudos_count: number; kudoed: boolean }>(`/v1/social/posts/${input.id}/kudos`)
        : await api.delete<{ kudos_count: number; kudoed: boolean }>(`/v1/social/posts/${input.id}/kudos`);
      return { id: input.id, ...data };
    },
    // The server's count is the true one, unless the person has tapped again since: then the newer tap decides.
    onSuccess: (result) => {
      if (pending.current.has(result.id)) return;
      patchPost(queryClient, result.id, (p) => ({ ...p, kudoed: result.kudoed, kudos_count: result.kudos_count }));
    },
    onError: () => refreshPosts(queryClient),
  });

  const flush = useCallback(
    (id: string, entry: PendingKudos) => {
      pending.current.delete(id);
      if (entry.desired !== entry.base) send.mutate({ id, on: entry.desired });
    },
    [send],
  );

  // Leaving the screen with a tap not yet sent sends it now, so it is not lost.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [id, entry] of map) {
        clearTimeout(entry.timer);
        if (entry.desired !== entry.base) void api.request({ method: entry.desired ? 'PUT' : 'DELETE', url: `/v1/social/posts/${id}/kudos` }).catch(() => undefined);
      }
      map.clear();
    };
  }, []);

  return useCallback(
    (post: SocialPost) => {
      const entry = pending.current.get(post.id);
      if (entry) clearTimeout(entry.timer);
      const base = entry ? entry.base : post.kudoed;
      const desired = entry ? !entry.desired : !post.kudoed;
      patchPost(queryClient, post.id, (p) => ({ ...p, kudoed: desired, kudos_count: Math.max(0, p.kudos_count + (p.kudoed === desired ? 0 : desired ? 1 : -1)) }));
      const next: PendingKudos = { base, desired, timer: setTimeout(() => flush(post.id, next), KUDOS_DELAY_MS) };
      pending.current.set(post.id, next);
    },
    [queryClient, flush],
  );
}

// The bookmark on a post of someone else, debounced like kudos: the icon changes at once, and only the last state is sent, 600 ms after the last
// tap, so tapping again and again sends one request (or none, if it ends where it started). If the server refuses, the icon goes back.
export function useToggleSaved() {
  const queryClient = useQueryClient();
  const pending = useRef(new Map<string, PendingKudos>());

  const send = useMutation({
    mutationFn: async (input: { id: string; on: boolean }) => {
      if (input.on) await api.put(`/v1/social/posts/${input.id}/save`);
      else await api.delete(`/v1/social/posts/${input.id}/save`);
    },
    onError: (_error, input) => patchPost(queryClient, input.id, (p) => ({ ...p, saved: !input.on })),
  });

  const flush = useCallback(
    (id: string, entry: PendingKudos) => {
      pending.current.delete(id);
      if (entry.desired !== entry.base) send.mutate({ id, on: entry.desired });
    },
    [send],
  );

  // Leaving the screen with a tap not yet sent sends it now, so it is not lost.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [id, entry] of map) {
        clearTimeout(entry.timer);
        if (entry.desired !== entry.base) void api.request({ method: entry.desired ? 'PUT' : 'DELETE', url: `/v1/social/posts/${id}/save` }).catch(() => undefined);
      }
      map.clear();
    };
  }, []);

  return useCallback(
    (post: SocialPost) => {
      const entry = pending.current.get(post.id);
      if (entry) clearTimeout(entry.timer);
      const base = entry ? entry.base : post.saved;
      const desired = entry ? !entry.desired : !post.saved;
      patchPost(queryClient, post.id, (p) => ({ ...p, saved: desired }));
      const next: PendingKudos = { base, desired, timer: setTimeout(() => flush(post.id, next), KUDOS_DELAY_MS) };
      pending.current.set(post.id, next);
    },
    [queryClient, flush],
  );
}

// Sets or removes the profile picture or the cover. The profile and the picture load again afterwards.
export function useSetPicture(kind: 'avatar' | 'cover') {
  const queryClient = useQueryClient();
  const done = (handle: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.social.picture(handle, kind) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.social.profile(handle) });
  };
  const set = useMutation({
    mutationFn: async (input: { handle: string; photo: PictureFile }) => {
      await uploadPicture(kind, input.photo);
      return input.handle;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (handle: string) => {
      await api.delete(`/v1/social/me/${kind}`);
      return handle;
    },
    onSuccess: done,
  });
  return { set, remove };
}

type CommentPages = InfiniteData<SocialCommentPage, string | undefined>;

// Changes one comment in every list that holds it (the comments of its post, or the replies of its thread), so a like shows at once.
function patchComment(queryClient: QueryClient, id: string, patch: (comment: SocialComment) => SocialComment) {
  for (const key of [[...queryKeys.social.root, 'comments'], [...queryKeys.social.root, 'replies']]) {
    queryClient.setQueriesData<CommentPages>({ queryKey: key }, (old) =>
      old ? { ...old, pages: old.pages.map((page) => ({ ...page, items: page.items.map((c) => (c.id === id ? patch(c) : c)) })) } : old,
    );
  }
}

// Likes on comments, debounced like the kudos on posts: the heart and the count change at once, and only the last state is sent, 600 ms after the
// last tap (nothing, if it ends where it started). If the server refuses, the heart goes back.
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const pending = useRef(new Map<string, PendingKudos>());

  const send = useMutation({
    mutationFn: async (input: { id: string; on: boolean }) => {
      const { data } = input.on
        ? await api.put<{ likes_count: number; liked: boolean }>(`/v1/social/comments/${input.id}/like`)
        : await api.delete<{ likes_count: number; liked: boolean }>(`/v1/social/comments/${input.id}/like`);
      return { id: input.id, ...data };
    },
    // The server's count is the true one, unless the person has tapped again since: then the newer tap decides.
    onSuccess: (result) => {
      if (pending.current.has(result.id)) return;
      patchComment(queryClient, result.id, (c) => ({ ...c, liked: result.liked, likes_count: result.likes_count }));
    },
    onError: (_error, input) => patchComment(queryClient, input.id, (c) => ({ ...c, liked: !input.on, likes_count: Math.max(0, c.likes_count + (input.on ? -1 : 1)) })),
  });

  const flush = useCallback(
    (id: string, entry: PendingKudos) => {
      pending.current.delete(id);
      if (entry.desired !== entry.base) send.mutate({ id, on: entry.desired });
    },
    [send],
  );

  // Leaving the screen with a tap not yet sent sends it now, so it is not lost.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [id, entry] of map) {
        clearTimeout(entry.timer);
        if (entry.desired !== entry.base) void api.request({ method: entry.desired ? 'PUT' : 'DELETE', url: `/v1/social/comments/${id}/like` }).catch(() => undefined);
      }
      map.clear();
    };
  }, []);

  return useCallback(
    (comment: SocialComment) => {
      const entry = pending.current.get(comment.id);
      if (entry) clearTimeout(entry.timer);
      const base = entry ? entry.base : comment.liked;
      const desired = entry ? !entry.desired : !comment.liked;
      patchComment(queryClient, comment.id, (c) => ({ ...c, liked: desired, likes_count: Math.max(0, c.likes_count + (c.liked === desired ? 0 : desired ? 1 : -1)) }));
      const next: PendingKudos = { base, desired, timer: setTimeout(() => flush(comment.id, next), KUDOS_DELAY_MS) };
      pending.current.set(comment.id, next);
    },
    [queryClient, flush],
  );
}

// Checks in to a habit today, or takes the check-in back. The card updates at once from the server's answer, and the profile grid loads again.
export function useToggleCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { habit: string; on: boolean }) => {
      const { data } = input.on
        ? await api.post<SocialToday>('/v1/social/check-ins', { habit: input.habit })
        : await api.delete<SocialToday>(`/v1/social/check-ins/today/${encodeURIComponent(input.habit)}`);
      return data;
    },
    onSuccess: (today) => {
      queryClient.setQueryData(queryKeys.social.today(), today);
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'check-ins', 'consistency'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.quests() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.pods() });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'leaderboard'] });
    },
  });
}

// Pods. Each change reads the pods and the invitations again.
function usePodRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.social.pods() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.social.podInvites() });
  };
}

export function useCreatePod() {
  const refresh = usePodRefresh();
  return useMutation({
    mutationFn: async (input: { name: string; weeklyGoal: number }) => (await api.post<SocialPodDetail>('/v1/social/pods', { name: input.name, weekly_goal: input.weeklyGoal })).data,
    onSuccess: refresh,
  });
}

export function useInviteToPod(podId: string) {
  const refresh = usePodRefresh();
  return useMutation({
    mutationFn: async (handle: string) => {
      await api.post(`/v1/social/pods/${podId}/invites`, { handle });
    },
    onSuccess: refresh,
  });
}

export function useAnswerPodInvite() {
  const refresh = usePodRefresh();
  return useMutation({
    mutationFn: async (input: { id: string; accept: boolean }) => {
      if (input.accept) await api.post(`/v1/social/pods/invites/${input.id}/accept`);
      else await api.post(`/v1/social/pods/invites/${input.id}/decline`);
    },
    onSuccess: refresh,
  });
}

export function useLeavePod(podId: string) {
  const refresh = usePodRefresh();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/v1/social/pods/${podId}/members/me`);
    },
    onSuccess: refresh,
  });
}

export function useDeletePod(podId: string) {
  const refresh = usePodRefresh();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/v1/social/pods/${podId}`);
    },
    onSuccess: refresh,
  });
}

// A gentle check-in nudge to a friend. The server allows one a day to the same friend (429 nudge_cooldown), and only to a friend.
export function useNudgeFriend() {
  return useMutation({
    mutationFn: async (handle: string) => {
      await api.post(`/v1/social/friends/${encodeURIComponent(handle)}/nudge`);
    },
  });
}

// Adds a comment to a post. The post's count goes up at once in every list, and the list of comments loads again.
export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // parentId: the comment this answers (a reply). The server puts it in the thread of the comment at the top.
    mutationFn: async (input: { body: string; parentId?: string }) => (await api.post<SocialComment>(`/v1/social/posts/${postId}/comments`, { body: input.body, parent_id: input.parentId })).data,
    onSuccess: () => {
      patchPost(queryClient, postId, (p) => ({ ...p, comments_count: p.comments_count + 1 }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'replies'] });
    },
  });
}

// Deletes a comment (mine, or one on my post). The post's count goes down and the list loads again.
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // removed: how many comments go with it (a top comment takes its replies along).
    mutationFn: async (input: { id: string; removed: number }) => {
      await api.delete(`/v1/social/comments/${input.id}`);
      return input.removed;
    },
    onSuccess: (removed) => {
      patchPost(queryClient, postId, (p) => ({ ...p, comments_count: Math.max(0, p.comments_count - removed) }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'replies'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (post: SocialPost) => {
      await api.delete(`/v1/social/posts/${post.id}`);
      return post;
    },
    onSuccess: (post) => {
      patchPost(queryClient, post.id, () => null);
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'profile'] });
    },
  });
}

export function useReportPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { post: SocialPost; reason: string }) => {
      await api.post(`/v1/social/posts/${input.post.id}/report`, { reason: input.reason });
      return input.post;
    },
    // A reported post is hidden for the person who reported it.
    onSuccess: (post) => patchPost(queryClient, post.id, () => null),
  });
}

// Reports a comment. The person who reported it stops seeing it at once, so the list loads again.
export function useReportComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      await api.post(`/v1/social/comments/${input.id}/report`, { reason: input.reason });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) }),
  });
}

export function useMarkSocialRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/v1/social/notifications/${id}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.unread() });
    },
  });
}

// Marks the social notifications as read: all of them, or with a type only the kudos or only the accepted friend requests.
export function useMarkAllSocialRead(type?: 'kudos' | 'friends') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/v1/social/notifications/read-all', undefined, type ? { params: { type } } : undefined);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.unread() });
    },
  });
}

type PersonChange = 'request' | 'cancel' | 'unfriend';

// Changes one person wherever they are in the cached lists (search, friends, kudos, requests, and their own page), so the button changes at
// once when it is tapped, in every list on the screen, and not only after the server answers.
function patchPerson(queryClient: QueryClient, handle: string, change: PersonChange) {
  const apply = (person: Record<string, unknown>): Record<string, unknown> => {
    if (change === 'request') return { ...person, requested: true, request_sent: true };
    if (change === 'cancel') return { ...person, requested: false, request_sent: false };
    return { ...person, is_friend: false, requested: false, request_sent: false };
  };
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (record.handle === handle && 'is_friend' in record) return apply(record);
    // a page of items, or the pages of an infinite list
    if (Array.isArray(record.pages)) return { ...record, pages: record.pages.map(walk) };
    if (Array.isArray(record.items)) return { ...record, items: record.items.map(walk) };
    return value;
  };
  queryClient.setQueriesData({ queryKey: queryKeys.social.root }, walk);
}

// The friend button. Friendship starts with a friend request that the other person accepts:
//   add: true                     send a friend request
//   add: false, requested: true   take back a request that is still waiting
//   add: false                    remove the friend
export function useFriendHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { handle: string; add: boolean; requested?: boolean }) => {
      if (input.add) await api.post('/v1/friend-requests', { handle: input.handle });
      else if (input.requested) await api.delete(`/v1/friend-requests/to/${encodeURIComponent(input.handle)}`);
      else await api.delete(`/v1/social/friends/${encodeURIComponent(input.handle)}`);
    },
    // The button shows the new state at once (Add friend -> Sent, Sent -> Add friend, Friends -> Add friend). If the server refuses, the lists load again.
    onMutate: (input) => {
      patchPerson(queryClient, input.handle, input.add ? 'request' : input.requested ? 'cancel' : 'unfriend');
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.root });
    },
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.profile(input.handle) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'people'] });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'friends-of'] });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'search'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.kudosReceived() });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'kudos'] });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'friend-requests'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() });
    },
  });
}

// Accepts or declines a friend request made to me. Accepting makes us friends.
export function useAnswerFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; accept: boolean }) => {
      await api.post(`/v1/friend-requests/${input.id}/${input.accept ? 'accept' : 'deny'}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'friend-requests'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.unread() });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'profile'] });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'friends-of'] });
    },
  });
}

export function useBlockHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { handle: string; block: boolean }) => {
      if (input.block) await api.put(`/v1/social/blocks/${encodeURIComponent(input.handle)}`);
      else await api.delete(`/v1/social/blocks/${encodeURIComponent(input.handle)}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.root });
    },
  });
}

// Takes back my reports of one person (unreport). Their posts show for me again, so the lists load again.
export function useUnreport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (handle: string) => {
      await api.delete(`/v1/social/reported/${encodeURIComponent(handle)}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.root });
    },
  });
}

// Leaves the social: the handle, posts and photos are deleted on the server, and everything held here is cleared.
export function useLeaveSocial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/v1/social/me');
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.social.root });
    },
  });
}
