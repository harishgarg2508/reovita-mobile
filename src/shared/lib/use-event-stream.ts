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

// What the screen and the reader share, so the screen can stop the stream. Stopping it closes the request quietly: an XMLHttpRequest
// reports a failed or stopped request as an event, never as a rejected promise, so nothing reaches the screen as an uncaught error.
interface WebStreamState {
  closed: boolean;
  stop: (() => void) | null;
}

// Reads a text/event-stream response and calls onMessage for each event whose name is in eventNames. Resolves when the server closes the stream,
// the screen has closed it, or the request fails: the caller then tries again later. It never rejects. It uses XMLHttpRequest, so the
// Bearer token goes in the Authorization header (EventSource cannot set headers), the session cookie is sent too, and a network failure
// (the server restarting, a dropped connection, a blocked request) arrives as an ordinary event instead of a rejected fetch, which the
// web build would show as an uncaught error on screen.
function readWebStream(
  url: string,
  token: string | null,
  eventNames: string[],
  onMessage: (name: string, data: string) => void,
  state: WebStreamState,
): Promise<void> {
  return new Promise((resolve) => {
    if (state.closed) {
      resolve();
      return;
    }
    const xhr = new XMLHttpRequest();
    // After a page reload the web build has no token in memory and is signed in by the HttpOnly cookie set at login.
    xhr.withCredentials = true;
    let consumed = 0;
    let buffer = '';

    const take = () => {
      // Only the part that arrived since the last call is read.
      const chunk = xhr.responseText.slice(consumed);
      consumed = xhr.responseText.length;
      buffer += chunk;
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
        if (eventNames.includes(name) && data.length > 0) {
          try {
            onMessage(name, data.join('\n'));
          } catch {
            // A message the handler could not use must not end the stream.
          }
        }
        end = buffer.indexOf('\n\n');
      }
    };

    state.stop = () => {
      try {
        xhr.abort();
      } catch {
        // already finished
      }
    };
    xhr.onprogress = () => {
      if (!state.closed && xhr.status >= 200 && xhr.status < 300) take();
    };
    // Whatever ends the request (closed by the server, a failure, a stop) ends the read.
    xhr.onloadend = () => {
      state.stop = null;
      resolve();
    };
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send();
  });
}

// Generic server-sent events. Opens one stream to `url` while mounted, and calls onEvent for every message
// named `eventName`. Pass a null url to keep it closed. The stream closes on unmount or when the url changes.
// When the stream fails (for example the access token has expired and the server answers 401), it refreshes the session
// and tries again, waiting longer after each failure (3 s, 6 s, ... up to 60 s) so a rejected stream does not flood the server.
//
// One stream is one open connection, and a browser allows only a handful of connections to one server at a time (six over HTTP/1.1), so a
// stream that carries several events takes ONE connection: pass the names as a list and read the name from the second argument of onEvent.
// Opening one connection per event name would use up the connections and leave ordinary requests waiting as "pending".
export function useEventStream<T>(url: string | null, eventName: string | string[], onEvent: (data: T, eventName: string) => void): void {
  const names = Array.isArray(eventName) ? eventName : [eventName];
  const namesKey = names.join(',');
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    if (!url) return;
    let closed = false;
    let delay = BACKOFF_START_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const web: WebStreamState = { closed: false, stop: null };
    let nativeSource: NativeStreamLike | null = null;

    const eventNames = namesKey.split(',');
    const onMessage = (name: string, data: string) => {
      delay = BACKOFF_START_MS;
      handler.current(JSON.parse(data) as T, name);
    };

    const retryLater = () => {
      if (closed) return;
      timer = setTimeout(async () => {
        // A fresh access token is needed when the old one has expired. If the refresh fails, the next attempt still goes ahead.
        await refreshSession().catch(() => null);
        connect().catch(() => undefined);
      }, delay);
      delay = Math.min(delay * 2, BACKOFF_MAX_MS);
    };

    const connect = async () => {
      if (closed) return;
      let token = getAccessToken();
      // The access token is kept in memory only, so it is missing right after the app starts.
      // On a phone, get one from the stored refresh token before opening the stream. The web build has no stored
      // refresh token: it is signed in by the session cookie, which readWebStream sends.
      if (!token && Platform.OS !== 'web') {
        const session = await refreshSession().catch(() => null);
        if (closed) return;
        token = session?.access_token ?? getAccessToken();
      }

      if (Platform.OS === 'web') {
        // A stream that ends because the screen was closed is not an error and does not retry (retryLater checks closed).
        readWebStream(url, token, eventNames, onMessage, web)
          .then(retryLater, retryLater)
          .catch(() => undefined);
        return;
      }

      nativeSource = new NativeEventSource<string>(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      }) as unknown as NativeStreamLike;
      for (const name of eventNames) {
        nativeSource.addEventListener(name, (event) => {
          if (event.data) onMessage(name, event.data);
        });
      }
      nativeSource.addEventListener('error', () => {
        nativeSource?.close();
        nativeSource = null;
        retryLater();
      });
    };

    connect().catch(() => undefined);
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      // Stopping the request ends the read and the connection quietly.
      web.closed = true;
      web.stop?.();
      try {
        nativeSource?.close();
      } catch {
        // already closed
      }
    };
  }, [url, namesKey]);
}
