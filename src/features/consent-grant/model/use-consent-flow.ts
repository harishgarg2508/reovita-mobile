import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  consentFailed,
  consentGranted,
  consentSaving,
  consentScreenSet,
  consentSelectedSet,
  type ConsentFlowState,
  type ConsentScreenId,
  type ConsentType,
} from '@entities/consent';

import { CONSENT_VERSION, useGrantConsent } from './use-grant-consent';

type ConsentRootState = { consent: ConsentFlowState };

// Consent carousel state. Lives in Redux (entities/consent), so the current screen and each
// consent choice survive app restarts. The slides shown come from the caller (already-granted
// consents are left out).
export function useConsentFlow(order: ConsentScreenId[]) {
  const dispatch = useDispatch();
  const grant = useGrantConsent();

  const screen = useSelector((state: ConsentRootState) => state.consent.screen);
  const records = useSelector((state: ConsentRootState) => state.consent.records);

  const goTo = useCallback((next: ConsentScreenId) => dispatch(consentScreenSet(next)), [dispatch]);

  const next = useCallback(() => {
    const index = order.indexOf(screen);
    if (index >= 0 && index < order.length - 1) dispatch(consentScreenSet(order[index + 1]));
  }, [dispatch, order, screen]);

  const back = useCallback(() => {
    const index = order.indexOf(screen);
    if (index > 0) dispatch(consentScreenSet(order[index - 1]));
  }, [dispatch, order, screen]);

  const setSelected = useCallback(
    (type: ConsentType, value: boolean) => dispatch(consentSelectedSet({ type, value })),
    [dispatch],
  );

  // POST /v1/consents for one type, then record the result in Redux.
  const saveType = useCallback(
    async (type: ConsentType) => {
      dispatch(consentSaving(type));
      try {
        await grant.mutateAsync(type);
        dispatch(consentGranted({ type, version: CONSENT_VERSION, grantedAt: new Date().toISOString() }));
      } catch {
        dispatch(consentFailed(type));
        throw new Error(`Could not save ${type}`);
      }
    },
    [dispatch, grant],
  );

  return {
    screen,
    records,
    goTo,
    next,
    back,
    setSelected,
    saveType,
    isSaving: grant.isPending,
    saveError: grant.isError,
  };
}
