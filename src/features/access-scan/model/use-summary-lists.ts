import { useState } from 'react';

import { fetchAccessList, type AccessListName, type AccessSummary } from './access-api';

// The summary arrives with the first page (10) of each list. This holds the pages fetched after that, one list at a time, and puts
// them after the first page. Nothing is fetched until the viewer asks for it, and a list that fits in one page costs no request.
export function useSummaryLists(requestId: string | null, summary: AccessSummary | null) {
  const [state, setState] = useState<{ id: string | null; extra: Partial<Record<AccessListName, { items: unknown[]; page: number; hasMore: boolean }>> }>({ id: null, extra: {} });
  const [loading, setLoading] = useState<AccessListName | null>(null);

  // What was fetched belongs to one request; another request starts again from its own first page.
  const extra = state.id === requestId ? state.extra : {};

  const first = (name: AccessListName): unknown[] => {
    if (!summary) return [];
    switch (name) {
      case 'reports':
        return summary.reports ?? [];
      case 'medical_history':
        return summary.medical_history ?? [];
      case 'score_history':
        return summary.score_history ?? [];
      case 'medications':
        return summary.medications ?? [];
      case 'family_history':
        return summary.family_history ?? [];
      case 'timeline':
        return summary.timeline ?? [];
      case 'readings':
        return summary.vitals.readings ?? [];
    }
  };

  function items<T>(name: AccessListName): T[] {
    return [...first(name), ...(extra[name]?.items ?? [])] as T[];
  }

  function hasMore(name: AccessListName): boolean {
    return extra[name] ? extra[name].hasMore : summary?.more?.[name] === true;
  }

  async function loadMore(name: AccessListName): Promise<void> {
    if (!requestId || loading) return;
    setLoading(name);
    try {
      const page = (extra[name]?.page ?? 1) + 1;
      const result = await fetchAccessList(requestId, name, page);
      setState((previous) => {
        const current = previous.id === requestId ? previous.extra : {};
        const entry = current[name] ?? { items: [], page: 1, hasMore: true };
        return { id: requestId, extra: { ...current, [name]: { items: [...entry.items, ...result.items], page, hasMore: result.has_more } } };
      });
    } catch {
      // The list stays as it is and the button is still there, so the viewer can try again.
    } finally {
      setLoading(null);
    }
  }

  return { items, hasMore, loadMore, loading };
}
