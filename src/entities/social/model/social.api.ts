import { api } from '@shared/api';

import type { SocialBlockedPage, SocialReportedPage, FeedScope, SocialFriendRequestPage, SocialHandle, SocialKudosPage, SocialNotificationPage, SocialPersonPage, SocialPostPage, SocialProfile, SocialReceivedKudosPage } from './social.types';

export async function fetchMyHandle(): Promise<SocialHandle> {
  const { data } = await api.get<SocialHandle>('/v1/social/me');
  return data;
}

// Posts are loaded this many at a time. The next page is asked for when the list is scrolled near its end.
export const SOCIAL_PAGE_SIZE = 10;

export async function fetchFeed(scope: FeedScope, cursor: string | null): Promise<SocialPostPage> {
  const { data } = await api.get<SocialPostPage>('/v1/social/feed', { params: { scope, limit: SOCIAL_PAGE_SIZE, ...(cursor ? { cursor } : {}) } });
  return data;
}

export async function fetchProfile(handle: string): Promise<SocialProfile> {
  const { data } = await api.get<SocialProfile>(`/v1/social/handles/${encodeURIComponent(handle)}`);
  return data;
}

// The posts of one person. kind photos: only posts with a photo. kind text: only posts with words alone. No kind: all.
export async function fetchPostsOf(handle: string, cursor: string | null, kind?: 'photos' | 'text'): Promise<SocialPostPage> {
  const { data } = await api.get<SocialPostPage>(`/v1/social/handles/${encodeURIComponent(handle)}/posts`, { params: { limit: SOCIAL_PAGE_SIZE, ...(kind ? { kind } : {}), ...(cursor ? { cursor } : {}) } });
  return data;
}

export async function fetchFriendsOf(handle: string, cursor: string | null): Promise<SocialPersonPage> {
  const { data } = await api.get<SocialPersonPage>(`/v1/social/handles/${encodeURIComponent(handle)}/friends`, { params: { limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

// Friend requests waiting for me (incoming) or that I sent (outgoing), newest first, a page at a time.
export async function fetchFriendRequests(direction: 'incoming' | 'outgoing', cursor: string | null): Promise<SocialFriendRequestPage> {
  const { data } = await api.get<SocialFriendRequestPage>('/v1/friend-requests', { params: { direction, limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

// Suggestions while typing: people whose handle or name contains the text (at least 3 letters), alphabetical, a page at a time.
export async function fetchSocialSearch(text: string, cursor: string | null): Promise<SocialPersonPage> {
  const { data } = await api.get<SocialPersonPage>('/v1/social/search', { params: { q: text, limit: 10, ...(cursor ? { cursor } : {}) } });
  return data;
}

// The people I blocked, newest first, a page at a time. Private to me.
export async function fetchBlockedProfiles(cursor: string | null): Promise<SocialBlockedPage> {
  const { data } = await api.get<SocialBlockedPage>('/v1/social/blocks', { params: { limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

// The people whose posts I reported, the most recent first, a page at a time. Private to me.
export async function fetchReportedProfiles(cursor: string | null): Promise<SocialReportedPage> {
  const { data } = await api.get<SocialReportedPage>('/v1/social/reported', { params: { limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

// All the kudos my posts have received, newest first.
export async function fetchReceivedKudos(cursor: string | null): Promise<SocialReceivedKudosPage> {
  const { data } = await api.get<SocialReceivedKudosPage>('/v1/social/kudos/received', { params: { limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

// The people who gave kudos to one of my posts. Only the author can read this list.
export async function fetchKudosOf(postId: string, cursor: string | null): Promise<SocialKudosPage> {
  const { data } = await api.get<SocialKudosPage>(`/v1/social/posts/${postId}/kudos`, { params: { limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

export async function fetchSocialNotifications(cursor: string | null): Promise<SocialNotificationPage> {
  const { data } = await api.get<SocialNotificationPage>('/v1/social/notifications', { params: { limit: 20, ...(cursor ? { cursor } : {}) } });
  return data;
}

// Unread social notifications: all of them, the kudos, and the accepted friend requests.
export interface SocialUnreadCounts {
  unread: number;
  kudos: number;
  friends: number;
  // Friend requests waiting for my answer.
  requests: number;
}

export async function fetchSocialUnread(): Promise<SocialUnreadCounts> {
  const { data } = await api.get<SocialUnreadCounts>('/v1/social/notifications/unread-count');
  return data;
}

export async function fetchPeople(kind: 'friends' | 'blocked'): Promise<SocialHandle[]> {
  const { data } = await api.get<SocialHandle[]>('/v1/social/people', { params: { kind } });
  return data;
}

// The photo of a post, as a data address the Image component can show. It is fetched with the person's sign-in, because the server never
// serves photos from a public address.
export async function fetchPostPhoto(postId: string): Promise<string> {
  const response = await api.get<ArrayBuffer>(`/v1/social/posts/${postId}/photo`, { responseType: 'arraybuffer' });
  const mime = String(response.headers['content-type'] ?? 'image/jpeg').split(';')[0];
  return `data:${mime};base64,${toBase64(new Uint8Array(response.data))}`;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2] + ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : ALPHABET[c & 63];
  }
  return out;
}
