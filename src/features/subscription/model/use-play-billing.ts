import type { PlayBilling } from './play-purchase.types';

// Every platform except Android: there is no Google Play here, so Premium cannot be bought on this device. (Metro uses use-play-billing.android.ts on a phone.)
export function usePlayBilling(_input: { productId: string | null; accountId: string | null }): PlayBilling {
  return { available: false, ready: false, price: null, busy: false, message: null, buy: async () => undefined, restore: async () => undefined };
}
