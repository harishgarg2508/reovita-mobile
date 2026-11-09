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
  knowledge: {
    root: ['knowledge'] as const,
    version: () => [...queryKeys.knowledge.root, 'version'] as const,
    biomarkers: () => [...queryKeys.knowledge.root, 'biomarkers'] as const,
    biomarker: (code: string) => [...queryKeys.knowledge.root, 'biomarker', code] as const,
  },
} as const;
