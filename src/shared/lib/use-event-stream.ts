import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import NativeEventSource from 'react-native-sse';

import { getAccessToken, refreshSession } from '@shared/api';

const BACKOFF_START_MS = 3_000;
const BACKOFF_MAX_MS = 60_000;

// The minimal part of a stream that the phone implementation shares with the handler code below.
interface NativeStreamLike {
  addEventListener(type: string, listener: (event: { data?: string | null }) => void): void;
  close(): void;
}

// Reads a text/event-stream body and calls onMessage for each event named eventName. Resolves when the server closes the stream,
// rejects when the response is not OK. It uses fetch, so the Bearer token goes in the Authorization header (EventSource cannot set headers).
async function readWebStream(
  url: string,
  token: string | null,
  eventName: string,
  onMessage: (data: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream responded ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let end = buffer.indexOf('\n\n');
    while (end !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (name === eventName && data.length > 0) onMessage(data.join('\n'));
      end = buffer.indexOf('\n\n');
    }
  }
}

// Generic server-sent events. Opens one stream to `url` while mounted, and calls onEvent for every message
// named `eventName`. Pass a null url to keep it closed. The stream closes on unmount or when the url changes.
// When the stream fails (for example the access token has expired and the server answers 401), it refreshes the session
// and tries again, waiting longer after each failure (3 s, 6 s, ... up to 60 s) so a rejected stream does not flood the server.
export function useEventStream<T>(url: string | null, eventName: string, onEvent: (data: T) => void): void {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    if (!url) return;
    let closed = false;
    let delay = BACKOFF_START_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    let nativeSource: NativeStreamLike | null = null;

    const onMessage = (data: string) => {
      delay = BACKOFF_START_MS;
      handler.current(JSON.parse(data) as T);
    };

    const retryLater = () => {
      if (closed) return;
      timer = setTimeout(async () => {
        // A fresh access token is needed when the old one has expired. If the refresh fails, the next attempt still goes ahead.
        await refreshSession().catch(() => null);
        connect();
      }, delay);
      delay = Math.min(delay * 2, BACKOFF_MAX_MS);
    };

    const connect = () => {
      if (closed) return;
      const token = getAccessToken();

      if (Platform.OS === 'web') {
        readWebStream(url, token, eventName, onMessage, controller.signal)
          .then(retryLater, () => retryLater());
        return;
      }

      nativeSource = new NativeEventSource<string>(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      }) as unknown as NativeStreamLike;
      nativeSource.addEventListener(eventName, (event) => {
        if (event.data) onMessage(event.data);
      });
      nativeSource.addEventListener('error', () => {
        nativeSource?.close();
        nativeSource = null;
        retryLater();
      });
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      controller.abort();
      nativeSource?.close();
    };
  }, [url, eventName]);
}
