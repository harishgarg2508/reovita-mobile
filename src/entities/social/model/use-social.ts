import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError, queryKeys } from '@shared/api';
import { API_URL } from '@shared/config/environment';
import { useEventStream } from '@shared/lib';

import { fetchBlockedProfiles, fetchReportedProfiles, fetchFeed, fetchFriendRequests, fetchKudosOf, fetchMyHandle, fetchReceivedKudos, fetchSocialSearch, fetchPeople, fetchFriendsOf, fetchPostPhoto, fetchPostsOf, fetchProfile, fetchSocialNotifications, fetchSocialUnread } from './social.api';
import type { SocialBlockedPage, SocialReportedPage, FeedScope, SocialFriendRequestPage, SocialKudosPage, SocialNotificationPage, SocialPersonPage, SocialPostPage, SocialReceivedKudosPage } from './social.types';

// My handle. `data` is undefined and `joined` is false for a person who has not chosen one yet (the server answers 404 no_handle).
export function useMyHandle() {
  const query = useQuery({
    queryKey: queryKeys.social.me(),
    queryFn: fetchMyHandle,
    retry: (count, error) => !isApiError(error, 'no_handle') && count < 2,
    ...FRESH,
  });
  return { ...query, joined: !!query.data, notJoined: isApiError(query.error, 'no_handle') };
}

// Nothing on Social is kept as "fresh enough": every list loads again when its screen opens or comes back, when the app returns to the
// foreground and when the connection returns. Pulling a list down loads it again too.
// staleTime 0 already means a screen that opens loads its data again; asking again with refetchOnMount 'always' only sent the same request twice.
const FRESH = { staleTime: 0, refetchOnWindowFocus: true, refetchOnReconnect: true } as const;
// The lists (posts, friends, requests, notifications, kudos, search) are also thrown away as soon as no screen shows them (gcTime 0). So a screen
// that opens never starts from an old copy: it asks the server, and shows its loader until the answer comes.
const FRESH_LIST = { ...FRESH, gcTime: 0 } as const;

const nextCursor = (page: { next_cursor: string | null }) => page.next_cursor ?? undefined;

// scope for_you: public posts from other people. scope friends: the posts of my friends. Never my own posts.
export function useSocialFeed(enabled = true, scope: FeedScope = 'friends') {
  return useInfiniteQuery({
    queryKey: queryKeys.social.feedScope(scope),
    queryFn: ({ pageParam }) => fetchFeed(scope, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    enabled,
    ...FRESH_LIST,
  });
}

export function useSocialProfile(handle: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.social.profile(handle), queryFn: () => fetchProfile(handle), enabled: enabled && handle.length > 0, retry: false, ...FRESH_LIST });
}

export function useSocialPostsOf(handle: string, enabled = true, kind?: 'photos' | 'text') {
  return useInfiniteQuery({
    queryKey: queryKeys.social.postsOf(handle, kind ?? 'all'),
    queryFn: ({ pageParam }) => fetchPostsOf(handle, pageParam ?? null, kind),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    enabled: enabled && handle.length > 0,
    retry: false,
    ...FRESH_LIST,
  });
}

export function useSocialPeople(kind: 'friends' | 'blocked') {
  return useQuery({ queryKey: queryKeys.social.people(kind), queryFn: () => fetchPeople(kind), ...FRESH_LIST });
}

// The photo of a post. A photo never changes, so it is kept for the whole visit.
export function usePostPhoto(postId: string, enabled: boolean) {
  return useQuery({ queryKey: queryKeys.social.photo(postId), queryFn: () => fetchPostPhoto(postId), enabled, staleTime: Infinity, gcTime: 30 * 60 * 1000 });
}

// The friends of a person, a page at a time.
export function useSocialFriendsOf(handle: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.friendsOf(handle),
    queryFn: ({ pageParam }) => fetchFriendsOf(handle, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialPersonPage) => page.next_cursor ?? undefined,
    enabled: handle.length > 0,
    retry: false,
    ...FRESH_LIST,
  });
}

// My social notifications (someone accepted my friend request, or gave kudos to my post), a page at a time. Opening the screen loads them again.
export function useSocialNotifications(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.notifications(),
    queryFn: ({ pageParam }) => fetchSocialNotifications(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialNotificationPage) => page.next_cursor ?? undefined,
    enabled,
  });
}

// How many social notifications are unread: { unread, kudos, friends, requests }. Checked again every two minutes while the app is open (the live stream updates it at once), and when the
// screen comes back. The kudos count is the red badge on the Kudos item of the dock.
export function useSocialUnread(enabled = true) {
  return useQuery({ queryKey: queryKeys.social.unread(), queryFn: fetchSocialUnread, enabled, refetchInterval: 120_000, staleTime: 0 });
}

// The people who gave kudos to one of my posts, a page at a time. It loads when the list is opened.
export function useSocialKudos(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.kudos(postId),
    queryFn: ({ pageParam }) => fetchKudosOf(postId, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialKudosPage) => page.next_cursor ?? undefined,
    enabled: enabled && postId.length > 0,
    retry: false,
    ...FRESH_LIST,
  });
}

// Listens to the live stream of social notifications while the screen is open. Each new notice (a friend request, kudos on a post) loads the
// notification list and the unread count again at once, so the bell and the list update without waiting. It reconnects by itself.
export function useSocialNotificationStream(enabled: boolean) {
  const queryClient = useQueryClient();
  useEventStream(enabled ? `${API_URL}/v1/social/notifications/stream` : null, 'notification', () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.social.unread() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() });
    // A friend request arrives on this stream too: its section and its count load again.
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.social.root, 'friend-requests'] });
  });
}

// Every kudos my posts have received, newest first, a page at a time.
export function useReceivedKudos(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.kudosReceived(),
    queryFn: ({ pageParam }) => fetchReceivedKudos(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialReceivedKudosPage) => page.next_cursor ?? undefined,
    enabled,
    ...FRESH_LIST,
  });
}

// People matching the typed text, ten at a time. The text is the debounced one, at least three letters.
export function useSocialSearch(text: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.search(text),
    queryFn: ({ pageParam }) => fetchSocialSearch(text, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialPersonPage) => page.next_cursor ?? undefined,
    enabled: enabled && text.length >= 3,
    retry: false,
    ...FRESH_LIST,
  });
}

// The friend requests waiting for me (incoming) or that I sent (outgoing), a page at a time.
export function useFriendRequests(direction: 'incoming' | 'outgoing', enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.friendRequests(direction),
    queryFn: ({ pageParam }) => fetchFriendRequests(direction, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialFriendRequestPage) => page.next_cursor ?? undefined,
    enabled,
    ...FRESH_LIST,
  });
}

// The people I blocked, a page at a time. Private to me.
export function useBlockedProfiles(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.blocked(),
    queryFn: ({ pageParam }) => fetchBlockedProfiles(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialBlockedPage) => page.next_cursor ?? undefined,
    enabled,
    ...FRESH_LIST,
  });
}

// The people whose posts I reported, a page at a time. Private to me.
export function useReportedProfiles(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.reported(),
    queryFn: ({ pageParam }) => fetchReportedProfiles(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: SocialReportedPage) => page.next_cursor ?? undefined,
    enabled,
    ...FRESH_LIST,
  });
}
