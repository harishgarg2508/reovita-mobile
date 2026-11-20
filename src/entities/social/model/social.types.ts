// The social. A person appears only as a handle they chose: no name, codename or health data is part of any of these.
export interface SocialHandle {
  handle: string;
  display_name: string | null;
  bio: string | null;
}

export interface SocialProfile extends SocialHandle {
  posts_count: number;
  friends_count: number;
  is_me: boolean;
  is_friend: boolean;
  has_blocked: boolean;
  // I sent this person a friend request and they have not answered yet.
  request_sent: boolean;
  // On my own page only: how many people I blocked. Null on anyone else's page.
  blocked_count: number | null;
  // This person sent me a friend request and I have not answered yet: the id to accept or decline.
  incoming_request_id: string | null;
}

export interface SocialPost {
  id: string;
  handle: string;
  display_name: string | null;
  body: string;
  has_photo: boolean;
  kudos_count: number;
  kudoed: boolean;
  is_mine: boolean;
  created_at: string;
}

export interface SocialPostPage {
  items: SocialPost[];
  next_cursor: string | null;
}

// A person who gave kudos to one of my posts, and when.
export interface SocialKudosPerson extends SocialPerson {
  given_at: string;
}

export interface SocialKudosPage {
  items: SocialKudosPerson[];
  next_cursor: string | null;
}

// One kudos my posts received: who gave it, which post (with a short preview) and when.
export interface SocialReceivedKudos extends SocialHandle {
  post_id: string;
  post_preview: string | null;
  given_at: string;
  is_friend: boolean;
  requested: boolean;
}

export interface SocialReceivedKudosPage {
  total: number;
  items: SocialReceivedKudos[];
  next_cursor: string | null;
}

// A friend request waiting for an answer. incoming: they sent it to me. outgoing: I sent it to them.
export interface SocialFriendRequest extends SocialHandle {
  id: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  is_friend: boolean;
}

export interface SocialFriendRequestPage {
  // How many are waiting in this direction.
  total: number;
  items: SocialFriendRequest[];
  next_cursor: string | null;
}

// A person I blocked, and when.
export interface SocialBlockedProfile extends SocialHandle {
  blocked_at: string;
}

export interface SocialBlockedPage {
  total: number;
  items: SocialBlockedProfile[];
  next_cursor: string | null;
}

// A person whose posts I reported: how many times, and the last time.
export interface SocialReportedProfile extends SocialHandle {
  reports: number;
  last_reported_at: string;
}

export interface SocialReportedPage {
  total: number;
  items: SocialReportedProfile[];
  next_cursor: string | null;
}

export type FeedScope = 'for_you' | 'friends';

// A person in a list of friends or of search results.
export interface SocialPerson extends SocialHandle {
  is_me: boolean;
  is_friend: boolean;
  // I sent this person a friend request and they have not answered yet.
  requested: boolean;
}

export interface SocialPersonPage {
  items: SocialPerson[];
  next_cursor: string | null;
}

// A social notification: someone accepted my friend request, or gave kudos to a post of mine. Separate from the report notifications.
export interface SocialNotification {
  id: string;
  // request_accepted: accepted my friend request. follow_request: sent me one (answered in the friend requests, not listed here).
  type: 'kudos' | 'follow_request' | 'request_accepted';
  handle: string;
  display_name: string | null;
  post_id: string | null;
  post_preview: string | null;
  is_friend: boolean;
  // For a follow_request: the id to accept or decline while it waits, and how it stands.
  request_id: string | null;
  request_state: 'pending' | 'accepted' | 'declined' | null;
  read: boolean;
  created_at: string;
}

export interface SocialNotificationPage {
  items: SocialNotification[];
  next_cursor: string | null;
}

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'abuse', label: 'Abuse or bullying' },
  { value: 'unsafe_advice', label: 'Unsafe advice' },
  { value: 'private_information', label: 'Shares private information' },
  { value: 'other', label: 'Something else' },
];
