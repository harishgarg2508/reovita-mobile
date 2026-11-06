import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  basicsDraftSet,
  historyDraftSet,
  lifestyleDraftSet,
  type BasicsDraft,
  type HistoryDraft,
  type LifestyleDraft,
  type OnboardingState,
} from '@entities/onboarding';

type OnboardingRootState = { onboarding: OnboardingState };

// Each hook returns the saved draft for one step and a patch function. Drafts live in Redux
// (entities/onboarding), so values survive moving between steps and app restarts.
export function useBasicsDraft() {
  const dispatch = useDispatch();
  const draft = useSelector((state: OnboardingRootState) => state.onboarding.basics);
  const patch = useCallback((value: Partial<BasicsDraft>) => dispatch(basicsDraftSet(value)), [dispatch]);
  return [draft, patch] as const;
}

export function useHistoryDraft() {
  const dispatch = useDispatch();
  const draft = useSelector((state: OnboardingRootState) => state.onboarding.history);
  const patch = useCallback((value: Partial<HistoryDraft>) => dispatch(historyDraftSet(value)), [dispatch]);
  return [draft, patch] as const;
}

export function useLifestyleDraft() {
  const dispatch = useDispatch();
  const draft = useSelector((state: OnboardingRootState) => state.onboarding.lifestyle);
  const patch = useCallback((value: Partial<LifestyleDraft>) => dispatch(lifestyleDraftSet(value)), [dispatch]);
  return [draft, patch] as const;
}
