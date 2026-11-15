import { useEffect, useState } from 'react';

import { api } from '@shared/api';

// One suggestion from GET /v1/ingredients. It is a drug name the knowledge base knows, with the ingredients behind it.
export interface IngredientSuggestion {
  alias: string;
  ingredient_ids: string[];
  similarity: number;
}

// How a typed name was matched, from POST /v1/medications/match. Nothing is saved by it.
export type MatchPreview =
  | { status: 'matched'; ingredient_ids: string[]; alias: string; confidence: number }
  | { status: 'candidates'; candidates: IngredientSuggestion[] }
  | { status: 'unmatched' };

export const SEARCH_DEBOUNCE_MS = 250;
export const SEARCH_MIN_CHARS = 2;

// Suggestions while typing. The request goes out 250 ms after the last key, and only from 2 characters. A newer
// keystroke cancels the request still in flight, so a slow answer can never replace a newer one.
// Results live in component state only: no query cache, nothing written to device storage.
export function useIngredientSearch(text: string) {
  const typed = text.trim();
  // The answer is stored with the text it was for, so an answer for older text is never shown for newer text.
  const [answer, setAnswer] = useState<{ query: string; items: IngredientSuggestion[] } | null>(null);

  useEffect(() => {
    if (typed.length < SEARCH_MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let items: IngredientSuggestion[] = [];
      try {
        const { data } = await api.get<{ items?: IngredientSuggestion[] }>('/v1/ingredients', {
          params: { q: typed },
          signal: controller.signal,
        });
        items = Array.isArray(data?.items) ? data.items : [];
      } catch {
        // An abort is expected when the user keeps typing. Any other failure shows no suggestions;
        // the user can still add the name as typed.
        if (controller.signal.aborted) return;
      }
      if (!controller.signal.aborted) setAnswer({ query: typed, items });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);

  const active = typed.length >= SEARCH_MIN_CHARS;
  const ready = active && answer?.query === typed;
  return { items: ready ? answer.items : [], searching: active && !ready };
}

// Asks the server how a typed name would be matched. Used when the user adds a name without picking a suggestion.
export async function matchMedication(name: string): Promise<MatchPreview> {
  const { data } = await api.post<MatchPreview>('/v1/medications/match', { name });
  return data;
}
