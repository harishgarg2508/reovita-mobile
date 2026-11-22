// What the plan screen needs from the store purchase. The real one is use-play-billing.android.ts; every other platform gets the stub in use-play-billing.ts.
export interface PlayBilling {
  // The store can sell Premium here (an Android phone with Google Play).
  available: boolean;
  // The store connection is ready and the price is known.
  ready: boolean;
  // The price as the store shows it, like "Rs 199.00/month".
  price: string | null;
  // A purchase or a restore is running.
  busy: boolean;
  // A message to show, or null.
  message: string | null;
  buy: () => Promise<void>;
  restore: () => Promise<void>;
}
