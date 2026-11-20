// Every TanStack Query key. Keys are namespaced per entity: root, then the sub-keys.
export const queryKeys = {
  home: {
    root: ['home'] as const,
    detail: () => [...queryKeys.home.root, 'detail'] as const,
  },
  profile: {
    root: ['profile'] as const,
    onboardingStatus: () => [...queryKeys.profile.root, 'onboarding-status'] as const,
  },
  consent: {
    root: ['consent'] as const,
    list: () => [...queryKeys.consent.root, 'list'] as const,
  },
  score: {
    root: ['score'] as const,
    latest: () => [...queryKeys.score.root, 'latest'] as const,
    history: () => [...queryKeys.score.root, 'history'] as const,
  },
  report: {
    root: ['report'] as const,
    observations: (id: string) => [...queryKeys.report.root, 'observations', id] as const,
    interpretation: (id: string) => [...queryKeys.report.root, 'interpretation', id] as const,
    confirmed: (id: string) => [...queryKeys.report.root, 'confirmed', id] as const,
    list: () => [...queryKeys.report.root, 'list'] as const,
  },
  social: {
    root: ['social'] as const,
    me: () => [...queryKeys.social.root, 'me'] as const,
    feed: () => [...queryKeys.social.root, 'feed'] as const,
    feedScope: (scope: string) => [...queryKeys.social.feed(), scope] as const,
    profile: (handle: string) => [...queryKeys.social.root, 'profile', handle] as const,
    blocked: () => [...queryKeys.social.root, 'blocked'] as const,
    reported: () => [...queryKeys.social.root, 'reported'] as const,
    friendsOf: (handle: string) => [...queryKeys.social.root, 'friends-of', handle] as const,
    friendRequests: (direction: string) => [...queryKeys.social.root, 'friend-requests', direction] as const,
    search: (text: string) => [...queryKeys.social.root, 'search', text] as const,
    kudosReceived: () => [...queryKeys.social.root, 'kudos-received'] as const,
    kudos: (postId: string) => [...queryKeys.social.root, 'kudos', postId] as const,
    notifications: () => [...queryKeys.social.root, 'notifications'] as const,
    unread: () => [...queryKeys.social.root, 'unread'] as const,
    postsOf: (handle: string, kind = 'all') => [...queryKeys.social.root, 'posts-of', handle, kind] as const,
    people: (kind: string) => [...queryKeys.social.root, 'people', kind] as const,
    photo: (postId: string) => [...queryKeys.social.root, 'photo', postId] as const,
  },
  knowledge: {
    root: ['knowledge'] as const,
    version: () => [...queryKeys.knowledge.root, 'version'] as const,
    biomarkers: () => [...queryKeys.knowledge.root, 'biomarkers'] as const,
    biomarker: (code: string) => [...queryKeys.knowledge.root, 'biomarker', code] as const,
  },
} as const;
