import { useEffect, useState } from 'react';

import { api } from '@shared/api';

// One suggestion from GET /v1/ingredients: a drug name the knowledge base knows, with the ingredients behind it.
export interface MedicineSuggestion {
  alias: string;
  ingredient_ids: string[];
  similarity: number;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

// Suggestions while typing: asked 250 ms after the last key, from 2 characters, and a newer key cancels the request in flight. The answers are kept in
// component state only (no cache, nothing on the device), and an answer for older text is never shown for newer text.
export function useMedicineSuggestions(text: string) {
  const typed = text.trim();
  const [answer, setAnswer] = useState<{ query: string; items: MedicineSuggestion[] } | null>(null);

  useEffect(() => {
    if (typed.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let items: MedicineSuggestion[] = [];
      try {
        const { data } = await api.get<{ items?: MedicineSuggestion[] }>('/v1/ingredients', { params: { q: typed }, signal: controller.signal });
        items = Array.isArray(data?.items) ? data.items : [];
      } catch {
        if (controller.signal.aborted) return;
      }
      if (!controller.signal.aborted) setAnswer({ query: typed, items });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);

  const active = typed.length >= MIN_CHARS;
  const ready = active && answer?.query === typed;
  return { items: ready ? answer.items : [], searching: active && !ready };
}
