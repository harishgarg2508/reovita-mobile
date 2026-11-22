export type Plan = 'free' | 'premium';

export interface SubscriptionFeature {
  key: string;
  label: string;
  included: boolean;
}

// The plan of this account and what Premium unlocks. test_mode: the server has the test buttons on (no payment is taken).
export interface Subscription {
  plan: Plan;
  premium: boolean;
  current_period_end: string | null;
  features: SubscriptionFeature[];
  // Where the plan comes from: test, google_play, or null (free). auto_renewing: it renews by itself until cancelled in the store.
  provider: string | null;
  auto_renewing: boolean;
  test_mode: boolean;
  // What is needed to buy Premium (google_play is null where the server has no billing set up) and the store page where the subscription is managed.
  billing?: {
    google_play: { package_name: string; products: string[]; account_id: string | null } | null;
    manage_url: string | null;
  };
}
