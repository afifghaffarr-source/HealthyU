import { useCallback, useEffect, useState } from "react";

const MAX = 6;

export function useRecentSearch(key: string) {
  const storageKey = `recent-search:${key}`;
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setItems(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const push = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      const next = [t, ...items.filter((i) => i.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
      persist(next);
    },
    [items, persist],
  );

  const remove = useCallback(
    (term: string) => persist(items.filter((i) => i !== term)),
    [items, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { items, push, remove, clear };
}