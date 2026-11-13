import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';

import { getAccessToken } from '@shared/api';

// Generic server-sent events. Opens one stream to `url` while mounted, and calls onEvent for every message
// named `eventName`. Pass a null url to keep it closed. The stream closes on unmount or when the url changes.
export function useEventStream<T>(url: string | null, eventName: string, onEvent: (data: T) => void): void {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    if (!url) return;
    const token = getAccessToken();
    const source = new EventSource<string>(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    });
    source.addEventListener(eventName, (event) => {
      if (!event.data) return;
      handler.current(JSON.parse(event.data) as T);
    });
    return () => source.close();
  }, [url, eventName]);
}
