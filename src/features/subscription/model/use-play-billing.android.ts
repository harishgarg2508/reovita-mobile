import { isUserCancelledError, useIAP, type Purchase } from 'expo-iap';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@shared/api';
import { useVerifyGooglePurchase } from '@entities/subscription';

import type { PlayBilling } from './play-purchase.types';

const MESSAGES: Record<string, string> = {
  purchase_pending: 'Your payment is still pending. Premium turns on when it goes through.',
  purchase_invalid: 'Google Play does not know this purchase. Try again.',
  purchase_belongs_to_another_account: 'This purchase belongs to another account.',
  billing_not_configured: 'Subscriptions are not open yet.',
  billing_unavailable: 'Could not reach Google Play. Try again in a moment.',
};

// Premium with Google Play Billing (expo-iap). The store sells the subscription and takes the payment. The app asks the store for the product and its price,
// starts the purchase with the account id the server gave (so Google ties the purchase to this account, never to a name), and sends the purchase token to
// the server, which asks Google about it before it turns Premium on. Only then is the purchase finished. A restore asks the store for the purchases that
// are still active and sends each one the same way.
export function usePlayBilling({ productId, accountId }: { productId: string | null; accountId: string | null }): PlayBilling {
  const verify = useVerifyGooglePurchase();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Purchases already sent to the server in this session, so a restore does not send the same one again and again.
  const sent = useRef(new Set<string>());

  const send = useCallback(
    async (purchase: Purchase, finish: (purchase: Purchase) => Promise<void>) => {
      const token = purchase.purchaseToken;
      if (!token || sent.current.has(token)) return;
      sent.current.add(token);
      try {
        await verify.mutateAsync({ productId: purchase.productId, purchaseToken: token });
        // The server has checked it, so the purchase can be finished (the store would refund it if it were not acknowledged).
        await finish(purchase).catch(() => undefined);
        setMessage(null);
      } catch (error) {
        // A failed check can be tried again.
        sent.current.delete(token);
        setMessage(isApiError(error) ? (MESSAGES[error.code] ?? 'Could not turn on Premium. Try again.') : 'Could not turn on Premium. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [verify],
  );

  const finishRef = useRef<(purchase: Purchase) => Promise<void>>(async () => undefined);
  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases, availablePurchases } = useIAP({
    onPurchaseSuccess: (purchase) => void send(purchase, finishRef.current),
    onPurchaseError: (error) => {
      setBusy(false);
      // Closing the Google Play sheet is not an error to show.
      if (!isUserCancelledError(error)) setMessage('The purchase did not go through. Try again.');
    },
  });
  useEffect(() => {
    finishRef.current = (purchase) => finishTransaction({ purchase, isConsumable: false });
  }, [finishTransaction]);

  useEffect(() => {
    if (connected && productId) void fetchProducts({ skus: [productId], type: 'subs' });
  }, [connected, productId, fetchProducts]);

  // Purchases the store still has for this account (a restore) are sent to the server too.
  useEffect(() => {
    if (!productId) return;
    for (const purchase of availablePurchases) {
      if (purchase.productId === productId) void send(purchase, finishRef.current);
    }
  }, [availablePurchases, productId, send]);

  const product = subscriptions.find((item) => item.id === productId);
  const offer = product?.subscriptionOffers?.[0];

  const buy = useCallback(async () => {
    if (!productId || !accountId || !product) return;
    setBusy(true);
    setMessage(null);
    try {
      await requestPurchase({
        type: 'subs',
        request: { google: { skus: [productId], obfuscatedAccountId: accountId, subscriptionOffers: offer?.offerTokenAndroid ? [{ sku: productId, offerToken: offer.offerTokenAndroid }] : undefined } },
      });
      // The answer arrives in onPurchaseSuccess (or onPurchaseError), which ends the busy state.
    } catch (error) {
      setBusy(false);
      if (!isUserCancelledError(error as never)) setMessage('The purchase did not go through. Try again.');
    }
  }, [productId, accountId, product, offer, requestPurchase]);

  const restore = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      await getAvailablePurchases();
      // Nothing to send if the store has no active purchase for this product.
      setTimeout(() => setBusy(false), 1500);
    } catch {
      setBusy(false);
      setMessage('Could not check Google Play. Try again in a moment.');
    }
  }, [getAvailablePurchases]);

  return { available: true, ready: connected && !!product, price: offer?.displayPrice ?? product?.displayPrice ?? null, busy: busy || verify.isPending, message, buy, restore };
}
