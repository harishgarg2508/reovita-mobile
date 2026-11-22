import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchSubscription, testActivate, testCancel, verifyGooglePurchase } from './subscription.api';
import type { Subscription } from './subscription.types';

// The plan of this account. A screen that is part of Premium asks this before it shows. locked is true only once the server has answered "free",
// so nothing flashes as locked while the plan is still loading. The server checks the plan on every Premium route as well: this only decides what to show.
export function useSubscription() {
  const query = useQuery({ queryKey: queryKeys.subscription.detail(), queryFn: fetchSubscription, staleTime: 60_000, retry: 1 });
  const isPremium = query.data?.premium === true;
  return { ...query, isPremium, locked: query.isSuccess && !isPremium };
}

// After Google Play Billing finishes a purchase: the server checks it with Google and sets the plan. What a plan changes is read again.
export function useVerifyGooglePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; purchaseToken: string }) => verifyGooglePurchase(input.productId, input.purchaseToken),
    onSuccess: (plan) => {
      queryClient.setQueryData(queryKeys.subscription.detail(), plan);
      void queryClient.invalidateQueries();
    },
  });
}

// Test only (the server allows these where SUBSCRIPTION_TEST_MODE is true): Premium on, and back to free.
export function useSetTestPlan() {
  const queryClient = useQueryClient();
  const apply = (plan: Subscription) => {
    queryClient.setQueryData(queryKeys.subscription.detail(), plan);
    // What a plan changes (lists, dashboards) is read again.
    void queryClient.invalidateQueries();
  };
  const activate = useMutation({ mutationFn: testActivate, onSuccess: apply });
  const cancel = useMutation({ mutationFn: testCancel, onSuccess: apply });
  return { activate, cancel };
}
