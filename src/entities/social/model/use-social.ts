import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError, queryKeys } from '@shared/api';
import { API_URL } from '@shared/config/environment';
import { useEventStream } from '@shared/lib';

import { fetchSocialTerms, fetchBlockedProfiles, fetchReportedProfiles, fetchFeed, fetchFriendRequests, fetchKudosOf, fetchMyHandle, fetchReceivedKudos, fetchSocialSearch, fetchPeople, fetchFriendsOf, fetchPostPhoto, fetchPicture, fetchPostsOf, fetchSavedPosts, fetchComments, fetchReplies, fetchExplore, fetchToday, fetchConsistency, fetchRecap, fetchQuests, fetchLeaderboard, fetchPods, fetchPod, fetchPodInvites, fetchProfile, fetchSocialNotifications, fetchSocialUnread } from './social.api';
import type { SocialBlockedPage, SocialReportedPage, FeedScope, SocialFriendRequestPage, SocialKudosPage, SocialNotificationPage, SocialPersonPage, SocialReceivedKudosPage } from './social.types';

// My handle. `data` is undefined and `joined` is false for a person who has not chosen one yet (the server answers 404 no_handle).
export function useMyHandle() {
  const query = useQuery({
    queryKey: queryKeys.social.me(),
    queryFn: fetchMyHandle,
    retry: (count, error) => !isApiError(error, 'no_handle') && !isApiError(error, 'terms_required') && count < 2,
    ...FRESH,
    // Every screen (and the join panel itself) reads this query. Without this, each one that mounts after a "no account" / "terms" error asks
    // again; the query then goes back to loading, the panel unmounts, the feed mounts, the error comes back, and it loops without end.
    retryOnMount: false,
  });
  const notJoined = isApiError(query.error, 'no_handle');
  // The terms changed since the person agreed (403 terms_required): the account is there, but it must be agreed to again.
  const needsTerms = isApiError(query.error, 'terms_required');
  // Either way, the screen shows the terms panel instead of Social.
  // An old copy of the handle can outlive the error (React Query keeps the last data), so the terms error wins.
  return { ...query, joined: !!query.data && !needsTerms && !notJoined, notJoined, needsTerms, needsJoin: notJoined || needsTerms };
}

// The terms to agree to, from the server, word for word.
export function useSocialTerms() {
  return useQuery({ queryKey: queryKeys.social.terms(), queryFn: fetchSocialTerms, ...FRESH });
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
export function useSocialFeed(enabled = true, scope: FeedScope = 'friends', topic: string | null = null) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.feedScope(scope, topic),
    queryFn: ({ pageParam }) => fetchFeed(scope, pageParam ?? null, topic),
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

// The posts I saved, the most recently saved first.
export function useSavedPosts(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.saved(),
    queryFn: ({ pageParam }) => fetchSavedPosts(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    enabled,
    retry: false,
    ...FRESH_LIST,
  });
}

// The comments on a post, newest first.
export function useSocialComments(postId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.comments(postId),
    queryFn: ({ pageParam }) => fetchComments(postId, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    enabled: enabled && postId.length > 0,
    retry: false,
    ...FRESH_LIST,
  });
}

// The replies in the thread of one comment, oldest first.
export function useSocialReplies(commentId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.replies(commentId),
    queryFn: ({ pageParam }) => fetchReplies(commentId, pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    enabled: enabled && commentId.length > 0,
    retry: false,
    ...FRESH_LIST,
  });
}

// Explore: a random mix of posts from many people. The order stays the same while scrolling (the server keeps it in the cursor), and a new one is
// made each time the screen opens (the list is thrown away when it closes).
export function useSocialExplore(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.explore(),
    queryFn: ({ pageParam }) => fetchExplore(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
    enabled,
    retry: false,
    ...FRESH_LIST,
  });
}

// My pods, one pod with its members, and the invitations waiting for me.
export function useSocialPods(enabled = true) {
  return useQuery({ queryKey: queryKeys.social.pods(), queryFn: fetchPods, enabled, retry: false, ...FRESH_LIST });
}

export function useSocialPod(id: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.social.pod(id), queryFn: () => fetchPod(id), enabled: enabled && id.length > 0, retry: false, ...FRESH_LIST });
}

export function useSocialPodInvites(enabled = true) {
  return useQuery({ queryKey: queryKeys.social.podInvites(), queryFn: fetchPodInvites, enabled, retry: false, ...FRESH_LIST });
}

// My recap of the last 7 days.
export function useSocialRecap(enabled = true) {
  return useQuery({ queryKey: queryKeys.social.recap(), queryFn: fetchRecap, enabled, retry: false, ...FRESH });
}

// The monthly quests and my progress.
export function useSocialQuests(enabled = true) {
  return useQuery({ queryKey: queryKeys.social.quests(), queryFn: fetchQuests, enabled, retry: false, ...FRESH_LIST });
}

// The leaderboard of me and my friends for this week or this month.
export function useSocialLeaderboard(period: 'week' | 'month', enabled = true) {
  return useQuery({ queryKey: queryKeys.social.leaderboard(period), queryFn: () => fetchLeaderboard(period), enabled, retry: false, ...FRESH_LIST });
}

// My check-ins today, with my streak.
export function useTodayCheckIns(enabled = true) {
  return useQuery({ queryKey: queryKeys.social.today(), queryFn: fetchToday, enabled, retry: false, ...FRESH });
}

// The consistency grid, streaks and badges of a person.
export function useSocialConsistency(handle: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.social.consistency(handle), queryFn: () => fetchConsistency(handle), enabled: enabled && handle.length > 0, retry: false, ...FRESH });
}

export function useSocialPeople(kind: 'friends' | 'blocked') {
  return useQuery({ queryKey: queryKeys.social.people(kind), queryFn: () => fetchPeople(kind), ...FRESH_LIST });
}

// The photo of a post. A photo never changes, so it is kept for the whole visit.
// The profile picture or the cover of a person, as an image address. Loaded again after the person changes it (the upload clears this).
export function useSocialPicture(handle: string, kind: 'avatar' | 'cover', enabled: boolean) {
  return useQuery({ queryKey: queryKeys.social.picture(handle, kind), queryFn: () => fetchPicture(handle, kind), enabled: enabled && handle.length > 0, staleTime: 5 * 60 * 1000, retry: false });
}

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
