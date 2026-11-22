// The social. A person appears only as a handle they chose: no name, codename or health data is part of any of these.
export interface SocialHandle {
  // The person chose a profile picture (shown by SocialAvatar).
  has_avatar: boolean;
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
  // The person chose a profile picture / a cover (read with usePicture).
  has_avatar: boolean;
  has_cover: boolean;
  // I already nudged this friend today, so another nudge is refused until tomorrow.
  nudged_recently: boolean;
  // I sent this person a friend request and they have not answered yet.
  request_sent: boolean;
  // On my own page only: how many people I blocked. Null on anyone else's page.
  blocked_count: number | null;
  // This person sent me a friend request and I have not answered yet: the id to accept or decline.
  incoming_request_id: string | null;
}

export interface SocialPost {
  has_avatar: boolean;
  // The topic of the post (a value of SOCIAL_TOPICS), or null.
  topic: string | null;
  // The check-in stamp: the habit and the streak the person had when they posted.
  stamp: { habit: string; streak: number } | null;
  id: string;
  handle: string;
  display_name: string | null;
  body: string;
  has_photo: boolean;
  kudos_count: number;
  kudoed: boolean;
  comments_count: number;
  // I saved this post (the bookmark).
  saved: boolean;
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

// The terms to agree to before creating a social account. The text is the server's, with its version, so what is shown is what is recorded.
export interface SocialTerms {
  version: string;
  minimum_age: number;
  title: string;
  intro: string;
  points: { title: string; body: string }[];
  withdrawal: string;
  agree_label: string;
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
  has_avatar: boolean;
  id: string;
  // request_accepted: accepted my friend request. follow_request: sent me one (answered in the friend requests, not listed here).
  type: 'kudos' | 'comment' | 'reply' | 'nudge' | 'pod_invite' | 'challenge_invite' | 'follow_request' | 'request_accepted';
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

// A comment on a post. can_delete: it is mine, or it is on my post.
export interface SocialComment {
  has_avatar: boolean;
  id: string;
  post_id: string;
  handle: string;
  display_name: string | null;
  body: string;
  // The comment at the top of the thread this answers. Null on a top comment.
  parent_id: string | null;
  // On a top comment: how many replies it has.
  replies_count: number;
  likes_count: number;
  // I liked it.
  liked: boolean;
  is_mine: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface SocialCommentPage {
  items: SocialComment[];
  next_cursor: string | null;
}

// My check-ins today.
export interface SocialToday {
  day: string;
  habits: string[];
  streak: number;
  best_streak: number;
}

export interface SocialBadge {
  key: string;
  label: string;
}

// The consistency grid, streaks and badges of a person.
export interface SocialConsistency {
  days: { day: string; count: number }[];
  window_days: number;
  streak: number;
  best_streak: number;
  total_check_ins: number;
  active_days: number;
  badges: SocialBadge[];
}

// One monthly quest and my progress in it.
export interface SocialQuest {
  key: string;
  title: string;
  habit: string | null;
  goal: number;
  progress: number;
  completed: boolean;
}

export interface SocialQuests {
  period: string;
  days_left: number;
  completed_count: number;
  quests: SocialQuest[];
}

export interface SocialLeaderboardEntry {
  rank: number;
  handle: string;
  display_name: string | null;
  has_avatar: boolean;
  active_days: number;
  is_me: boolean;
}

export interface SocialLeaderboard {
  period: 'week' | 'month';
  from: string;
  to: string;
  items: SocialLeaderboardEntry[];
}

// An accountability pod: a small private group with one weekly target and a shared streak.
export interface SocialPodSummary {
  id: string;
  name: string;
  weekly_goal: number;
  member_count: number;
  max_members: number;
  streak_weeks: number;
  week_complete: boolean;
  is_owner: boolean;
}

export interface SocialPodMember {
  handle: string;
  display_name: string | null;
  has_avatar: boolean;
  is_me: boolean;
  is_owner: boolean;
  active_days: number;
  met_goal: boolean;
  checked_in_today: boolean;
}

export interface SocialPodDetail extends SocialPodSummary {
  week_start: string;
  members: SocialPodMember[];
  pending_invites: { handle: string; display_name: string | null }[];
}

export interface SocialPodInvite {
  id: string;
  pod_id: string;
  pod_name: string;
  weekly_goal: number;
  member_count: number;
  from: { handle: string; display_name: string | null; has_avatar: boolean };
  created_at: string;
}

// My recap of the last 7 days.
export interface SocialRecap {
  from: string;
  to: string;
  days: { day: string; checked_in: boolean }[];
  active_days: number;
  check_ins: number;
  top_habit: string | null;
  streak: number;
  best_streak: number;
}

// Journeys: a trip along a map that friends make together, moving forward with each day of check-ins.
export interface SocialJourneyMap {
  key: string;
  title: string;
  tagline: string;
  total_km: number;
  days: number;
  theme: 'plains' | 'mountain' | 'coast' | 'backwaters';
}

export interface SocialJourneyMember {
  handle: string;
  display_name: string | null;
  has_avatar: boolean;
  is_me: boolean;
  is_owner: boolean;
  km: number;
  percent: number;
  finished: boolean;
  rank: number;
  checked_in_today: boolean;
}

export interface SocialJourneySummary {
  id: string;
  map_key: string;
  title: string;
  tagline: string;
  theme: string;
  total_km: number;
  starts_on: string;
  ends_on: string;
  days_left: number;
  status: 'active' | 'ended';
  member_count: number;
  max_members: number;
  my_km: number;
  my_percent: number;
  finished: boolean;
  is_owner: boolean;
}

export interface SocialJourneyDetail extends SocialJourneySummary {
  goal_days: number;
  members: SocialJourneyMember[];
  pending_invites: { handle: string; display_name: string | null }[];
}

export interface SocialJourneyInvite {
  id: string;
  challenge_id: string;
  title: string;
  total_km: number;
  days: number;
  member_count: number;
  from: { handle: string; display_name: string | null; has_avatar: boolean };
  created_at: string;
}
