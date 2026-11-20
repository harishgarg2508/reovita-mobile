import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { api, queryKeys } from '@shared/api';
import type { SocialHandle, SocialPost, SocialPostPage } from '@entities/social';

type PostPages = InfiniteData<SocialPostPage, string | undefined>;

// Changes one post in every feed that holds it (the main feed and each person's list), so a kudos shows at once everywhere.
function patchPost(queryClient: QueryClient, id: string, patch: (post: SocialPost) => SocialPost | null) {
  for (const key of [queryKeys.social.feed(), [...queryKeys.social.root, 'posts-of']]) {
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
}

export function useCreateHandle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { handle: string; displayName?: string }): Promise<SocialHandle> => {
      const { data } = await api.post<SocialHandle>('/v1/social/me', { handle: input.handle, display_name: input.displayName || undefined });
      return data;
    },
    onSuccess: (handle) => {
      queryClient.setQueryData(queryKeys.social.me(), handle);
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
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
    mutationFn: async (input: { body: string; photo?: { uri: string; name: string; type: string } }): Promise<SocialPost> => {
      const form = new FormData();
      form.append('body', input.body);
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
    onSuccess: () => refreshPosts(queryClient),
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
