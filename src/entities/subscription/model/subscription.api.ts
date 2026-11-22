import { api } from '@shared/api';

import type { Subscription } from './subscription.types';

export async function fetchSubscription(): Promise<Subscription> {
  const { data } = await api.get<Subscription>('/v1/subscription');
  return data;
}

// Tells the server about a Google Play purchase. The server asks Google about it (the app is never trusted) and sets the plan.
export async function verifyGooglePurchase(productId: string, purchaseToken: string): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/v1/subscription/google/verify', { product_id: productId, purchase_token: purchaseToken });
  return data;
}

export async function testActivate(): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/v1/subscription/test-activate');
  return data;
}

export async function testCancel(): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/v1/subscription/test-cancel');
  return data;
}
